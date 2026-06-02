import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { CanvasNodeData } from "@/lib/types";
import { KIND_META } from "./node-kinds";
import { useStore } from "@/lib/store";
import { descendantStats } from "@/lib/project-utils";
import { Layers, CornerDownRight } from "lucide-react";

function CanvasNodeViewBase({ id, data, selected }: NodeProps<CanvasNodeData>) {
  const meta = KIND_META[data.kind] ?? KIND_META.custom;
  const enterNode = useStore((s) => s.enterNode);
  const stats = useStore((s) => {
    if (!s.project) return { nodes: 0, canvases: 0 };
    return descendantStats(s.project, data.childCanvasId);
  });
  const hasChild = stats.nodes > 0;

  return (
    <div
      className={`canvas-node ${selected ? "selected" : ""} group`}
      style={{
        borderTopColor: data.color || meta.accent,
        borderTopWidth: 3,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {data.image?.src && (
        <div
          className="w-full overflow-hidden rounded-t-[var(--radius)]"
          style={{ height: data.image.height ?? 96 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image.src}
            alt={data.title}
            className="w-full h-full"
            style={{ objectFit: (data.image.fit === "auto" ? "contain" : data.image.fit) || "cover" }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <span
          className="font-mono text-[11px] tracking-wider uppercase opacity-70"
          style={{ color: data.color || meta.accent }}
        >
          {meta.icon} {meta.label}
        </span>
        {data.status && data.status !== "idea" && (
          <span className="ml-auto text-[10px] font-mono uppercase opacity-60 border border-current rounded px-1 py-px">
            {data.status}
          </span>
        )}
      </div>

      <div className="px-3 pb-2">
        <div className="font-display text-[17px] leading-tight">{data.title}</div>
        {data.description && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {data.description}
          </div>
        )}
      </div>

      {(data.tags?.length || hasChild) && (
        <div className="flex items-center gap-1.5 px-3 pb-2 pt-1 border-t border-border/60">
          {data.tags?.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] font-mono px-1.5 py-px rounded bg-secondary text-muted-foreground">
              #{t}
            </span>
          ))}
          {hasChild && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground" title={`${stats.nodes} nested nodes across ${stats.canvases} canvases`}>
              <Layers className="w-3 h-3" />
              {stats.nodes} nested
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); enterNode(id); }}
        className="absolute -bottom-2.5 right-3 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-foreground text-background px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Open nested canvas (double-click)"
      >
        <CornerDownRight className="w-3 h-3" />
        Open
      </button>
    </div>
  );
}

export const CanvasNodeView = memo(CanvasNodeViewBase);
