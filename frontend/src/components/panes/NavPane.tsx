import React, { useCallback, useState } from 'react';
import styles from '../../component-styles/Panes.module.css';
import FolderIcon from '../../assets/nav_pane_folder_icon.svg';
import SearchIcon from '../../assets/nav_pane_search_icon.svg';
import SettingsIcon from '../../assets/nav_pane_settings_icon.svg';
import ProfileIcon from '../../assets/nav_pane_profile_icon.svg';
import NotImplementedYet from '../windows/Not_Implemented_Yet';

const NavPane: React.FC = () => {
  const [notImplementedOpen, setNotImplementedOpen] = useState(false);

  const openNotImplemented = useCallback(() => {
    setNotImplementedOpen(true);
  }, []);

  const closeNotImplemented = useCallback(() => {
    setNotImplementedOpen(false);
  }, []);

  return (
    <div className={styles.navPaneRoot}>
      <div className={styles.paneBody}>
        <div className={styles.navPaneIconRow}>
          <button
            type="button"
            className={styles.navPaneIconButton}
            aria-label="Folders and documents"
            onClick={openNotImplemented}
          >
            <img src={FolderIcon} alt="" className={styles.navPaneIcon} />
          </button>

          <button
            type="button"
            className={styles.navPaneIconButton}
            aria-label="Search"
            onClick={openNotImplemented}
          >
            <img src={SearchIcon} alt="" className={styles.navPaneIcon} />
          </button>

          <button
            type="button"
            className={styles.navPaneIconButton}
            aria-label="Settings"
            onClick={openNotImplemented}
          >
            <img src={SettingsIcon} alt="" className={styles.navPaneIcon} />
          </button>

          <button
            type="button"
            className={styles.navPaneIconButton}
            aria-label="Profile or login"
            onClick={openNotImplemented}
          >
            <img src={ProfileIcon} alt="" className={styles.navPaneIcon} />
          </button>
        </div>

        <div className={styles.navPaneTitleRule} aria-hidden="true" />

        <div className={styles.navPaneSubtitle}>
          Notebook pages and folders will appear here.
        </div>
      </div>

      <NotImplementedYet isOpen={notImplementedOpen} onClose={closeNotImplemented} />
    </div>
  );
};

export default NavPane;
