import { ChevronRight, Home } from "lucide-react";
import { useStore } from "@/lib/store";

export function Breadcrumbs() {
  const crumbs = useStore((s) => s.breadcrumbs);
  const openCanvas = useStore((s) => s.openCanvas);
  const goRoot = useStore((s) => s.goRoot);

  return (
    <nav className="flex items-center gap-1 text-sm font-mono">
      <button
        onClick={goRoot}
        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
        title="Root canvas"
      >
        <Home className="w-3.5 h-3.5" />
      </button>
      {crumbs.map((c, i) => (
        <div key={c.canvasId} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <button
            onClick={() => openCanvas(c.canvasId)}
            className={`px-1.5 py-0.5 rounded hover:bg-secondary truncate max-w-[200px] ${
              i === crumbs.length - 1 ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
          >
            {c.label}
          </button>
        </div>
      ))}
    </nav>
  );
}