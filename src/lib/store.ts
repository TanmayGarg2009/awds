import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  Canvas, CanvasEdge, CanvasNode, CanvasNodeData, Project, Version,
} from "./types";
import { checksum, loadProject, saveProject } from "./db";
import { gcEmptyChildCanvases } from "./project-utils";

function now() { return Date.now(); }

export function newProject(name = "Untitled Project"): Project {
  const rootId = nanoid(10);
  const root: Canvas = { id: rootId, name: "Root", nodes: [], edges: [] };
  return {
    id: nanoid(12),
    name,
    createdAt: now(),
    updatedAt: now(),
    versionId: nanoid(8),
    checksum: "",
    rootCanvasId: rootId,
    canvases: { [rootId]: root },
    versions: [],
  };
}

interface State {
  project: Project | null;
  currentCanvasId: string | null;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  breadcrumbs: { canvasId: string; label: string }[];
  dirty: boolean;
  saving: boolean;
  lastSavedAt: number | null;
  history: { past: string[]; future: string[] };
  clipboard: { nodes: CanvasNode[]; edges: CanvasEdge[] } | null;

  load: (id: string) => Promise<void>;
  setProject: (p: Project) => void;
  openCanvas: (canvasId: string) => void;
  goRoot: () => void;

  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  addNode: (partial: Partial<CanvasNodeData> & { kind: CanvasNodeData["kind"] }, pos?: { x: number; y: number }) => string;
  updateNode: (id: string, patch: Partial<CanvasNodeData>) => void;
  updateNodes: (ids: string[], patch: Partial<CanvasNodeData>) => void;
  updateEdge: (id: string, patch: Partial<CanvasEdge>) => void;
  deleteEdge: (id: string) => void;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  enterNode: (id: string) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (offset?: { x: number; y: number }) => void;
  selectAll: () => void;

  mergeIntoCurrentCanvas: (raw: unknown, opts?: { overwrite?: boolean }) => void;

  renameProject: (name: string) => void;
  markDirty: () => void;
  save: () => Promise<void>;
  snapshot: (description?: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;
  updateVersion: (versionId: string, patch: { description?: string }) => Promise<void>;
  duplicateVersion: (versionId: string) => Promise<void>;
}

const HISTORY_LIMIT = 50;
function serializeForHistory(p: Project): string {
  return JSON.stringify({ canvases: p.canvases, rootCanvasId: p.rootCanvasId });
}

export const useStore = create<State>((set, get) => ({
  project: null,
  currentCanvasId: null,
  selectedNodeId: null,
  selectedNodeIds: [],
  breadcrumbs: [],
  dirty: false,
  saving: false,
  lastSavedAt: null,
  history: { past: [], future: [] },
  clipboard: null,

  async load(id) {
    const p = await loadProject(id);
    if (!p) return;
    get().setProject(p);
  },

  setProject(p) {
    set({
      project: p,
      currentCanvasId: p.rootCanvasId,
      breadcrumbs: [{ canvasId: p.rootCanvasId, label: p.name }],
      selectedNodeId: null,
      selectedNodeIds: [],
      history: { past: [], future: [] },
      dirty: false,
    });
  },

  openCanvas(canvasId) {
    const { project } = get();
    if (!project || !project.canvases[canvasId]) return;
    const chain: { canvasId: string; label: string }[] = [];
    let curId: string | undefined = canvasId;
    const guard = new Set<string>();
    while (curId && !guard.has(curId)) {
      guard.add(curId);
      const c: Canvas | undefined = project.canvases[curId];
      if (!c) break;
      let label = c.name;
      if (c.parentNodeId && c.parentCanvasId) {
        const parentCanvas = project.canvases[c.parentCanvasId];
        const parentNode = parentCanvas?.nodes.find((n) => n.id === c.parentNodeId);
        label = parentNode?.data.title || c.name;
      } else {
        label = project.name;
      }
      chain.unshift({ canvasId: curId, label });
      curId = c.parentCanvasId;
    }
    set({ currentCanvasId: canvasId, breadcrumbs: chain, selectedNodeId: null, selectedNodeIds: [] });
  },

  goRoot() {
    const p = get().project;
    if (p) get().openCanvas(p.rootCanvasId);
  },

  pushHistory() {
    const { project, history } = get();
    if (!project) return;
    const snap = serializeForHistory(project);
    const past = [...history.past, snap].slice(-HISTORY_LIMIT);
    set({ history: { past, future: [] } });
  },

  undo() {
    const { project, history } = get();
    if (!project || history.past.length === 0) return;
    const cur = serializeForHistory(project);
    const past = [...history.past];
    const prev = past.pop()!;
    const parsed = JSON.parse(prev);
    project.canvases = parsed.canvases;
    project.rootCanvasId = parsed.rootCanvasId;
    set({
      project: { ...project },
      history: { past, future: [cur, ...history.future].slice(0, HISTORY_LIMIT) },
      dirty: true,
      selectedNodeId: null, selectedNodeIds: [],
    });
  },

  redo() {
    const { project, history } = get();
    if (!project || history.future.length === 0) return;
    const cur = serializeForHistory(project);
    const [next, ...rest] = history.future;
    const parsed = JSON.parse(next);
    project.canvases = parsed.canvases;
    project.rootCanvasId = parsed.rootCanvasId;
    set({
      project: { ...project },
      history: { past: [...history.past, cur].slice(-HISTORY_LIMIT), future: rest },
      dirty: true,
      selectedNodeId: null, selectedNodeIds: [],
    });
  },

  setNodes(nodes) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    const canvas = project.canvases[currentCanvasId];
    if (!canvas) return;
    project.canvases[currentCanvasId] = { ...canvas, nodes };
    set({ project: { ...project }, dirty: true });
  },

  setEdges(edges) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    const canvas = project.canvases[currentCanvasId];
    if (!canvas) return;
    project.canvases[currentCanvasId] = { ...canvas, edges };
    set({ project: { ...project }, dirty: true });
  },

  addNode(partial, pos) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return "";
    get().pushHistory();
    const id = nanoid(10);
    const node: CanvasNode = {
      id,
      type: "canvas",
      position: pos ?? { x: 120 + Math.random() * 200, y: 120 + Math.random() * 200 },
      data: {
        title: partial.title ?? labelFor(partial.kind),
        description: partial.description ?? "",
        notes: partial.notes ?? "",
        kind: partial.kind,
        status: partial.status ?? "idea",
        tags: partial.tags ?? [],
        color: partial.color,
        createdAt: now(),
        updatedAt: now(),
      },
    };
    const canvas = project.canvases[currentCanvasId];
    canvas.nodes = [...canvas.nodes, node];
    set({ project: { ...project }, dirty: true, selectedNodeId: id, selectedNodeIds: [id] });
    return id;
  },

