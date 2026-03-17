# Frontend Plan

This document is the outline and implementation plan for the CodeBento frontend. 

## 1. Layout and Structure

### 1.1 Three main panes

All three panes stretch from top to bottom. Layout is: left → center → right.
They are resizable with minimum width, other panes shift in response to resize.

| Pane | Position | Role |
|------|----------|------|
| **Navigation** | Left, anchored | Always visible. Other panes shift when it resizes. |
| **Notebook page** | Center | Main content; sits between nav and output. |
| **Output** | Right | Execution results and program I/O. |

### 

### 1.2 Navigation pane (left)

- **Extent:** Top to bottom of the viewport, left aligned.
- **Resizing:** Resizable width with a **minimum width**. When the user drags the edge, only the nav width changes; the center pane shifts.
- **Contents:**
  - **Notebook pages:** List or tree of pages. Click to open/select. The displayed notebook page must correspond exactly to the selected page.
  - **Page actions:** Create new page, delete page.
  - **Grouping:** Group pages into folders (e.g. collapsible sections).
  - **App entry points:** Profile / login, settings, and other app-level areas (placement TBD)
- **Persistence:** Nav state should persist where appropriate

### 1.3 Notebook page pane (center)

- **Extent:** Top to bottom; sits to the right of the nav pane.
- **Resizing:** Shares a resizable edge with **both** the nav pane (left) and the output pane (right). Resizing affects only the notebook pane width (or the split ratios).
- **Content type:** A **rich text editor**:
  - Formatting: bold, italics, font sizes, highlight, font color.
  - Behaves like a normal notebook page (mixed text and code blocks).
- **Sync with nav:** The displayed notebook page must always match the **selected page** in the nav pane. Switching selection in nav updates the center pane immediately.
- **Later:**
  - Select text and run it as code.
  - Per-page settings (e.g. show line numbers or not, templates).

### 1.4 Output pane (right)

- **Extent:** Top to bottom on the right.
- **Resizing:** Shares a resizable edge with the notebook pane. Resizing the output pane only affects the right side of the notebook pane.
- **Sections (vertical stacking):**
  - **terminal**
  - **stderr**
  - Each section is **individually vertically resizable** (e.g. drag borders between sections).
- **Future controls:** Buttons such as “Simplify Error Message” (AI). Placeholder in layout is enough for now.

### 1.5 Global tab bar

- **Tabs:** A tab bar **above** the notebook page for **multiple open notebooks** (or open pages). Tabs reflect “open” items; closing a tab does not delete the page, only removes it from the open set.
- **Logo:** In top-left

## 2. Interactions and UX

### 2.1 Run / Stop behavior

- **Run:** Starts execution of the current page’s code (or selected code, when that feature exists). While running or waiting for input, **Run is disabled**.
- **Stop:** Cancels the current session. Code in the editor **remains unchanged**. When running or waiting for input, **Stop is enabled**.
- **State rule:** The user cannot start a new run until the current program has finished or has been stopped. No “run again” until terminal/session is idle.

### 2.2 Error UX

- Friendly, cute UI:
  - Short message (“Oops, something went wrong”).
  - Optional small illustration or icon.
  - Technically meaningful detail (in a collapsible “Details” or tooltip) so support/debugging is still possible.

### 2.3 Polish

- **Animations:** Use for loading states and transitions (e.g. pane resize, tab switch, run → output). Keep them subtle and fast.
- **Micro-interactions:** Small UI details (hover, focus, success feedback) to make the app feel alive and friendly without being noisy.

---

## 3. Implementation Plan

### Phase 1: Three-pane layout and resizing

**Goal:** Full-height three-pane layout (nav | notebook | output) with resizable splits.

1. Root layout component that renders three full-height columns and two horizontal resizers (nav | notebook, notebook | output). Use existing Editor + Terminal as placeholders in center and right panes; left pane is a simple “Nav” placeholder.
2. Implement resizable splits (e.g. drag handles or a small library). Enforce minimum widths for nav, persist split ratios and restore on load.
3. Logo in top-left, and a tab bar above the notebook area. Ensure layout works at different viewport sizes.

