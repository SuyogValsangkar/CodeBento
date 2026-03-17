import React, { useCallback, useState } from 'react';

const MIN_NAV_WIDTH = 150;
const MAX_NAV_WIDTH = 500;
const DEFAULT_NAV_WIDTH = 200;
const RESIZER_WIDTH = 10;

type RootLayoutProps = {
  nav: React.ReactNode;
  notebook: React.ReactNode;
  output: React.ReactNode;
};

const RootLayout: React.FC<RootLayoutProps> = ({ nav, notebook, output }) => {
  const [navWidth, setNavWidth] = useState(DEFAULT_NAV_WIDTH);

  const handleNavResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = navWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = Math.min(MAX_NAV_WIDTH, Math.max(MIN_NAV_WIDTH, startWidth + delta));
      setNavWidth(next);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [navWidth]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Main three-pane area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: navWidth,
            minWidth: MIN_NAV_WIDTH,
            maxWidth: MAX_NAV_WIDTH,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {nav}
        </div>

        <div
          role="separator"
          aria-label="Resize navigation pane"
          onMouseDown={handleNavResizerMouseDown}
          style={{
            width: RESIZER_WIDTH,
            marginLeft: -RESIZER_WIDTH / 2,
            flexShrink: 0,
            cursor: 'col-resize',
            backgroundColor: 'transparent',
          }}
        />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRight: '1px solid #e2e2e2',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {notebook}
        </div>

        <div
          style={{
            width: 320,
            minWidth: 260,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {output}
        </div>
      </div>

      {/* Bottom status bar (fixed 20px) */}
      <div
        style={{
          height: 20,
          minHeight: 20,
          maxHeight: 20,
          borderTop: '1px solid #e2e2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.75rem',
          fontSize: '0.8rem',
          color: '#666',
        }}
      >
        <span>{/* reserved for metadata (e.g. file name, cursor position) */}</span>
        <span>{/* reserved for execution status / other indicators */}</span>
      </div>
    </div>
  );
};

export default RootLayout;