  updateNode(id, patch) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    const canvas = project.canvases[currentCanvasId];
    canvas.nodes = canvas.nodes.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, ...patch, updatedAt: now() } } : n,
    );
    set({ project: { ...project }, dirty: true });
  },

  updateNodes(ids, patch) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId || ids.length === 0) return;
    get().pushHistory();
    const idSet = new Set(ids);
    const canvas = project.canvases[currentCanvasId];
    canvas.nodes = canvas.nodes.map((n) =>
      idSet.has(n.id) ? { ...n, data: { ...n.data, ...patch, updatedAt: now() } } : n,
    );
    set({ project: { ...project }, dirty: true });
  },

  updateEdge(id, patch) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    const canvas = project.canvases[currentCanvasId];
    canvas.edges = canvas.edges.map((e) => (e.id === id ? { ...e, ...patch } : e));
    set({ project: { ...project }, dirty: true });
  },

  deleteEdge(id) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    get().pushHistory();
    const canvas = project.canvases[currentCanvasId];
    canvas.edges = canvas.edges.filter((e) => e.id !== id);
    set({ project: { ...project }, dirty: true });
  },

  deleteNode(id) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    get().pushHistory();
    const canvas = project.canvases[currentCanvasId];
    const node = canvas.nodes.find((n) => n.id === id);
    if (node?.data.childCanvasId) removeCanvasTree(project, node.data.childCanvasId);
    canvas.nodes = canvas.nodes.filter((n) => n.id !== id);
    canvas.edges = canvas.edges.filter((e) => e.source !== id && e.target !== id);
    set({ project: { ...project }, dirty: true, selectedNodeId: null, selectedNodeIds: [] });
  },

  deleteNodes(ids) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId || ids.length === 0) return;
    get().pushHistory();
    const canvas = project.canvases[currentCanvasId];
    const idSet = new Set(ids);
    for (const n of canvas.nodes) {
      if (idSet.has(n.id) && n.data.childCanvasId) removeCanvasTree(project, n.data.childCanvasId);
    }
    canvas.nodes = canvas.nodes.filter((n) => !idSet.has(n.id));
    canvas.edges = canvas.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target));
    set({ project: { ...project }, dirty: true, selectedNodeId: null, selectedNodeIds: [] });
  },

  duplicateNode(id) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    get().pushHistory();
    const canvas = project.canvases[currentCanvasId];
    const src = canvas.nodes.find((n) => n.id === id);
    if (!src) return;
    const copy: CanvasNode = {
      ...src,
      id: nanoid(10),
      position: { x: src.position.x + 40, y: src.position.y + 40 },
      data: { ...src.data, childCanvasId: undefined, title: src.data.title + " copy" },
      selected: false,
    };
    canvas.nodes = [...canvas.nodes, copy];
    set({ project: { ...project }, dirty: true, selectedNodeId: copy.id, selectedNodeIds: [copy.id] });
  },

  selectNode(id) { set({ selectedNodeId: id, selectedNodeIds: id ? [id] : [] }); },
  setSelectedNodeIds(ids) { set({ selectedNodeIds: ids, selectedNodeId: ids[0] ?? null }); },

  copySelection() {
    const { project, currentCanvasId, selectedNodeIds } = get();
    if (!project || !currentCanvasId || selectedNodeIds.length === 0) return;
    const canvas = project.canvases[currentCanvasId];
    const idSet = new Set(selectedNodeIds);
    const nodes = canvas.nodes.filter((n) => idSet.has(n.id));
    const edges = canvas.edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    set({ clipboard: { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) } });
  },

  cutSelection() {
    get().copySelection();
    get().deleteNodes(get().selectedNodeIds);
  },

  pasteClipboard(offset = { x: 24, y: 24 }) {
    const { project, currentCanvasId, clipboard } = get();
    if (!project || !currentCanvasId || !clipboard || clipboard.nodes.length === 0) return;
    get().pushHistory();
    const canvas = project.canvases[currentCanvasId];
    const idMap = new Map<string, string>();
    const newNodes: CanvasNode[] = clipboard.nodes.map((n) => {
      const nid = nanoid(10);
      idMap.set(n.id, nid);
      return {
        ...n,
        id: nid,
        position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
        data: { ...n.data, childCanvasId: undefined },
        selected: false,
      };
    });
    const newEdges: CanvasEdge[] = clipboard.edges
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((e) => ({ ...e, id: nanoid(10), source: idMap.get(e.source)!, target: idMap.get(e.target)! }));
    canvas.nodes = [...canvas.nodes, ...newNodes];
    canvas.edges = [...canvas.edges, ...newEdges];
    const newIds = newNodes.map((n) => n.id);
    set({ project: { ...project }, dirty: true, selectedNodeIds: newIds, selectedNodeId: newIds[0] ?? null });
  },

  selectAll() {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    const ids = project.canvases[currentCanvasId].nodes.map((n) => n.id);
    set({ selectedNodeIds: ids, selectedNodeId: ids[0] ?? null });
  },

  mergeIntoCurrentCanvas(raw, opts = {}) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    const r = raw as { canvases?: Record<string, Canvas>; rootCanvasId?: string };
    if (!r?.canvases || !r?.rootCanvasId) throw new Error("Not a CanvasOS file");
    get().pushHistory();
    const canvas = project.canvases[currentCanvasId];
    const idMap = new Map<string, string>();
    const map = (old?: string) => {
      if (!old) return undefined;
      let m = idMap.get(old);
      if (!m) { m = nanoid(10); idMap.set(old, m); }
      return m;
    };
    for (const c of Object.values(r.canvases)) {
      map(c.id);
      for (const n of c.nodes) map(n.id);
    }
    const remapped: Record<string, Canvas> = {};
    for (const [oldId, c] of Object.entries(r.canvases)) {
      const cid = map(oldId)!;
      remapped[cid] = {
        id: cid,
        name: c.name,
        parentCanvasId: map(c.parentCanvasId),
        parentNodeId: map(c.parentNodeId),
        nodes: c.nodes.map((n) => ({
          ...n,
          id: map(n.id)!,
          data: { ...n.data, childCanvasId: map(n.data.childCanvasId) },
        })),
        edges: c.edges.map((e) => ({ ...e, id: nanoid(10), source: map(e.source)!, target: map(e.target)! })),
      };
    }
    const importedRootId = map(r.rootCanvasId)!;
    const importedRoot = remapped[importedRootId];

    if (opts.overwrite) {
      canvas.nodes = importedRoot.nodes;
      canvas.edges = importedRoot.edges;
    } else {
      const offsetX = 60, offsetY = 60;
      canvas.nodes = [...canvas.nodes, ...importedRoot.nodes.map((n) => ({
        ...n, position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
      }))];
      canvas.edges = [...canvas.edges, ...importedRoot.edges];
    }
    for (const [cid, c] of Object.entries(remapped)) {
      if (cid === importedRootId) continue;
      project.canvases[cid] = c;
    }
    set({ project: { ...project }, dirty: true });
  },

  enterNode(id) {
    const { project, currentCanvasId } = get();
    if (!project || !currentCanvasId) return;
    const canvas = project.canvases[currentCanvasId];
    const node = canvas.nodes.find((n) => n.id === id);
    if (!node) return;
    let childId = node.data.childCanvasId;
    if (!childId) {
      childId = nanoid(10);
      const child: Canvas = {
        id: childId, name: node.data.title,
        parentCanvasId: currentCanvasId, parentNodeId: id,
        nodes: [], edges: [],
      };
      project.canvases[childId] = child;
      canvas.nodes = canvas.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, childCanvasId: childId } } : n,
      );
      set({ project: { ...project }, dirty: true });
    }
    get().openCanvas(childId);
  },

  renameProject(name) {
    const { project } = get();
    if (!project) return;
    project.name = name;
    set({ project: { ...project }, dirty: true });
  },

  markDirty() { set({ dirty: true }); },

  async save() {
    const { project, dirty } = get();
    if (!project || !dirty) return;
    set({ saving: true });
    gcEmptyChildCanvases(project, get().currentCanvasId ? [get().currentCanvasId!] : []);
    project.updatedAt = now();
    project.checksum = await checksum({
      canvases: project.canvases, rootCanvasId: project.rootCanvasId,
    });
    await saveProject(project);
    set({ saving: false, dirty: false, lastSavedAt: project.updatedAt });
  },

  async snapshot(description) {
    const { project } = get();
    if (!project) return;
    const snap: Version = {
      id: nanoid(8),
      createdAt: now(),
      description: description ?? "Snapshot",
      nodeCount: Object.values(project.canvases).reduce((a, c) => a + c.nodes.length, 0),
      canvasCount: Object.keys(project.canvases).length,
      snapshot: JSON.parse(JSON.stringify({
        rootCanvasId: project.rootCanvasId,
        canvases: project.canvases,
      })),
    };
    project.versions = [snap, ...project.versions].slice(0, 100);
    project.versionId = snap.id;
    set({ project: { ...project }, dirty: true });
    await get().save();
  },

  async restoreVersion(versionId) {
    const { project } = get();
    if (!project) return;
    const v = project.versions.find((x) => x.id === versionId);
    if (!v) return;
    await get().snapshot(`Auto: before restore of ${new Date(v.createdAt).toLocaleString()}`);
    const cur = get().project!;
    cur.canvases = JSON.parse(JSON.stringify(v.snapshot.canvases));
    cur.rootCanvasId = v.snapshot.rootCanvasId;
    set({ project: { ...cur }, currentCanvasId: cur.rootCanvasId, dirty: true });
    await get().save();
    get().openCanvas(cur.rootCanvasId);
  },

  async deleteVersion(versionId) {
    const { project } = get();
    if (!project) return;
    project.versions = project.versions.filter((v) => v.id !== versionId);
    set({ project: { ...project }, dirty: true });
    await get().save();
  },

  async updateVersion(versionId, patch) {
    const { project } = get();
    if (!project) return;
    project.versions = project.versions.map((v) =>
      v.id === versionId ? { ...v, ...patch } : v,
    );
    set({ project: { ...project }, dirty: true });
    await get().save();
  },

  async duplicateVersion(versionId) {
    const { project } = get();
    if (!project) return;
    const v = project.versions.find((x) => x.id === versionId);
    if (!v) return;
    const copy = {
      ...JSON.parse(JSON.stringify(v)),
      id: nanoid(8),
      createdAt: now(),
      description: v.description + " (copy)",
    };
    project.versions = [copy, ...project.versions].slice(0, 100);
    set({ project: { ...project }, dirty: true });
    await get().save();
  },
}));

function removeCanvasTree(project: Project, canvasId: string) {
  const c = project.canvases[canvasId];
  if (!c) return;
  for (const n of c.nodes) {
    if (n.data.childCanvasId) removeCanvasTree(project, n.data.childCanvasId);
  }
  delete project.canvases[canvasId];
}

function labelFor(kind: string) {
  const map: Record<string, string> = {
    database: "Database", api: "API", frontend: "Frontend", backend: "Backend",
    website: "Website", discord: "Discord Bot", queue: "Queue", cache: "Cache",
    webhook: "Webhook", auth: "Auth", ai: "AI Service", storage: "Storage",
    rectangle: "Block", circle: "Node", diamond: "Decision", custom: "Custom",
    note: "Note", todo: "To-do", image: "Image", link: "Link", code: "Code",
    markdown: "Markdown", terminal: "Terminal", cdn: "CDN",
    loadbalancer: "Load Balancer", analytics: "Analytics", email: "Email",
    payment: "Payment", mobile: "Mobile App", iot: "IoT Device", mlmodel: "ML Model",
    "vector-db": "Vector DB", cron: "Cron Job", secret: "Secret", monitoring: "Monitoring",
    kanban: "Kanban",
  };
  return map[kind] ?? "Node";
}
