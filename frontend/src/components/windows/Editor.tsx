import React from 'react';

type EditorProps = {
  language?: string;
  sourceCode?: string;
  onSourceCodeChange: (code: string) => void;
  onRun: () => void;
  onStop?: () => void;
  loading?: boolean;
  showStopButton?: boolean;
};

const Editor: React.FC<EditorProps> = ({
  language = 'python',
  sourceCode = '',
  onSourceCodeChange,
  onRun,
  onStop,
  loading = false,
  showStopButton = false,
}) => (
  <div className="editor-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label>
      Language:&nbsp;
      <select value={language} disabled style={{ padding: '0.25rem', borderRadius: '4px' }}>
        <option value="python">Python</option>
        {/* Future languages can be added here */}
      </select>
    </label>

    <textarea
      className="code-editor"
      rows={10}
      placeholder="Type your code here..."
      value={sourceCode}
      onChange={e => onSourceCodeChange(e.target.value)}
      style={{
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        padding: '0.5rem',
        borderRadius: '4px',
        border: '1px solid #ccc',
        resize: 'vertical',
      }}
    />

    <button
      type="button"
      onClick={onRun}
      disabled={loading || !sourceCode}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        backgroundColor: loading || !sourceCode ? '#ccc' : '#4CAF50',
        color: 'white',
        cursor: loading || !sourceCode ? 'not-allowed' : 'pointer',
        border: 'none',
      }}
    >
      {loading ? 'Running...' : 'Run'}
    </button>

    {showStopButton && onStop && (
      <button
        type="button"
        onClick={onStop}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          backgroundColor: '#c62828',
          color: 'white',
          cursor: 'pointer',
          border: 'none',
        }}
      >
        Stop
      </button>
    )}
  </div>
);

export default Editor;