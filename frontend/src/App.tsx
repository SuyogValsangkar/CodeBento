import { useState } from 'react';
import Editor from './components/Editor';
import Terminal, { type TerminalSegment } from './components/Terminal';
import './App.css';

function App() {
  const [language] = useState('python');
  const [sourceCode, setSourceCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [stdin, setStdin] = useState('');

  const [sessionID, setSessionID] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'waiting_for_input' | 'running'>('idle');

  const [terminalSegments, setTerminalSegments] = useState<TerminalSegment[]>([]);
  
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
      setTerminalSegments((prev) => [...prev, { type: 'stderr', text: 'Program is waiting for input. Type in the terminal and press Enter.' }]);
      return;
    }

    clearTerminal();
    setLoading(true);
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

      const out = result.stdout ?? '';
      const err = result.stderr ?? '';
      if (out) setTerminalSegments((prev) => [...prev, { type: 'stdout', text: out }]);
      if (err) setTerminalSegments((prev) => [...prev, { type: 'stderr', text: err }]);

      if (result.status === 'waiting_for_input') {
        setSessionStatus('waiting_for_input');
      } else {
        setSessionStatus('idle');
        setSessionID(null);
        setStdin('');
      }
    } catch (err) {
      const msg = `Error connecting to backend: ${(err as Error).message}`;
      setTerminalSegments((prev) => [...prev, { type: 'stderr', text: msg }]);
      setSessionStatus('idle');
      setSessionID(null);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!sessionID) {
      const msg = 'No active session. Please run the code first.';
      setTerminalSegments((prev) => [...prev, { type: 'stderr', text: msg }]);
      return;
    }

    setTerminalSegments((prev) => [...prev, { type: 'input', text: stdin }]);
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

      const out = result.stdout ?? '';
      const err = result.stderr ?? '';
      if (out) setTerminalSegments((prev) => [...prev, { type: 'stdout', text: out }]);
      if (err) setTerminalSegments((prev) => [...prev, { type: 'stderr', text: err }]);

      setStdin('');

      if (result.status === 'waiting_for_input') {
        setSessionStatus('waiting_for_input');
      } else {
        setSessionStatus('idle');
        setSessionID(null);
      }
    } catch (err) {
      const msg = `Error connecting to backend: ${(err as Error).message}`;
      setTerminalSegments((prev) => [...prev, { type: 'stderr', text: msg }]);
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
      setTerminalSegments((prev) => [...prev, { type: 'stderr', text: `Failed to stop session: ${(err as Error).message}` }]);
    }

    setSessionID(null);
    setSessionStatus('idle');
    setLoading(false);
    setTerminalSegments((prev) => [...prev, { type: 'stderr', text: 'Execution stopped by user.' }]);
  };

  const clearTerminal = () => {
    setTerminalSegments([]);
    setStdin('');
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

      <Terminal
        segments={terminalSegments}
        inputValue={stdin}
        onInputChange={setStdin}
        onSubmit={handleContinue}
        onClear={clearTerminal}
        submitDisabled={sessionStatus !== 'waiting_for_input' || loading}
        loading={loading}
        showInput={sessionStatus === 'waiting_for_input'}
      />

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