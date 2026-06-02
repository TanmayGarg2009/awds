# CanvasOS — Major UX & Editor Overhaul

Single pass covering all 15 requested areas. Strictly frontend/state — no new backend systems.

## 1. Keyboard shortcuts (Ctrl/Cmd C, V, X, Z, Y, A, Del)
- Add a `useClipboard` + history layer in `store.ts`:
  - Undo/redo stack (capture before each mutation, cap 50).
  - Internal clipboard for nodes + edges (multi-node copy).
- Global key handler in `CanvasEditor.tsx`:
  - Cmd/Ctrl+C copy selection, +X cut, +V paste (offset 24px), +Z undo, +Shift+Z / +Y redo, +A select all, Del/Backspace delete selection, +D duplicate.

## 2. Import behavior fix
- Dashboard import stays as "create new project from file".
- Inside an opened project, add an "Import into project" action:
  - If current canvas empty → merge directly.
  - Else → modal: **Overwrite current** / **Merge as group** / **Create new project (ask name)**.
- Imported nodes get fresh IDs via `reIdProject` adapted to canvas-level merge.

## 3. RGB / HSL color picker
- Replace ad-hoc parser with `react-colorful` (`HexColorPicker` + `RgbaColorPicker` + `HslaColorPicker`) inside Popover. Tabs Hex/RGB/HSL. Alpha slider. Eyedropper where supported. Presets retained.

## 4. Multi-select bulk ops
- Already enabled in React Flow; wire `selectedNodeIds[]` in store from `onSelectionChange`.
- Inspector switches to "Multi (N)" mode: bulk color, status, tags add, delete, duplicate, align.

## 5. Right-click context menu
- Wrap canvas + nodes with `shadcn ContextMenu`:
  - **Pane**: Add node (submenu of kinds), Paste, Select all, Fit view.
  - **Node**: Rename, Duplicate, Copy, Cut, Delete, Open nested, Info, Change color (submenu), Bring to front.
  - **Edge**: Rename label, Straighten, Curve, Delete.

## 6. More node kinds
Add to `node-kinds.ts`: `kanban`, `note`, `todo`, `image`, `link`, `code`, `markdown`, `terminal`, `cdn`, `loadbalancer`, `analytics`, `email`, `payment`, `mobile`, `iot`, `mlmodel`, `vector-db`, `cron`, `secret`, `monitoring`. Each with icon + color.

## 7. Per-project version history
- Versions already live in `project.versions` (per-project). Audit dashboard to ensure no cross-project bleed.
- VersionPanel polish: thumbnails (SVG of root canvas), card grid, search, rename, restore confirm.

## 8. Themed + detailed minimap
- Custom `MiniMap` with `nodeColor` derived from each node's color/kind, `nodeStrokeColor` from theme tokens, `nodeBorderRadius`, `maskColor` from theme; render node title initials via custom `nodeComponent`.

## 9. Recursive nested count
- `hasChildren` already correct; add `descendantCount(canvasId)` walking the tree; badge shows total nested descendants (e.g., "2 nested" for backend→cache under block).

## 10. Block content editor (notes → blocks)
- New type `Block = { id, kind: 'h1'|'h2'|'h3'|'p'|'code'|'todo'|'list'|'quote'|'divider', text, checked? }`.
- Migration: if `notes` string exists, convert to single paragraph block.
- Inspector renders block list with add/remove/reorder, slash menu, todo checkboxes.

## 11. Node face image
- New `data.image = { src, fit: 'cover'|'contain'|'auto', width?, height? }`.
- Inspector: Upload (FileReader → base64) or URL input, fit toggle, manual size sliders, auto-detect natural size.
- `CanvasNodeView` renders image as header background when present.

## 12. Todo lists in blocks (covered by #10).

## 13. "About" panel for selected node
- Add Tabs to Inspector: **Properties** / **Content (blocks)** / **About**.
- About shows: id, kind, created/updated, tag count, connections (in/out), child canvas count, descendant nodes recursive, last edit.

## 14. Edge enhancements
- Edge label editing via context menu / double-click prompt → `edge.label`.
- Delete edge from context menu (preserve nodes).
- Edge type toggle: curve (default `smoothstep` or `bezier`) vs straight (`step` with corners) via Ctrl+click on edge; persisted in `edge.type`.

## 15. Theme persistence on home + Settings page + responsive
- Theme already saved to IndexedDB settings; root `__root.tsx` reads it on mount and applies `data-theme` before paint (inline script to avoid flash).
- Add `/app/settings` route: theme picker, autosave interval, grid toggle, default node kind, export-all, danger zone (clear local data).
- Mobile/tablet: dashboard grid responsive (already), editor uses Sheet for Inspector/Palette/Versions on <md, top bar collapses to menu, touch-friendly hit targets (min 44px), pinch/pan from React Flow.

## Technical notes
- New deps: `react-colorful`.
- Files touched: `store.ts`, `types.ts`, `CanvasEditor.tsx`, `CanvasNodeView.tsx`, `Inspector.tsx`, `Topbar.tsx`, `Palette.tsx`, `VersionPanel.tsx`, `node-kinds.ts`, `project-utils.ts`, `__root.tsx`, `app.index.tsx`, `app.$projectId.tsx`, plus new `BlockEditor.tsx`, `NodeContextMenu.tsx`, `EdgeWithMenu.tsx`, `ImportDialog.tsx`, `app.settings.tsx`.
- Keep all existing data working (migrate notes → blocks lazily on read).

## Out of scope (unchanged)
AI, cloud sync, auth, collaboration, external integrations.
