import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { KIND_META } from "./node-kinds";
import { ensureBlocks, descendantStats } from "@/lib/project-utils";
import type { Block, BlockKind, NodeStatus } from "@/lib/types";
import { Trash2, Copy, CornerDownRight, X, Plus, GripVertical, Image as ImageIcon, Upload as UploadIcon } from "lucide-react";
import { HexColorPicker, RgbaColorPicker, HslaColorPicker } from "react-colorful";
import { nanoid } from "nanoid";

const STATUSES: NodeStatus[] = ["idea", "todo", "in-progress", "done", "blocked"];

export function Inspector() {
  const project = useStore((s) => s.project);
  const canvasId = useStore((s) => s.currentCanvasId);
  const selectedId = useStore((s) => s.selectedNodeId);
  const selectedIds = useStore((s) => s.selectedNodeIds);
  const updateNode = useStore((s) => s.updateNode);
  const updateNodes = useStore((s) => s.updateNodes);
  const deleteNode = useStore((s) => s.deleteNode);
  const deleteNodes = useStore((s) => s.deleteNodes);
  const duplicateNode = useStore((s) => s.duplicateNode);
  const enterNode = useStore((s) => s.enterNode);
  const selectNode = useStore((s) => s.selectNode);
  const [tab, setTab] = useState<"props" | "content" | "about">("props");

  if (!project || !canvasId) return <EmptyState />;

  if (selectedIds.length > 1) {
    return <MultiSelectPanel ids={selectedIds} updateNodes={updateNodes} deleteNodes={deleteNodes} />;
  }
  if (!selectedId) return <EmptyState />;

  const node = project.canvases[canvasId].nodes.find((n) => n.id === selectedId);
  if (!node) return <EmptyState />;
  const meta = KIND_META[node.data.kind];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground truncate">
          {meta.icon} {meta.label}
        </span>
        <button onClick={() => selectNode(null)} className="ml-auto p-1 rounded hover:bg-secondary text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-border">
        {(["props", "content", "about"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-2 py-2 text-[11px] font-mono uppercase tracking-wider ${tab === t ? "text-foreground border-b-2 border-accent -mb-px" : "text-muted-foreground hover:text-foreground"}`}
          >{t === "props" ? "Properties" : t === "content" ? "Content" : "About"}</button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "props" && <PropsTab node={node} updateNode={updateNode} />}
        {tab === "content" && <ContentTab node={node} updateNode={updateNode} />}
        {tab === "about" && <AboutTab nodeId={node.id} />}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <button
          onClick={() => enterNode(node.id)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider bg-foreground text-background py-2 rounded hover:opacity-90"
        >
          <CornerDownRight className="w-3.5 h-3.5" />
          Open nested
        </button>
        <button onClick={() => duplicateNode(node.id)} className="p-2 rounded border border-border hover:bg-secondary" title="Duplicate (⌘D)"><Copy className="w-4 h-4" /></button>
        <button onClick={() => deleteNode(node.id)} className="p-2 rounded border border-border hover:bg-destructive hover:text-destructive-foreground" title="Delete"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      <p className="font-display text-xl text-foreground mb-2">Nothing selected</p>
      <p>Click a node to inspect it, or right-click the canvas to add one.</p>
      <div className="mt-6 space-y-2 text-xs font-mono">
        <Row k="Right-click" v="Context menu" />
        <Row k="Ctrl/Cmd + click" v="Multi-select" />
        <Row k="Enter" v="Open nested" />
        <Row k="⌘ C / V / X" v="Copy / Paste / Cut" />
        <Row k="⌘ Z / ⇧⌘Z" v="Undo / Redo" />
        <Row k="⌘ A" v="Select all" />
        <Row k="Del" v="Remove" />
        <Row k="2× edge" v="Label" />
        <Row k="⌘ + edge" v="Toggle straight/curve" />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">{k}</kbd>
      <span className="text-muted-foreground">{v}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function PropsTab({ node, updateNode }: { node: any; updateNode: (id: string, patch: any) => void }) {
  return (
    <div className="p-4 space-y-4">
      <Field label="Title">
        <input
          value={node.data.title}
          onChange={(e) => updateNode(node.id, { title: e.target.value })}
          className="w-full bg-transparent border-b border-border focus:border-accent outline-none font-display text-xl py-1"
        />
      </Field>
      <Field label="Description">
        <textarea
          value={node.data.description ?? ""}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          placeholder="Short summary…"
          rows={2}
          className="w-full bg-secondary/50 rounded p-2 text-sm border border-transparent focus:border-accent outline-none resize-none"
        />
      </Field>
      <Field label="Status">
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => updateNode(node.id, { status: s })}
              className={`text-[11px] font-mono uppercase px-2 py-1 rounded border ${node.data.status === s ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Tags (comma-separated)">
        <input
          value={(node.data.tags ?? []).join(", ")}
          onChange={(e) => updateNode(node.id, { tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) })}
          className="w-full bg-secondary/50 rounded p-2 text-sm border border-transparent focus:border-accent outline-none"
        />
      </Field>
      <Field label="Accent color">
        <ColorField value={node.data.color} onChange={(v) => updateNode(node.id, { color: v })} />
      </Field>
      <Field label="Face image">
        <ImageField
          image={node.data.image}
          onChange={(img) => updateNode(node.id, { image: img })}
        />
      </Field>
    </div>
  );
}

const PRESETS = ["#0f172a", "#dc2626", "#ea580c", "#d97706", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777", "#64748b", "#0ea5e9", "#84cc16"];

function ColorField({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const [mode, setMode] = useState<"hex" | "rgb" | "hsl">("hex");
  const [open, setOpen] = useState(false);
  const hex = value && /^#/.test(value) ? value : "#3b82f6";
  const rgb = parseRgb(value) ?? { r: 59, g: 130, b: 246, a: 1 };
  const hsl = parseHsl(value) ?? { h: 217, s: 91, l: 60, a: 1 };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-10 h-10 rounded border border-border"
          style={{ background: value || "#fff" }}
          aria-label="Pick color"
        />
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          placeholder="#hex / rgb() / hsl()"
          className="flex-1 bg-secondary/50 rounded px-2 py-1.5 text-xs font-mono border border-transparent focus:border-accent outline-none"
        />
        <button onClick={() => onChange(undefined)} className="text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground">reset</button>
      </div>
      {open && (
        <div className="rounded border border-border bg-popover p-2 space-y-2">
          <div className="flex gap-1 text-[10px] font-mono uppercase">
            {(["hex", "rgb", "hsl"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-2 py-0.5 rounded border ${mode === m ? "bg-foreground text-background border-foreground" : "border-border"}`}>{m}</button>
            ))}
          </div>
          {mode === "hex" && <HexColorPicker color={hex} onChange={onChange} style={{ width: "100%" }} />}
          {mode === "rgb" && <RgbaColorPicker color={rgb} onChange={(c) => onChange(`rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`)} style={{ width: "100%" }} />}
          {mode === "hsl" && <HslaColorPicker color={hsl} onChange={(c) => onChange(`hsla(${c.h}, ${c.s}%, ${c.l}%, ${c.a})`)} style={{ width: "100%" }} />}
        </div>
      )}
      <div className="grid grid-cols-6 gap-1">
        {PRESETS.map((c) => (
          <button key={c} onClick={() => onChange(c)}
            className={`h-6 rounded border ${value === c ? "border-foreground ring-1 ring-accent" : "border-border"}`}
            style={{ background: c }} title={c} />
        ))}
      </div>
    </div>
  );
}

function parseRgb(s?: string): { r: number; g: number; b: number; a: number } | null {
  if (!s) return null;
  const m = s.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?\s*\)/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] ? +m[4] : 1 };
}
function parseHsl(s?: string): { h: number; s: number; l: number; a: number } | null {
  if (!s) return null;
  const m = s.match(/hsla?\(\s*(\d+)\s*[, ]\s*(\d+)%\s*[, ]\s*(\d+)%\s*(?:[ ,/]+([\d.]+))?\s*\)/i);
  if (!m) return null;
  return { h: +m[1], s: +m[2], l: +m[3], a: m[4] ? +m[4] : 1 };
}

function ImageField({ image, onChange }: { image?: { src: string; fit?: "cover" | "contain" | "auto"; height?: number }; onChange: (v: any) => void }) {
  const [urlInput, setUrlInput] = useState("");
  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => onChange({ src: String(reader.result), fit: "cover", height: 120 });
    reader.readAsDataURL(f);
  };
  return (
    <div className="space-y-2">
      {image?.src ? (
        <div className="space-y-2">
          <div className="border border-border rounded overflow-hidden" style={{ height: image.height ?? 96 }}>
            <img src={image.src} alt="" className="w-full h-full" style={{ objectFit: (image.fit === "auto" ? "contain" : image.fit) || "cover" }} />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            {(["cover", "contain", "auto"] as const).map((f) => (
              <button key={f} onClick={() => onChange({ ...image, fit: f })}
                className={`px-2 py-0.5 rounded border ${image.fit === f ? "bg-foreground text-background border-foreground" : "border-border"}`}>{f}</button>
            ))}
            <span className="ml-auto text-muted-foreground">H</span>
            <input type="range" min={60} max={300} value={image.height ?? 120} onChange={(e) => onChange({ ...image, height: +e.target.value })} className="w-20" />
            <button onClick={() => onChange(undefined)} className="text-destructive uppercase">remove</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded p-3 text-xs cursor-pointer hover:bg-secondary/40">
            <UploadIcon className="w-3.5 h-3.5" /> Upload image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </label>
          <div className="flex gap-1">
            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://image.url"
              className="flex-1 bg-secondary/50 rounded px-2 py-1 text-xs border border-transparent focus:border-accent outline-none" />
            <button onClick={() => { if (urlInput) { onChange({ src: urlInput, fit: "cover", height: 120 }); setUrlInput(""); } }}
              className="px-2 py-1 border border-border rounded text-xs hover:bg-secondary"><ImageIcon className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentTab({ node, updateNode }: { node: any; updateNode: (id: string, patch: any) => void }) {
  const blocks: Block[] = useMemo(() => ensureBlocks(node.data), [node.data]);
  const set = (next: Block[]) => updateNode(node.id, { blocks: next, notes: "" });
  const add = (kind: BlockKind) => set([...blocks, { id: nanoid(6), kind, text: "" }]);
  const upd = (id: string, patch: Partial<Block>) => set(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const del = (id: string) => set(blocks.filter((b) => b.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  return (
    <div className="p-4 space-y-3">
      {blocks.length === 0 && (
        <div className="text-xs text-muted-foreground border border-dashed border-border rounded p-4 text-center">
          No content yet. Add a block below.
        </div>
      )}
      {blocks.map((b) => (
        <div key={b.id} className="group flex gap-1 items-start">
          <div className="flex flex-col gap-0.5 pt-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => move(b.id, -1)} className="text-muted-foreground hover:text-foreground"><GripVertical className="w-3 h-3" /></button>
          </div>
          <div className="flex-1">
            <BlockRow block={b} onChange={(patch) => upd(b.id, patch)} />
          </div>
          <button onClick={() => del(b.id)} className="opacity-0 group-hover:opacity-100 text-destructive p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
        {(["h1", "h2", "h3", "p", "code", "todo", "list", "quote", "link", "divider"] as BlockKind[]).map((k) => (
          <button key={k} onClick={() => add(k)} className="text-[10px] font-mono uppercase border border-border rounded px-2 py-0.5 hover:bg-secondary inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockRow({ block, onChange }: { block: Block; onChange: (p: Partial<Block>) => void }) {
  const t = block.kind;
  if (t === "divider") return <hr className="border-border my-2" />;
  if (t === "todo") {
    return (
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={!!block.checked} onChange={(e) => onChange({ checked: e.target.checked })} />
        <input value={block.text} onChange={(e) => onChange({ text: e.target.value })}
          className={`flex-1 bg-transparent border-b border-border focus:border-accent outline-none text-sm ${block.checked ? "line-through text-muted-foreground" : ""}`}
          placeholder="To-do…" />
      </div>
    );
  }
  if (t === "code") {
    return (
      <textarea value={block.text} onChange={(e) => onChange({ text: e.target.value })}
        rows={Math.min(8, Math.max(2, block.text.split("\n").length))}
        className="w-full bg-secondary/70 rounded p-2 text-xs font-mono border border-transparent focus:border-accent outline-none resize-y"
        placeholder="// code" />
    );
  }
  if (t === "link") {
    return (
      <div className="space-y-1">
        <input value={block.text} onChange={(e) => onChange({ text: e.target.value })}
          className="w-full bg-transparent border-b border-border focus:border-accent outline-none text-sm" placeholder="Label" />
        <input value={block.href ?? ""} onChange={(e) => onChange({ href: e.target.value })}
          className="w-full bg-secondary/50 rounded px-2 py-1 text-xs border border-transparent focus:border-accent outline-none" placeholder="https://" />
      </div>
    );
  }
  if (t === "quote") {
    return <textarea value={block.text} onChange={(e) => onChange({ text: e.target.value })} rows={2}
      className="w-full bg-secondary/30 rounded p-2 text-sm italic border-l-2 border-accent border-y border-r border-transparent focus:border-accent outline-none resize-none" placeholder="Quote" />;
  }
  if (t === "list") {
    return <textarea value={block.text} onChange={(e) => onChange({ text: e.target.value })} rows={3}
      className="w-full bg-transparent text-sm border border-transparent focus:border-accent outline-none resize-y" placeholder="• item one&#10;• item two" />;
  }
  const sizeCls = t === "h1" ? "text-2xl font-display" : t === "h2" ? "text-xl font-display" : t === "h3" ? "text-base font-display" : "text-sm";
  return (
    <input value={block.text} onChange={(e) => onChange({ text: e.target.value })}
      className={`w-full bg-transparent border-b border-transparent focus:border-accent outline-none ${sizeCls}`} placeholder={t.toUpperCase()} />
  );
}

function AboutTab({ nodeId }: { nodeId: string }) {
  const project = useStore((s) => s.project);
  const canvasId = useStore((s) => s.currentCanvasId);
  if (!project || !canvasId) return null;
  const canvas = project.canvases[canvasId];
  const node = canvas.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const inDeg = canvas.edges.filter((e) => e.target === nodeId).length;
  const outDeg = canvas.edges.filter((e) => e.source === nodeId).length;
  const stats = descendantStats(project, node.data.childCanvasId);
  const meta = KIND_META[node.data.kind];
  return (
    <div className="p-4 space-y-4 text-sm">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Node</div>
        <div className="font-display text-xl mt-1">{node.data.title}</div>
        <div className="text-xs text-muted-foreground">{meta.label}</div>
      </div>
      {node.data.description && <p className="text-sm text-muted-foreground">{node.data.description}</p>}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <Mini label="In-edges" v={inDeg} />
        <Mini label="Out-edges" v={outDeg} />
        <Mini label="Nested nodes" v={stats.nodes} />
        <Mini label="Nested canvases" v={Math.max(0, stats.canvases - (node.data.childCanvasId ? 0 : 0))} />
        <Mini label="Tags" v={node.data.tags?.length ?? 0} />
        <Mini label="Status" v={node.data.status ?? "—"} />
      </div>
      <div className="text-[11px] font-mono text-muted-foreground border-t border-border pt-3 space-y-1">
        <div>ID <span className="text-foreground">{node.id}</span></div>
        {node.data.createdAt && <div>Created {new Date(node.data.createdAt).toLocaleString()}</div>}
        {node.data.updatedAt && <div>Updated {new Date(node.data.updatedAt).toLocaleString()}</div>}
      </div>
    </div>
  );
}

function Mini({ label, v }: { label: string; v: string | number }) {
  return (
    <div className="border border-border rounded p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-display">{v}</div>
    </div>
  );
}

function MultiSelectPanel({ ids, updateNodes, deleteNodes }: { ids: string[]; updateNodes: (ids: string[], p: any) => void; deleteNodes: (ids: string[]) => void }) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Multi-select</div>
        <div className="font-display text-2xl">{ids.length} nodes</div>
      </div>
      <Field label="Bulk status">
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => updateNodes(ids, { status: s })}
              className="text-[11px] font-mono uppercase px-2 py-1 rounded border border-border hover:border-foreground">{s}</button>
          ))}
        </div>
      </Field>
      <Field label="Bulk color">
        <ColorField value={undefined} onChange={(v) => updateNodes(ids, { color: v })} />
      </Field>
      <button onClick={() => deleteNodes(ids)} className="w-full p-2 rounded border border-destructive text-destructive text-xs font-mono uppercase hover:bg-destructive hover:text-destructive-foreground">
        Delete {ids.length} nodes
      </button>
    </div>
  );
}
