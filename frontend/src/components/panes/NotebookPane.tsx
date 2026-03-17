import React from 'react';

type NotebookPaneProps = {
  children: React.ReactNode;
};

const NotebookPane: React.FC<NotebookPaneProps> = ({ children }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        padding: '0.75rem',
        overflow: 'auto',
        textAlign: 'left',
      }}
    >
      {children}
    </div>
  );
};

export default NotebookPane;

