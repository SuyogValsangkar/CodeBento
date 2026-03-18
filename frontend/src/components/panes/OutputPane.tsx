import React from 'react';
import styles from '../../component-styles/Panes.module.css';

type OutputPaneProps = {
  children: React.ReactNode;
};

const OutputPane: React.FC<OutputPaneProps> = ({ children }) => {
  return (
    <div className={`${styles.paneRoot} ${styles.outputPaneRoot}`}>
      <div className={styles.paneBody}>
        <div className={styles.outputPaneContent}>{children}</div>
      </div>
    </div>
  );
};

export default OutputPane;

