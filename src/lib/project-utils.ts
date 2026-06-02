import { nanoid } from "nanoid";
import type { Block, Canvas, CanvasNodeData, Project } from "./types";

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

/**
 * Returns a new Project with every internal ID regenerated.
 * Guarantees full isolation from `orig` — no shared object refs, no shared IDs.
 *
 * Used on import so that deleting the source project (or editing it) can never
 * affect the imported copy.
 */
export function reIdProject(
  orig: Project,
  opts: { newName?: string } = {},
): Project {
  const p = deepClone(orig);

  const remapCanvases = (canvases: Record<string, Canvas>) => {
    const idMap = new Map<string, string>();
    const map = <T extends string | undefined>(old: T): T => {
      if (!old) return old;
      let m = idMap.get(old);
      if (!m) {
        m = nanoid(10);
        idMap.set(old, m);
      }
      return m as T;
    };
    // Pre-seed every existing id so cross-refs resolve consistently
    for (const c of Object.values(canvases)) {
      map(c.id);
      for (const n of c.nodes) map(n.id);
    }
    const out: Record<string, Canvas> = {};
    for (const [oldId, c] of Object.entries(canvases)) {
      const cid = map(oldId);
      out[cid] = {
        id: cid,
        name: c.name,
        parentCanvasId: map(c.parentCanvasId),
        parentNodeId: map(c.parentNodeId),
        nodes: c.nodes.map((n) => ({
          ...n,
          id: map(n.id),
          data: {
            ...n.data,
            childCanvasId: map(n.data.childCanvasId),
          },
        })),
        edges: c.edges.map((e) => ({
          ...e,
          id: nanoid(10),
          source: map(e.source),
          target: map(e.target),
        })),
      };
    }
    return { canvases: out, map };
  };

  const { canvases, map: rootMap } = remapCanvases(p.canvases);
  const rootCanvasId = rootMap(p.rootCanvasId);

  const versions = (p.versions ?? []).map((v) => {
    const remapped = remapCanvases(v.snapshot.canvases);
    return {
      ...v,
      id: nanoid(8),
      snapshot: {
        rootCanvasId: remapped.map(v.snapshot.rootCanvasId),
        canvases: remapped.canvases,
      },
    };
  });

  return {
    ...p,
    id: nanoid(12),
    name: opts.newName ?? `${p.name} (imported)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versionId: nanoid(8),
    rootCanvasId,
    canvases,
    versions,
  };
}

/** Approx serialized size in bytes (for display in Version History). */
export function approxSize(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return JSON.stringify(obj).length;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Garbage-collect empty child canvases.
 * Removes any non-root canvas with zero nodes and clears the parent node's
 * childCanvasId pointer. `protectIds` are skipped (e.g. the canvas the user
 * is currently viewing — they may be about to add nodes).
 */
export function gcEmptyChildCanvases(project: Project, protectIds: string[] = []) {
  const protect = new Set(protectIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of Object.values(project.canvases)) {
      if (c.id === project.rootCanvasId) continue;
      if (protect.has(c.id)) continue;
      if (c.nodes.length > 0) continue;
      if (c.parentCanvasId && c.parentNodeId) {
        const pc = project.canvases[c.parentCanvasId];
        if (pc) {
          pc.nodes = pc.nodes.map((n) =>
            n.id === c.parentNodeId
              ? { ...n, data: { ...n.data, childCanvasId: undefined } }
              : n,
          );
        }
      }
      delete project.canvases[c.id];
      changed = true;
    }
  }
}

/** True when this node has a child canvas with at least one node. */
export function nodeHasChildContent(
  project: Project,
  childCanvasId?: string,
): boolean {
  if (!childCanvasId) return false;
  const c = project.canvases[childCanvasId];
  return !!c && c.nodes.length > 0;
}

/** Recursive count of all descendant nodes/canvases under a given canvas id. */
export function descendantStats(
  project: Project,
  canvasId?: string,
): { nodes: number; canvases: number } {
  if (!canvasId) return { nodes: 0, canvases: 0 };
  const c = project.canvases[canvasId];
  if (!c) return { nodes: 0, canvases: 0 };
  let nodes = c.nodes.length;
  let canvases = 1;
  for (const n of c.nodes) {
    if (n.data.childCanvasId) {
      const s = descendantStats(project, n.data.childCanvasId);
      nodes += s.nodes;
      canvases += s.canvases;
    }
  }
  return { nodes, canvases };
}

/** Migrate legacy notes string into a single paragraph block, idempotent. */
export function ensureBlocks(data: CanvasNodeData): Block[] {
  if (data.blocks && data.blocks.length) return data.blocks;
  if (data.notes && data.notes.trim()) {
    return [{ id: "b1", kind: "p", text: data.notes }];
  }
  return [];
}