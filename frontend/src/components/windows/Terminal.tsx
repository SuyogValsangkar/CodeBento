import React, { useEffect, useMemo, useRef } from 'react';

export type TerminalSegment =
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'input'; text: string };

type TerminalProps = {
  segments: TerminalSegment[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  submitDisabled?: boolean;
  loading?: boolean;
  /** When false, the input row is hidden (e.g. when not waiting for stdin). */
  showInput?: boolean;
};

const Terminal: React.FC<TerminalProps> = ({
  segments,
  inputValue,
  onInputChange,
  onSubmit,
  onClear,
  submitDisabled = false,
  loading: _loading = false,
  showInput = true,
}) => {
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Merge stdout (no trailing newline) + next input so they render on the same line (e.g. "Enter number: 5")
  const displayItems = useMemo(() => {
    const items: Array<
      | { type: 'stdout'; text: string }
      | { type: 'stderr'; text: string }
      | { type: 'input'; text: string; prefix: boolean }
      | { type: 'stdout_inline_input'; stdout: string; input: string }
    > = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.type === 'input' && i > 0 && segments[i - 1].type === 'stdout' && !segments[i - 1].text.endsWith('\n')) {
        continue; // already rendered with previous stdout
      }
      if (seg.type === 'stdout' && !seg.text.endsWith('\n') && segments[i + 1]?.type === 'input') {
        items.push({ type: 'stdout_inline_input', stdout: seg.text, input: segments[i + 1].text });
        i++; // skip input segment
        continue;
      }
      if (seg.type === 'input') {
        items.push({ type: 'input', text: seg.text, prefix: true });
      } else {
        items.push(seg);
      }
    }
    return items;
  }, [segments]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [segments]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (submitDisabled) return;
    // Only submit when there is input (avoids sending empty line on accidental Enter)
    if (inputValue.trim() === '') return;
    onSubmit();
  };

  return (
    <div
      className="terminal"
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #333',
        borderRadius: '4px',
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.5rem', borderBottom: '1px solid #333', backgroundColor: '#2d2d2d' }}>
        <span style={{ color: '#aaa' }}>Terminal</span>
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: '0.2rem 0.5rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
            backgroundColor: '#444',
            color: '#ccc',
            border: '1px solid #555',
            borderRadius: '4px',
          }}
        >
          Clear
        </button>
      </div>

      <div
        ref={transcriptRef}
        style={{
          flex: 1,
          minHeight: '120px',
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '0.5rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          textAlign: 'left',
        }}
      >
        {segments.length === 0 && (
          <span style={{ color: '#666' }}>Output will appear here. Run code to start.</span>
        )}
        {displayItems.map((item, i) => (
          <div key={i} style={{ marginBottom: item.type === 'input' || item.type === 'stdout_inline_input' ? '0.25rem' : 0 }}>
            {item.type === 'stdout' && (
              <span style={{ color: '#d4d4d4' }}>{item.text}</span>
            )}
            {item.type === 'stderr' && (
              <span style={{ color: '#f48771' }}>{item.text}</span>
            )}
            {item.type === 'input' && (
              <span style={{ color: '#9cdcfe' }}>{item.prefix ? '> ' : ''}{item.text}</span>
            )}
            {item.type === 'stdout_inline_input' && (
              <>
                <span style={{ color: '#d4d4d4' }}>{item.stdout}</span>
                <span style={{ color: '#9cdcfe' }}>{item.input}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {showInput && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            borderTop: '1px solid #333',
            backgroundColor: '#2d2d2d',
            gap: '0.5rem',
          }}
        >
          <span style={{ color: '#6a9955' }}>{'>'}</span>
          <input
            type="text"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type input and press Enter"
            style={{
              flex: 1,
              padding: '0.35rem 0.5rem',
              fontSize: '0.9rem',
              fontFamily: 'monospace',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              border: '1px solid #444',
              borderRadius: '4px',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Terminal;
