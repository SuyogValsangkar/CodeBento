import React, { useEffect, useMemo, useRef } from 'react';
import styles from '../../component-styles/Windows.module.css';
import ClearIcon from '../../assets/clear_button_icon.svg';

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
        continue;
      }
      if (seg.type === 'stdout' && !seg.text.endsWith('\n') && segments[i + 1]?.type === 'input') {
        items.push({ type: 'stdout_inline_input', stdout: seg.text, input: segments[i + 1].text });
        i++;
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
    if (inputValue.trim() === '') return;
    onSubmit();
  };

  return (
    <div className={styles.terminalRoot}>
      <div className={styles.terminalHeader}>
        <span className={styles.terminalTitle}>Output</span>
        <button
          type="button"
          onClick={onClear}
          className={styles.terminalClearButton}
          aria-label="Clear output"
        >
          <img src={ClearIcon} alt="" className={styles.terminalClearIcon} />
        </button>
      </div>

      <div ref={transcriptRef} className={styles.terminalTranscript}>
        {displayItems.map((item, i) => {
          const spaced = item.type === 'input' || item.type === 'stdout_inline_input';
          return (
            <div key={i} className={spaced ? styles.terminalLineSpaced : styles.terminalLine}>
              {item.type === 'stdout' && (
                <span className={styles.terminalStdout}>{item.text}</span>
              )}
              {item.type === 'stderr' && (
                <span className={styles.terminalStderr}>{item.text}</span>
              )}
              {item.type === 'input' && (
                <span className={styles.terminalInput}>{item.prefix ? '> ' : ''}{item.text}</span>
              )}
              {item.type === 'stdout_inline_input' && (
                <>
                  <span className={styles.terminalStdout}>{item.stdout}</span>
                  <span className={styles.terminalInput}>{item.input}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {showInput && (
        <div className={styles.terminalInputRow}>
          <span className={styles.terminalPrompt}>{'>'}</span>
          <input
            type="text"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type input and press Enter"
            className={styles.terminalInputField}
          />
        </div>
      )}
    </div>
  );
};

export default Terminal;