### Phase 2: Navigation pane and page selection

**Goal:** Real nav content: list of pages, selection drives which “page” is active. Center pane still shows a single editor for now (one page’s content).

4. **B.1** — Define a minimal data model for “pages” (e.g. id, title, order). In-memory or `localStorage` for now. Nav reads this and renders a list; selection is stored in app state.
5. **B.2** — Nav actions: create new page, delete page. Creating a page adds it to the list and optionally selects it; deleting removes it and selects another.
6. **B.3** — Wire selection to content: the center pane shows the **content of the selected page only**. Editor state (and later rich content) is keyed by page id. No tabs logic yet beyond “current page.”

### Phase 3: Tabs and multi-open pages

**Goal:** Tab bar reflects “open” pages; user can have multiple tabs; closing a tab doesn’t delete the page.

7. **C.1** — Tab state: maintain a list of “open” page ids and an “active” tab. Opening a page (from nav) adds it to open set and makes it active; if already open, just switch to it.
8. **C.2** — Tab bar UI: one tab per open page, active tab highlighted, close button per tab. Selecting a tab switches the center pane to that page’s content.
9. **C.3** — Optional: “Close others,” “Close all,” or similar. Optional: drag to reorder tabs.

### Phase 4: Output pane structure

**Goal:** Output pane has distinct sections (stdin, stdout, stderr) and is vertically resizable. Reuse or adapt current Terminal/run behavior.

10. **D.1** — Split output pane into three vertical sections: stdin (input), stdout, stderr. Reuse existing Terminal component for the combined I/O transcript; optionally keep or adapt the current “single terminal” behavior so it fits the “stdin/stdout/stderr” sections (e.g. one terminal view that shows all three in order, or separate areas—to be decided).
11. **D.2** — Make the vertical splits between stdin/stdout/stderr resizable (min heights to avoid zero-height sections). Optionally persist heights.

### Phase 5: Rich notebook page (later)

**Goal:** Center pane is a rich text editor (bold, italic, sizes, colors, etc.), not just code. Deferred until layout and nav are stable.

12. **E.1** — Replace or wrap the current code editor with a rich-text–capable editor (e.g. TipTap, Lexical, or similar). Support inline formatting and, if needed, “code blocks” inside the document.
13. **E.2** — “Select text and run as code”: when the user selects a range, a Run action runs only that range (backend contract TBD).
14. **E.3** — Per-page settings (line numbers, template, etc.) as a small settings UI per page.

### Phase 6: Error UX and polish

**Goal:** Friendly error presentation and consistent animations/polish.

15. **F.1** — Error UX: intercept backend/runner errors and display a friendly screen (message + optional illustration). Expose raw message in a “Details” expandable or tooltip.
16. **F.2** — Loading and transition animations (run start, tab switch, pane resize). Keep duration short (e.g. 150–250 ms).
17. **F.3** — Micro-interactions: hover/focus states, success feedback on run, small transitions. No large scope creep—target a few high-impact spots.

### Phase 7: Nav extras (folders, profile, settings)

**Goal:** Group pages into folders; add entry points for profile/login and settings.

18. **G.1** — Folders: extend page model with optional `folderId` or tree structure. Nav renders folders as collapsible groups; drag-and-drop or menu to move pages into folders.
19. **G.2** — Profile / login and settings: add entry points in nav (or top bar). Implement as separate views or modals; exact flow TBD.

---

## 4. Out of scope (for this plan)

- Backend changes for “run selected code” or multi-page persistence (handled in other docs).
- Auth and profile backend (only frontend entry points and placeholders are in scope).
- “Simplify Error Message” (AI) implementation—only UI placeholder in output pane.

---

## 5. Current state (as of plan write-up)

- Single full-page layout: Editor (code) + Terminal (combined stdin/stdout/stderr) + Sticky notes.
- Run / Stop work; session and waiting-for-input behavior are in place.
- Terminal: clear on run, input line only when waiting, prompt and input on same line when stdout has no trailing newline.
- No nav, no tabs, no three-pane layout, no rich text, no friendly error screen.

Starting point for implementation: **Phase A (three-pane layout and resizing)**.
