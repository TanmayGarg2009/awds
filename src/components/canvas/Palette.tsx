import { useStore } from "@/lib/store";
import { ALL_KINDS, KIND_META } from "./node-kinds";

export function Palette() {
  const addNode = useStore((s) => s.addNode);

  return (
    <div className="p-3 border-b border-border">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 px-1">
        Add node
      </div>
      <div className="grid grid-cols-4 gap-1">
        {ALL_KINDS.map((kind) => {
          const m = KIND_META[kind];
          return (
            <button
              key={kind}
              onClick={() => addNode({ kind })}
              title={m.label}
              className="aspect-square rounded border border-border hover:border-foreground hover:bg-secondary flex flex-col items-center justify-center gap-0.5 group transition-colors"
            >
              <span className="text-base" style={{ color: m.accent }}>{m.icon}</span>
              <span className="text-[9px] font-mono text-muted-foreground group-hover:text-foreground truncate w-full text-center px-0.5">
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}