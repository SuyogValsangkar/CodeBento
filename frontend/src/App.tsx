import { useState } from 'react';
import Editor from './components/Editor';
import OutputPanel from './components/OutputPanel';
import './App.css';

function App() {
  const [language] = useState('python');
  const [sourceCode, setSourceCode] = useState('');
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [stdin, setStdin] = useState('');

  const [sessionID, setSessionID] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'waiting_for_input' | 'running'>('idle');

  const ensureSession = async (): Promise<string> => {
    if (sessionID) {
      return sessionID;
    }

    const response = await fetch('http://localhost:3000/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session (status ${response.status})`);
    }

    const data = await response.json();
    if (!data.sessionID) {
      throw new Error('Backend did not return a sessionID');
    }

    setSessionID(data.sessionID);
    return data.sessionID as string;
  };

  const handleRun = async () => {
    // If the session is currently waiting for input, don't allow a new run
    if (sessionStatus === 'waiting_for_input') {
      setStderr('Program is waiting for input. Please type input in stdin and click "Send Input to Session".');
      return;
    }

    setLoading(true);
    setStdout('');
    setStderr('');
    setSessionStatus('running');
  
    try {
      const id = await ensureSession();
  
      const response = await fetch(`http://localhost:3000/sessions/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          stdinChunk: '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }
  
      const result = await response.json();
  
      setStdout(result.stdout ?? '');
      setStderr(result.stderr ?? '');
  
      if (result.status === 'waiting_for_input') {
        setSessionStatus('waiting_for_input');
      } else {
        setSessionStatus('idle');
        setSessionID(null);   
        setStdin('');         
      }
    } catch (err) {
      setStderr(`Error connecting to backend: ${(err as Error).message}`);
      setSessionStatus('idle');
      setSessionID(null);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!sessionID) {
      setStderr('No active session. Please run the code first.');
      return;   
    }

    setLoading(true);
    setSessionStatus('running');

    try {
      const response = await fetch(`http://localhost:3000/sessions/${sessionID}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode,
          stdinChunk: stdin,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const result = await response.json();

      setStdout(result.stdout ?? '');
      setStderr(result.stderr ?? '');

      setStdin(''); // clear stdin after sending

      if (result.status === 'waiting_for_input') {
        setSessionStatus('waiting_for_input');
      } else {
        setSessionStatus('idle');
        setSessionID(null);   // session is finished; don't reuse
      }
    } catch (err) {
      setStderr(`Error connecting to backend: ${(err as Error).message}`);
      setSessionStatus('idle');
      setSessionID(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!sessionID) return;

    try {
      await fetch(`http://localhost:3000/sessions/${sessionID}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to stop session', err);
      setStderr(`Failed to stop session: ${(err as Error).message}`);
    }

    setSessionID(null);
    setSessionStatus('idle');
    setLoading(false);
    setStderr('Execution stopped by user.');
  };

  const showStopButton = !!sessionID && (loading || sessionStatus === 'waiting_for_input');

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>CodeBento MVP</h1>

      <Editor
        language={language}
        sourceCode={sourceCode}
        onSourceCodeChange={setSourceCode}
        onRun={handleRun}
        onStop={handleStop}
        loading={loading || sessionStatus === 'waiting_for_input'}
        showStopButton={showStopButton}
      />

      <OutputPanel
        stdout={stdout}
        stderr={stderr}
        stdin={stdin}
        onStdinChange={setStdin}
      />

      {sessionStatus === 'waiting_for_input' && (
        <div style={{ marginTop: '0.5rem' }}>
          <button
            onClick={handleContinue}
            disabled={loading || !stdin}
          >
            Send Input to Session
          </button>
        </div>
      )}

      <div className="notes-section" style={{ marginTop: '1rem' }}>
        <h2>Sticky Notes</h2>
        <textarea
          className="notes-editor"
          rows={5}
          placeholder="Write your notes here..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            resize: 'vertical',
            overflowY: 'auto',
            fontFamily: 'sans-serif',
          }}
        />
      </div>
    </div>
  );
}

export default App;