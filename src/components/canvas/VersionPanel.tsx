import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  History, RotateCcw, Camera, Search, Trash2, Pencil,
  Copy as CopyIcon, GitCompare, X,
} from "lucide-react";
import { approxSize, formatBytes } from "@/lib/project-utils";
import type { Version, Canvas } from "@/lib/types";

export function VersionPanel() {
  const project = useStore((s) => s.project);
  const snapshot = useStore((s) => s.snapshot);
  const restore = useStore((s) => s.restoreVersion);
  const deleteVersion = useStore((s) => s.deleteVersion);
  const updateVersion = useStore((s) => s.updateVersion);
  const duplicateVersion = useStore((s) => s.duplicateVersion);

  const [desc, setDesc] = useState("");
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!project) return [];
    const q = query.trim().toLowerCase();
    if (!q) return project.versions;
    return project.versions.filter(
      (v) =>
        v.description.toLowerCase().includes(q) ||
        new Date(v.createdAt).toLocaleString().toLowerCase().includes(q),
    );
  }, [project, query]);

  if (!project) return null;

  const startCompare = (id: string) => {
    if (!compareA) {
      setCompareA(id);
      return;
    }
    if (compareA === id) {
      setCompareA(null);
      return;
    }
    setCompareB(id);
    setCompareOpen(true);
  };

  const preview = previewId ? project.versions.find((v) => v.id === previewId) : null;
  const vA = compareA ? project.versions.find((v) => v.id === compareA) : null;
  const vB = compareB ? project.versions.find((v) => v.id === compareB) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <span className="text-[11px] font-mono uppercase tracking-wider">Version History</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {project.versions.length}
        </span>
      </div>

      <div className="p-3 border-b border-border space-y-2">
        <div className="flex gap-2">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What changed?"
            onKeyDown={(e) => {
              if (e.key === "Enter") { snapshot(desc || "Snapshot"); setDesc(""); }
            }}
            className="flex-1 bg-secondary/50 rounded px-2 py-1.5 text-xs border border-transparent focus:border-accent outline-none"
          />
          <button
            onClick={async () => { await snapshot(desc || "Snapshot"); setDesc(""); }}
            className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider bg-foreground text-background px-2.5 py-1.5 rounded hover:opacity-90"
          >
            <Camera className="w-3.5 h-3.5" /> Snap
          </button>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search versions…"
            className="w-full bg-secondary/50 rounded pl-7 pr-2 py-1.5 text-xs border border-transparent focus:border-accent outline-none"
          />
        </div>
        {(compareA || compareB) && (
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground bg-secondary/40 rounded px-2 py-1">
            <span>
              Compare: <span className="text-foreground">A</span>{" "}
              {compareA ? abbr(project.versions.find((v) => v.id === compareA)?.description) : "—"}
              {" · "}
              <span className="text-foreground">B</span>{" "}
              {compareB ? abbr(project.versions.find((v) => v.id === compareB)?.description) : "pick another"}
            </span>
            <button
              onClick={() => { setCompareA(null); setCompareB(null); }}
              className="hover:text-foreground"
            >clear</button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            {project.versions.length === 0
              ? "No snapshots yet. Snap whenever you reach a meaningful state — restoring is non-destructive."
              : "No versions match your search."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((v) => {
              const size = approxSize(v.snapshot);
              const isA = compareA === v.id;
              const isB = compareB === v.id;
              return (
                <li
                  key={v.id}
                  className={`px-3 py-2.5 hover:bg-secondary/50 group ${isA || isB ? "bg-accent/10" : ""}`}
                  title={`Created: ${new Date(v.createdAt).toLocaleString()}
Nodes: ${v.nodeCount} · Canvases: ${v.canvasCount}
Size: ${formatBytes(size)}
ID: ${v.id}`}
                >
                  {renamingId === v.id ? (
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onBlur={() => {
                        if (renameVal.trim()) updateVersion(v.id, { description: renameVal.trim() });
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="w-full bg-secondary rounded px-2 py-1 text-sm border border-accent outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setPreviewId(v.id)}
                      className="text-left w-full"
                    >
                      <div className="text-sm truncate flex items-center gap-1.5">
                        {isA && <span className="text-[9px] font-mono bg-accent/20 text-accent px-1 rounded">A</span>}
                        {isB && <span className="text-[9px] font-mono bg-accent/20 text-accent px-1 rounded">B</span>}
                        {v.description}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {new Date(v.createdAt).toLocaleString()} · {v.nodeCount}n / {v.canvasCount}c · {formatBytes(size)}
                      </div>
                    </button>
                  )}

                  <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconBtn title="Rename" onClick={() => { setRenamingId(v.id); setRenameVal(v.description); }}>
                      <Pencil className="w-3 h-3" />
                    </IconBtn>
                    <IconBtn title="Duplicate" onClick={() => duplicateVersion(v.id)}>
                      <CopyIcon className="w-3 h-3" />
                    </IconBtn>
                    <IconBtn title={isA || isB ? "Remove from compare" : "Compare"} onClick={() => startCompare(v.id)}>
                      <GitCompare className="w-3 h-3" />
                    </IconBtn>
                    <IconBtn
                      title="Restore"
                      onClick={() => {
                        if (confirm("Restore this version? Your current state will be snapshotted first."))
                          restore(v.id);
                      }}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </IconBtn>
                    <IconBtn
                      title="Delete"
                      danger
                      onClick={() => {
                        if (confirm(`Delete snapshot "${v.description}"? This cannot be undone.`))
                          deleteVersion(v.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </IconBtn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {preview && (
        <VersionPreviewModal
          version={preview}
          onClose={() => setPreviewId(null)}
          onRestore={() => {
            if (confirm("Restore this version? Your current state will be snapshotted first.")) {
              restore(preview.id);
              setPreviewId(null);
            }
          }}
          onCompare={() => { startCompare(preview.id); setPreviewId(null); }}
          onDuplicate={() => { duplicateVersion(preview.id); setPreviewId(null); }}
          onRename={() => { setRenamingId(preview.id); setRenameVal(preview.description); setPreviewId(null); }}
          onDelete={() => {
            if (confirm("Delete this snapshot?")) {
              deleteVersion(preview.id);
              setPreviewId(null);
            }
          }}
        />
      )}

      {compareOpen && vA && vB && (
        <CompareModal
          a={vA}
          b={vB}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

function IconBtn({
  children, onClick, title, danger,
}: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1 rounded border border-border hover:border-foreground ${
        danger ? "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" : ""
      }`}
    >
      {children}
    </button>
  );
}

function abbr(s?: string) {
  if (!s) return "—";
  return s.length > 24 ? s.slice(0, 24) + "…" : s;
}

function VersionPreviewModal({
  version, onClose, onRestore, onCompare, onDuplicate, onRename, onDelete,
}: {
  version: Version; onClose: () => void;
  onRestore: () => void; onCompare: () => void;
  onDuplicate: () => void; onRename: () => void; onDelete: () => void;
}) {
  const size = approxSize(version.snapshot);
  const root = version.snapshot.canvases[version.snapshot.rootCanvasId];
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur z-50 flex items-center justify-center p-6"
      onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <div className="font-display text-lg">{version.description}</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
              {new Date(version.createdAt).toLocaleString()} · ID {version.id}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4 text-xs font-mono">
          <Stat label="Nodes" value={version.nodeCount} />
          <Stat label="Canvases" value={version.canvasCount} />
          <Stat label="Size" value={formatBytes(size)} />
          <Stat label="Root" value={root?.name ?? "—"} />
        </div>
        <div className="px-5 pb-5 flex-1 overflow-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Preview (root canvas)</div>
          <SnapshotPreview canvas={root} />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-border">
          <button onClick={onRestore} className="text-xs font-mono uppercase bg-foreground text-background px-3 py-1.5 rounded">Restore</button>
          <button onClick={onCompare} className="text-xs font-mono uppercase border border-border px-3 py-1.5 rounded hover:bg-secondary">Compare</button>
          <button onClick={onDuplicate} className="text-xs font-mono uppercase border border-border px-3 py-1.5 rounded hover:bg-secondary">Duplicate</button>
          <button onClick={onRename} className="text-xs font-mono uppercase border border-border px-3 py-1.5 rounded hover:bg-secondary">Rename</button>
          <button onClick={onDelete} className="ml-auto text-xs font-mono uppercase border border-destructive text-destructive px-3 py-1.5 rounded hover:bg-destructive hover:text-destructive-foreground">Delete</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border rounded p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-display">{value}</div>
    </div>
  );
}

function SnapshotPreview({ canvas }: { canvas?: Canvas }) {
  if (!canvas || canvas.nodes.length === 0) {
    return <div className="text-xs text-muted-foreground border border-dashed border-border rounded p-6 text-center">Empty canvas</div>;
  }
  const xs = canvas.nodes.map((n) => n.position.x);
  const ys = canvas.nodes.map((n) => n.position.y);
  const minX = Math.min(...xs) - 40, maxX = Math.max(...xs) + 200;
  const minY = Math.min(...ys) - 40, maxY = Math.max(...ys) + 100;
  const w = maxX - minX, h = maxY - minY;
  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="w-full h-48 bg-secondary/30 rounded border border-border">
      {canvas.edges.map((e) => {
        const a = canvas.nodes.find((n) => n.id === e.source);
        const b = canvas.nodes.find((n) => n.id === e.target);
        if (!a || !b) return null;
        return <line key={e.id} x1={a.position.x + 80} y1={a.position.y + 30} x2={b.position.x + 80} y2={b.position.y + 30} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />;
      })}
      {canvas.nodes.map((n) => (
        <g key={n.id}>
          <rect x={n.position.x} y={n.position.y} width={160} height={60} rx={6} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.4" />
          <text x={n.position.x + 10} y={n.position.y + 26} fontSize="12" fill="currentColor">{(n.data.title || "").slice(0, 22)}</text>
        </g>
      ))}
    </svg>
  );
}

function CompareModal({ a, b, onClose }: { a: Version; b: Version; onClose: () => void }) {
  const diff = useMemo(() => diffSnapshots(a, b), [a, b]);
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <div className="font-display text-lg">Compare snapshots</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
              <span className="text-accent">A</span> {a.description} · {new Date(a.createdAt).toLocaleString()}
              <br/>
              <span className="text-accent">B</span> {b.description} · {new Date(b.createdAt).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3 px-5 py-3 text-xs font-mono border-b border-border">
          <Stat label="Added" value={diff.added.length} />
          <Stat label="Removed" value={diff.removed.length} />
          <Stat label="Modified" value={diff.modified.length} />
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4 text-sm">
          <DiffSection title="Added nodes" items={diff.added.map((n) => `+ ${n.title} (${n.kind})`)} color="text-emerald-600" />
          <DiffSection title="Removed nodes" items={diff.removed.map((n) => `− ${n.title} (${n.kind})`)} color="text-destructive" />
          <DiffSection
            title="Modified nodes"
            items={diff.modified.map((m) => `~ ${m.title}: ${m.changes.join(", ")}`)}
            color="text-amber-600"
          />
          <DiffSection title="Edges" items={[
            diff.edgesAdded ? `+ ${diff.edgesAdded} added` : "",
            diff.edgesRemoved ? `− ${diff.edgesRemoved} removed` : "",
          ].filter(Boolean)} color="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function DiffSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">— none —</div>
      ) : (
        <ul className={`text-xs font-mono space-y-0.5 ${color}`}>
          {items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
    </div>
  );
}

type NodeLite = { id: string; title: string; kind: string };
function diffSnapshots(a: Version, b: Version) {
  const aNodes = collectNodes(a);
  const bNodes = collectNodes(b);
  const aById = new Map(aNodes.map((n) => [n.id, n]));
  const bById = new Map(bNodes.map((n) => [n.id, n]));

  const added: NodeLite[] = [];
  const removed: NodeLite[] = [];
  const modified: { id: string; title: string; changes: string[] }[] = [];

  for (const n of bNodes) {
    const prev = aById.get(n.id);
    if (!prev) added.push({ id: n.id, title: n.title, kind: n.kind });
    else {
      const changes: string[] = [];
      if (prev.title !== n.title) changes.push("title");
      if (prev.description !== n.description) changes.push("description");
      if (prev.notes !== n.notes) changes.push("notes");
      if (prev.kind !== n.kind) changes.push("kind");
      if (prev.status !== n.status) changes.push("status");
      if (JSON.stringify(prev.tags ?? []) !== JSON.stringify(n.tags ?? [])) changes.push("tags");
      if (prev.color !== n.color) changes.push("color");
      if (changes.length) modified.push({ id: n.id, title: n.title, changes });
    }
  }
  for (const n of aNodes) {
    if (!bById.has(n.id)) removed.push({ id: n.id, title: n.title, kind: n.kind });
  }

  const aEdges = countEdges(a);
  const bEdges = countEdges(b);
  return {
    added, removed, modified,
    edgesAdded: Math.max(0, bEdges - aEdges),
    edgesRemoved: Math.max(0, aEdges - bEdges),
  };
}

function collectNodes(v: Version) {
  const out: Array<{
    id: string; title: string; description?: string;
    notes?: string; kind: string; status?: string; tags?: string[]; color?: string;
  }> = [];
  for (const c of Object.values(v.snapshot.canvases)) {
    for (const n of c.nodes) {
      out.push({
        id: n.id,
        title: n.data.title,
        description: n.data.description,
        notes: n.data.notes,
        kind: n.data.kind,
        status: n.data.status,
        tags: n.data.tags,
        color: n.data.color,
      });
    }
  }
  return out;
}

function countEdges(v: Version) {
  return Object.values(v.snapshot.canvases).reduce((a, c) => a + c.edges.length, 0);
}