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

  const handleRun = async () => {
    setLoading(true);
    setStdout('');
    setStderr('');

    try {
      const response = await fetch('http://localhost:3000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, sourceCode }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const result = await response.json();
      setStdout(result.stdout ?? '');
      setStderr(result.stderr ?? '');
    } catch (err) {
      setStderr(`Error connecting to backend: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>CodeBento MVP</h1>

      <Editor
        language={language}
        sourceCode={sourceCode}
        onSourceCodeChange={setSourceCode}
        onRun={handleRun}
        loading={loading}
      />

      <OutputPanel stdout={stdout} stderr={stderr} />

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