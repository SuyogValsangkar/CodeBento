import { useState } from 'react';
import Editor from './components/windows/Editor';
import Terminal, { type TerminalSegment } from './components/windows/Terminal';
import RootLayout from './components/RootLayout';
import NavPane from './components/panes/NavPane';
import NotebookPane from './components/panes/NotebookPane';
import OutputPane from './components/panes/OutputPane';

function App() {
  const [language] = useState('python');
  const [sourceCode, setSourceCode] = useState('');
  const [loading, setLoading] = useState(false);
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
    <div
      className="app-root"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e2e2e2',
          textAlign: 'left',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>CodeBento MVP</h1>
      </header>

      <main style={{ flex: 1, minHeight: 0 }}>
        <RootLayout
          nav={<NavPane />}
          notebook={
            <NotebookPane>
              <Editor
                language={language}
                sourceCode={sourceCode}
                onSourceCodeChange={setSourceCode}
                onRun={handleRun}
                onStop={handleStop}
                loading={loading || sessionStatus === 'waiting_for_input'}
                showStopButton={showStopButton}
              />
            </NotebookPane>
          }
          output={
            <OutputPane>
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
            </OutputPane>
          }
        />
      </main>
    </div>
  );
}

export default App;