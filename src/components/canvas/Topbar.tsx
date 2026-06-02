import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Breadcrumbs } from "./Breadcrumbs";
import { Download, Upload, Save, Palette as PaletteIcon, Undo2, Redo2, Menu, Settings } from "lucide-react";
import { getSettings, saveSettings, saveProject } from "@/lib/db";
import type { Settings as S } from "@/lib/types";
import { reIdProject } from "@/lib/project-utils";

const THEMES: S["theme"][] = ["light", "dark", "amoled", "dracula", "nord"];

export function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void } = {}) {
  const project = useStore((s) => s.project);
  const dirty = useStore((s) => s.dirty);
  const saving = useStore((s) => s.saving);
  const lastSavedAt = useStore((s) => s.lastSavedAt);
  const save = useStore((s) => s.save);
  const rename = useStore((s) => s.renameProject);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const merge = useStore((s) => s.mergeIntoCurrentCanvas);
  const navigate = useNavigate();

  const [theme, setTheme] = useState<S["theme"]>("light");
  const [importRaw, setImportRaw] = useState<any | null>(null);

  useEffect(() => {
    getSettings().then((s) => { setTheme(s.theme); applyTheme(s.theme); });
  }, []);

  function changeTheme(t: S["theme"]) {
    setTheme(t);
    applyTheme(t);
    try { localStorage.setItem("canvasos-theme", t); } catch {}
    getSettings().then((s) => saveSettings({ ...s, theme: t }));
  }

  async function exportJSON() {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.canvasos.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function pickFile(file: File) {
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      if (!raw?.canvases || !raw?.rootCanvasId) throw new Error("Not a CanvasOS file");
      const cur = useStore.getState();
      const canvas = cur.project?.canvases[cur.currentCanvasId ?? ""];
      const empty = !canvas || canvas.nodes.length === 0;
      if (empty) { merge(raw); return; }
      setImportRaw(raw);
    } catch (e) {
      alert("Invalid CanvasOS file: " + (e as Error).message);
    }
  }

  async function importAsNew() {
    if (!importRaw) return;
    const name = prompt("Project name", (importRaw.name || "Imported") + " (imported)")?.trim();
    if (!name) return;
    const fresh = reIdProject(importRaw, { newName: name });
    await saveProject(fresh);
    setImportRaw(null);
    navigate({ to: "/app/$projectId", params: { projectId: fresh.id } });
  }

  return (
    <header className="flex items-center gap-2 px-2 md:px-4 py-2.5 border-b border-border bg-card">
      {onToggleSidebar && (
        <button onClick={onToggleSidebar} className="md:hidden p-1.5 rounded hover:bg-secondary"><Menu className="w-4 h-4" /></button>
      )}
      <Link to="/" className="font-display text-lg leading-none hidden sm:block">
        Canvas<span className="text-accent">OS</span>
      </Link>
      <div className="w-px h-5 bg-border hidden sm:block" />

      {project && (
        <input
          value={project.name}
          onChange={(e) => rename(e.target.value)}
          className="bg-transparent text-sm font-medium outline-none focus:bg-secondary/50 px-1.5 py-0.5 rounded min-w-0 max-w-[200px]"
        />
      )}

      <div className="w-px h-5 bg-border hidden md:block" />
      <div className="hidden md:block"><Breadcrumbs /></div>

      <div className="ml-auto flex items-center gap-1.5">
        <button onClick={undo} className="p-1.5 rounded border border-border hover:bg-secondary" title="Undo (⌘Z)"><Undo2 className="w-3.5 h-3.5" /></button>
        <button onClick={redo} className="p-1.5 rounded border border-border hover:bg-secondary" title="Redo (⇧⌘Z)"><Redo2 className="w-3.5 h-3.5" /></button>
        <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">
          {saving ? "saving…" : dirty ? "unsaved" : lastSavedAt ? `saved ${timeAgo(lastSavedAt)}` : "idle"}
        </span>

        <label className="p-1.5 rounded border border-border hover:bg-secondary cursor-pointer" title="Import">
          <Upload className="w-3.5 h-3.5" />
          <input type="file" accept=".json,application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
        </label>
        <button onClick={exportJSON} className="p-1.5 rounded border border-border hover:bg-secondary" title="Export JSON"><Download className="w-3.5 h-3.5" /></button>
        <button onClick={() => save()} className="p-1.5 rounded border border-border hover:bg-secondary" title="Save"><Save className="w-3.5 h-3.5" /></button>
        <Link to="/app/settings" className="p-1.5 rounded border border-border hover:bg-secondary" title="Settings"><Settings className="w-3.5 h-3.5" /></Link>

        <div className="relative group">
          <button className="p-1.5 rounded border border-border hover:bg-secondary" title="Theme"><PaletteIcon className="w-3.5 h-3.5" /></button>
          <div className="absolute right-0 top-full mt-1 z-10 bg-popover border border-border rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            {THEMES.map((t) => (
              <button key={t} onClick={() => changeTheme(t)}
                className={`block w-full text-left px-3 py-1.5 text-xs font-mono uppercase hover:bg-secondary ${theme === t ? "text-accent" : ""}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {importRaw && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur z-50 grid place-items-center p-4" onClick={() => setImportRaw(null)}>
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl mb-1">Import into this project?</h3>
            <p className="text-sm text-muted-foreground mb-5">This canvas already has content. Choose how to bring in the file.</p>
            <div className="space-y-2">
              <button onClick={() => { merge(importRaw, { overwrite: false }); setImportRaw(null); }}
                className="w-full text-left p-3 rounded border border-border hover:border-foreground">
                <div className="font-medium">Merge into current canvas</div>
                <div className="text-xs text-muted-foreground">Append imported nodes alongside what's here.</div>
              </button>
              <button onClick={() => { if (confirm("Overwrite this canvas? Existing nodes will be removed (undoable).")) { merge(importRaw, { overwrite: true }); setImportRaw(null); } }}
                className="w-full text-left p-3 rounded border border-border hover:border-foreground">
                <div className="font-medium">Overwrite current canvas</div>
                <div className="text-xs text-muted-foreground">Replace current canvas contents with the imported root.</div>
              </button>
              <button onClick={importAsNew}
                className="w-full text-left p-3 rounded border border-border hover:border-foreground">
                <div className="font-medium">Create new project</div>
                <div className="text-xs text-muted-foreground">Open as a brand-new project (you'll be asked for a name).</div>
              </button>
            </div>
            <button onClick={() => setImportRaw(null)} className="mt-4 text-xs font-mono uppercase text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </header>
  );
}

export function applyTheme(t: S["theme"]) {
  if (typeof document === "undefined") return;
  if (t === "light") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
