import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap,
  addEdge, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type EdgeChange, type NodeChange, type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { useStore } from "@/lib/store";
import { CanvasNodeView } from "./CanvasNodeView";
import { KIND_META, ALL_KINDS } from "./node-kinds";
import type { NodeKind } from "@/lib/types";

const nodeTypes = { canvas: CanvasNodeView };

interface ContextMenuState {
  x: number; y: number;
  kind: "pane" | "node" | "edge";
  targetId?: string;
  flowPos?: { x: number; y: number };
}

export function CanvasEditor() {
  const project = useStore((s) => s.project);
  const currentCanvasId = useStore((s) => s.currentCanvasId);
  const setNodes = useStore((s) => s.setNodes);
  const setEdges = useStore((s) => s.setEdges);
  const selectNode = useStore((s) => s.selectNode);
  const enterNode = useStore((s) => s.enterNode);
  const deleteNode = useStore((s) => s.deleteNode);
  const deleteNodes = useStore((s) => s.deleteNodes);
  const duplicateNode = useStore((s) => s.duplicateNode);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);
  const copy = useStore((s) => s.copySelection);
  const cut = useStore((s) => s.cutSelection);
  const paste = useStore((s) => s.pasteClipboard);
  const selectAll = useStore((s) => s.selectAll);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const addNode = useStore((s) => s.addNode);
  const updateEdge = useStore((s) => s.updateEdge);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const updateNodes = useStore((s) => s.updateNodes);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);

  const canvas = project && currentCanvasId ? project.canvases[currentCanvasId] : null;

  const nodes = useMemo(
    () => (canvas?.nodes ?? []).map((n) => ({ ...n, selected: selectedNodeIds.includes(n.id) })),
    [canvas?.nodes, selectedNodeIds],
  );
  const edges = useMemo(
    () => (canvas?.edges ?? []).map((e) => ({ ...e, type: e.type ?? "smoothstep" })),
    [canvas?.edges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges],
  );
  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges(addEdge({ ...conn, animated: false, type: "smoothstep" }, edges)),
    [edges, setEdges],
  );

  const onSelectionChange = useCallback(
    ({ nodes: sel }: { nodes: Node[]; edges: Edge[] }) => {
      const ids = sel.map((n) => n.id);
      // Avoid feedback loop
      const current = selectedNodeIds;
      if (ids.length === current.length && ids.every((id, i) => id === current[i])) return;
      setSelectedNodeIds(ids);
    },
    [selectedNodeIds, setSelectedNodeIds],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); selectAll(); return; }
      if (mod && e.key.toLowerCase() === "c") { e.preventDefault(); copy(); return; }
      if (mod && e.key.toLowerCase() === "x") { e.preventDefault(); cut(); return; }
      if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); paste(); return; }
      if (!selectedNodeId && selectedNodeIds.length === 0) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedNodeIds.length > 1) deleteNodes(selectedNodeIds);
        else if (selectedNodeId) deleteNode(selectedNodeId);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedNodeId) duplicateNode(selectedNodeId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedNodeId) enterNode(selectedNodeId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedNodeId, selectedNodeIds, deleteNode, deleteNodes, duplicateNode, enterNode, undo, redo, selectAll, copy, cut, paste]);

  const openMenu = (e: React.MouseEvent, partial: Omit<ContextMenuState, "x" | "y">) => {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0);
    const y = e.clientY - (rect?.top ?? 0);
    let flowPos;
    if (rfInstance && partial.kind === "pane") {
      flowPos = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    }
    setMenu({ ...partial, x, y, flowPos });
  };

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  if (!canvas) {
    return <div className="w-full h-full grid place-items-center text-muted-foreground">No canvas</div>;
  }

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onSelectionChange={onSelectionChange}
        onNodeClick={(_, n) => {
          // single click -> single select unless multi-select modifier already held by RF
          if (!selectedNodeIds.includes(n.id) || selectedNodeIds.length > 1) selectNode(n.id);
        }}
        onNodeDoubleClick={(_, n) => enterNode(n.id)}
        onNodeContextMenu={(e, n) => { selectNode(n.id); openMenu(e, { kind: "node", targetId: n.id }); }}
        onEdgeContextMenu={(e, ed) => openMenu(e, { kind: "edge", targetId: ed.id })}
        onPaneContextMenu={(e) => openMenu(e as any, { kind: "pane" })}
        onEdgeDoubleClick={(_, ed) => {
          const label = prompt("Edge label", String(ed.label ?? "")) ?? undefined;
          if (label !== undefined) updateEdge(ed.id, { label });
        }}
        onEdgeClick={(e, ed) => {
          if (e.ctrlKey || e.metaKey) {
            const nextType = ed.type === "step" ? "smoothstep" : "step";
            updateEdge(ed.id, { type: nextType });
          }
        }}
        onPaneClick={() => selectNode(null)}
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        selectionOnDrag
        selectionKeyCode={null}
        multiSelectionKeyCode={["Meta", "Shift", "Control"]}
        deleteKeyCode={null}
        panOnDrag={[1, 2]}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="var(--grid-dot)" />
        <MiniMap
          pannable zoomable
          maskColor="oklch(from var(--foreground) l c h / 0.08)"
          style={{ background: "var(--card)" }}
          nodeColor={(n) => {
            const data = n.data as any;
            const meta = data?.kind ? KIND_META[data.kind as NodeKind] : null;
            return data?.color || meta?.accent || "var(--foreground)";
          }}
          nodeStrokeColor="var(--border)"
          nodeStrokeWidth={2}
          nodeBorderRadius={3}
        />
        <Controls showInteractive={false} />
      </ReactFlow>

      {menu && (
        <ContextMenu
          state={menu}
          onClose={() => setMenu(null)}
          onAddNode={(kind) => {
            if (menu.kind !== "pane") return;
            addNode({ kind }, menu.flowPos);
          }}
          onAction={(action) => {
            const id = menu.targetId;
            if (menu.kind === "node" && id) {
              if (action === "duplicate") duplicateNode(id);
              else if (action === "delete") {
                if (selectedNodeIds.length > 1 && selectedNodeIds.includes(id)) deleteNodes(selectedNodeIds);
                else deleteNode(id);
              }
              else if (action === "copy") copy();
              else if (action === "cut") cut();
              else if (action === "open") enterNode(id);
              else if (action === "rename") {
                const node = canvas.nodes.find((n) => n.id === id);
                const t = prompt("Rename node", node?.data.title ?? "");
                if (t != null && t.trim()) useStore.getState().updateNode(id, { title: t.trim() });
              }
            } else if (menu.kind === "edge" && id) {
              if (action === "delete") deleteEdge(id);
              else if (action === "rename") {
                const ed = canvas.edges.find((e) => e.id === id);
                const label = prompt("Edge label", String(ed?.label ?? ""));
                if (label != null) updateEdge(id, { label });
              } else if (action === "curve") updateEdge(id, { type: "smoothstep" });
              else if (action === "straight") updateEdge(id, { type: "step" });
              else if (action === "bezier") updateEdge(id, { type: "default" });
            } else if (menu.kind === "pane") {
              if (action === "paste") paste();
              else if (action === "selectAll") selectAll();
              else if (action === "fitView") rfInstance?.fitView({ duration: 200 });
            }
          }}
        />
      )}
    </div>
  );
}

