import React, { useEffect } from 'react';
import styles from '../../component-styles/Windows.module.css';
import CloseIcon from '../../assets/close_button_icon.svg';
import SushiIllustration from '../../assets/sushi.svg';

type NotImplementedYetProps = {
  isOpen: boolean;
  onClose: () => void;
};

const NotImplementedYet: React.FC<NotImplementedYetProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.windowOverlay} ${styles.notImplementedOverlay}`}
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className={`${styles.windowRoot} ${styles.notImplementedWindow}`}
        role="dialog"
        aria-modal="true"
        aria-label="Not implemented yet"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className={styles.windowHeader}>
          <div className={`${styles.windowTitle} ${styles.notImplementedTitle}`}>Error</div>
          <button
            type="button"
            className={`${styles.windowIconButton} ${styles.notImplementedCloseButton}`}
            onClick={onClose}
            aria-label="Close"
          >
            <img src={CloseIcon} alt="" className={styles.windowIcon} />
          </button>
        </div>

        <div className={`${styles.windowAccent} ${styles.notImplementedAccent}`} aria-hidden="true" />

        <div className={styles.windowBody}>
          <div className={styles.windowSubtitle}>
            Oops, looks like this feature has not been implemented yet.
          </div>

          <div className={styles.windowIllustration}>
            <img src={SushiIllustration} alt="" className={styles.notImplementedSushi} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotImplementedYet;
