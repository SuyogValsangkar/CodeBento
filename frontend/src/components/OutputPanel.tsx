import React, { useEffect, useRef } from 'react';

type OutputPanelProps = {
  stdout?: string;
  stderr?: string;
  stdin?: string;
  onStdinChange?: (value: string) => void;
};

const OutputPanel: React.FC<OutputPanelProps> = ({
  stdout = '',
  stderr = '',
  stdin = '',
  onStdinChange,
}) => {
  const stdoutRef = useRef<HTMLPreElement>(null);
  const stderrRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (stdoutRef.current) {
      stdoutRef.current.scrollTop = stdoutRef.current.scrollHeight;
    }
    if (stderrRef.current) {
      stderrRef.current.scrollTop = stderrRef.current.scrollHeight;
    }
  }, [stdout, stderr]);

  return (
    <div className="output-section">
      <div style={{ marginBottom: '1rem', width: '100%' }}>
        <h2>Stdin (Program Input)</h2>
        <textarea
          rows={4}
          placeholder={'Type input lines here, e.g.\nAlice\n'}
          value={stdin}
          onChange={e => onStdinChange?.(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            resize: 'vertical',
            fontFamily: 'monospace',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h2>Stdout</h2>
          <pre
            ref={stdoutRef}
            style={{
              color: 'green',
              background: '#f6fff6',
              minHeight: '2em',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '0.5rem',
              borderRadius: '4px',
            }}
          >
            {stdout}
          </pre>
        </div>
        <div style={{ flex: 1 }}>
          <h2>Stderr</h2>
          <pre
            ref={stderrRef}
            style={{
              color: 'red',
              background: '#fff6f6',
              minHeight: '2em',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '0.5rem',
              borderRadius: '4px',
            }}
          >
            {stderr}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default OutputPanel;