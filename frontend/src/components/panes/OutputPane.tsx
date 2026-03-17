import React from 'react';

type OutputPaneProps = {
  children: React.ReactNode;
};

const OutputPane: React.FC<OutputPaneProps> = ({ children }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        borderLeft: '1px solid #e2e2e2',
      }}
    >
      <div
        style={{
          padding: '0.4rem 0.75rem',
          color: '#fff',
          fontSize: '0.85rem',
        }}
      >
        Output
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '0.5rem' }}>{children}</div>
    </div>
  );
};

export default OutputPane;