function ContextMenu({
  state, onClose, onAddNode, onAction,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onAddNode: (k: NodeKind) => void;
  onAction: (a: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const items: { label: string; action: string; danger?: boolean; sub?: boolean }[] =
    state.kind === "node"
      ? [
          { label: "Open nested", action: "open" },
          { label: "Rename", action: "rename" },
          { label: "Duplicate  ⌘D", action: "duplicate" },
          { label: "Copy  ⌘C", action: "copy" },
          { label: "Cut  ⌘X", action: "cut" },
          { label: "Delete  ⌫", action: "delete", danger: true },
        ]
      : state.kind === "edge"
      ? [
          { label: "Rename label", action: "rename" },
          { label: "Curve (smooth)", action: "curve" },
          { label: "Bezier", action: "bezier" },
          { label: "Straight (cuts)", action: "straight" },
          { label: "Delete edge", action: "delete", danger: true },
        ]
      : [
          { label: "Add node…", action: "__add", sub: true },
          { label: "Paste  ⌘V", action: "paste" },
          { label: "Select all  ⌘A", action: "selectAll" },
          { label: "Fit view", action: "fitView" },
        ];

  return (
    <div
      className="absolute z-50 min-w-[180px] bg-popover border border-border rounded shadow-lg text-sm"
      style={{ left: state.x, top: state.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it) => (
        <div key={it.label} className="relative">
          <button
            onClick={() => {
              if (it.sub) { setAddOpen((v) => !v); return; }
              onAction(it.action);
              onClose();
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-secondary ${it.danger ? "text-destructive" : ""}`}
          >
            {it.label}{it.sub ? " ▸" : ""}
          </button>
          {it.sub && addOpen && (
            <div className="absolute left-full top-0 ml-1 min-w-[160px] max-h-[300px] overflow-auto bg-popover border border-border rounded shadow-lg grid grid-cols-2">
              {ALL_KINDS.map((k) => {
                const m = KIND_META[k];
                return (
                  <button
                    key={k}
                    onClick={() => { onAddNode(k); onClose(); }}
                    className="text-left px-2 py-1.5 hover:bg-secondary text-xs flex items-center gap-1.5"
                  >
                    <span style={{ color: m.accent }}>{m.icon}</span>
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
