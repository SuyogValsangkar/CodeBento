import React, { useCallback, useState } from 'react';
import paneStyles from '../component-styles/Panes.module.css';
import OutputPaneToggleIcon from '../assets/output_pane_toggle.svg';

const MIN_NAV_WIDTH = 150;
const MAX_NAV_WIDTH = 500;
const DEFAULT_NAV_WIDTH = 200;

const MAX_OUTPUT_WIDTH = 700;
const DEFAULT_OUTPUT_WIDTH = 320;

const RESIZER_WIDTH = 10;

type RootLayoutProps = {
  nav: React.ReactNode;
  notebook: React.ReactNode;
  output: React.ReactNode;
};

const RootLayout: React.FC<RootLayoutProps> = ({ nav, notebook, output }) => {
  const [navWidth, setNavWidth] = useState(DEFAULT_NAV_WIDTH);
  const [outputWidth, setOutputWidth] = useState(DEFAULT_OUTPUT_WIDTH);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const [outputCollapseSource, setOutputCollapseSource] = useState<'button' | 'drag' | null>(null);
  const [buttonCollapsedOutputWidth, setButtonCollapsedOutputWidth] = useState(DEFAULT_OUTPUT_WIDTH);
  const [isOutputButtonTransitionActive, setIsOutputButtonTransitionActive] = useState(false);

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

  const handleOutputResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsOutputButtonTransitionActive(false);
    const startX = e.clientX;
    const startWidth = isOutputCollapsed ? 0 : outputWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const next = Math.min(MAX_OUTPUT_WIDTH, Math.max(0, startWidth + delta));
      if (next <= 0) {
        setIsOutputCollapsed(true);
        setOutputCollapseSource('drag');
        return;
      }

      setOutputWidth(next);
      setIsOutputCollapsed(false);
      setOutputCollapseSource(null);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isOutputCollapsed, outputWidth]);

  const handleOutputToggleClick = useCallback(() => {
    setIsOutputButtonTransitionActive(true);

    if (isOutputCollapsed) {
      const restoreWidth =
        outputCollapseSource === 'button'
          ? buttonCollapsedOutputWidth
          : DEFAULT_OUTPUT_WIDTH;
      setOutputWidth(restoreWidth > 0 ? restoreWidth : DEFAULT_OUTPUT_WIDTH);
      setIsOutputCollapsed(false);
      setOutputCollapseSource(null);
      return;
    }

    setButtonCollapsedOutputWidth(outputWidth > 0 ? outputWidth : DEFAULT_OUTPUT_WIDTH);
    setIsOutputCollapsed(true);
    setOutputCollapseSource('button');
  }, [buttonCollapsedOutputWidth, isOutputCollapsed, outputCollapseSource, outputWidth]);

  const outputToggleLabel = isOutputCollapsed ? 'Expand output pane' : 'Collapse output pane';

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
          role="separator"
          aria-label="Resize output pane"
          onMouseDown={handleOutputResizerMouseDown}
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
            width: isOutputCollapsed ? 0 : outputWidth,
            maxWidth: MAX_OUTPUT_WIDTH,
            minWidth: 0,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'visible',
            transition: isOutputButtonTransitionActive ? 'width 200ms ease' : 'none',
            willChange: isOutputButtonTransitionActive ? 'width' : 'auto',
          }}
          onTransitionEnd={() => setIsOutputButtonTransitionActive(false)}
        >
          <button
            type="button"
            className={paneStyles.outputPaneToggleButton}
            aria-label={outputToggleLabel}
            aria-pressed={isOutputCollapsed}
            title={outputToggleLabel}
            onClick={handleOutputToggleClick}
          >
            <img
              src={OutputPaneToggleIcon}
              alt=""
              className={`${paneStyles.outputPaneToggleIcon} ${isOutputCollapsed ? paneStyles.outputPaneToggleIconCollapsed : ''}`}
            />
          </button>
          {!isOutputCollapsed ? output : null}
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

