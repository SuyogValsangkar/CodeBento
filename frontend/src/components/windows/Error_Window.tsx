import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../component-styles/Windows.module.css';
import ClearIcon from '../../assets/clear_button_icon.svg';
import AiIcon from '../../assets/ai_button_icon.svg';
import NotImplementedYet from './Not_Implemented_Yet';

export type ErrorWindowSegment = { type: 'stderr'; text: string };

type ErrorWindowProps = {
  segments: ErrorWindowSegment[];
  onClear: () => void;
};

const ErrorWindow: React.FC<ErrorWindowProps> = ({ segments, onClear }) => {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [notImplementedOpen, setNotImplementedOpen] = useState(false);

  const stderrItems = useMemo(() => segments, [segments]);

  const openNotImplemented = useCallback(() => {
    setNotImplementedOpen(true);
  }, []);

  const closeNotImplemented = useCallback(() => {
    setNotImplementedOpen(false);
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [stderrItems]);

  return (
    <div className={styles.terminalRoot}>
      <div className={styles.terminalHeader}>
        <span className={styles.terminalTitle}>Error</span>
        <div className={styles.terminalHeaderActions}>
          <button
            type="button"
            onClick={openNotImplemented}
            className={styles.terminalAiButton}
            aria-label="AI help (not implemented yet)"
          >
            <img src={AiIcon} alt="" className={styles.terminalAiIcon} />
          </button>

          <button
            type="button"
            onClick={onClear}
            className={styles.terminalClearButton}
            aria-label="Clear errors"
          >
            <img src={ClearIcon} alt="" className={styles.terminalClearIcon} />
          </button>
        </div>
      </div>

      <div ref={transcriptRef} className={styles.terminalTranscript}>
        {stderrItems.map((item, i) => (
          <div key={i} className={styles.terminalLineSpaced}>
            <span className={styles.terminalStderr}>{item.text}</span>
          </div>
        ))}
      </div>

      <NotImplementedYet isOpen={notImplementedOpen} onClose={closeNotImplemented} />
    </div>
  );
};

export default ErrorWindow;

