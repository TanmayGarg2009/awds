import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { loadProject } from "@/lib/db";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { Topbar } from "@/components/canvas/Topbar";
import { Inspector } from "@/components/canvas/Inspector";
import { Palette } from "@/components/canvas/Palette";
import { VersionPanel } from "@/components/canvas/VersionPanel";

export const Route = createFileRoute("/app/$projectId")({
  head: () => ({ meta: [{ title: "CanvasOS — Editor" }] }),
  component: EditorPage,
});

function EditorPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const setProject = useStore((s) => s.setProject);
  const project = useStore((s) => s.project);
  const save = useStore((s) => s.save);
  const dirty = useStore((s) => s.dirty);

  const [mounted, setMounted] = useState(false);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<"inspector" | "history">("inspector");
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Load on mount
  useEffect(() => {
    setMounted(true);
    loadProject(projectId).then((p) => {
      if (!p) { setMissing(true); return; }
      setProject(p);
    });
  }, [projectId, setProject]);

  // Auto-save: debounce on change + every 10s + on unload + on visibility hidden
  useEffect(() => {
    if (!mounted) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    if (dirty) {
      t = setTimeout(() => { save(); }, 800);
    }
    return () => { if (t) clearTimeout(t); };
  }, [dirty, mounted, save]);

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => { if (dirtyRef.current) save(); }, 10_000);
    const onUnload = () => { if (dirtyRef.current) save(); };
    const onVis = () => { if (document.visibilityState === "hidden" && dirtyRef.current) save(); };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mounted, save]);

  if (!mounted) {
    return <div className="h-screen w-screen grid place-items-center text-muted-foreground">Loading canvas…</div>;
  }
  if (missing) {
    return (
      <div className="h-screen w-screen grid place-items-center bg-background">
        <div className="text-center">
          <p className="font-display text-2xl mb-2">Project not found</p>
          <p className="text-sm text-muted-foreground mb-4">It may have been deleted from this browser.</p>
          <button
            onClick={() => navigate({ to: "/app" })}
            className="bg-foreground text-background px-3 py-1.5 rounded text-sm font-mono uppercase"
          >
            Back to projects
          </button>
        </div>
      </div>
    );
  }
  if (!project) {
    return <div className="h-screen w-screen grid place-items-center text-muted-foreground">Opening…</div>;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <Topbar />
      <div className="flex-1 flex min-h-0">
        <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
          <Palette />
          <div className="flex-1 overflow-auto">
            <VersionPanel />
          </div>
        </aside>

        <main className="flex-1 relative min-w-0">
          <CanvasEditor />
        </main>

        <aside className="w-80 border-l border-border bg-sidebar flex flex-col">
          <div className="flex border-b border-border">
            <TabBtn active={tab === "inspector"} onClick={() => setTab("inspector")}>Inspector</TabBtn>
            <TabBtn active={tab === "history"} onClick={() => setTab("history")}>About</TabBtn>
          </div>
          <div className="flex-1 overflow-auto">
            {tab === "inspector" ? <Inspector /> : <AboutPanel />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 text-xs font-mono uppercase tracking-wider ${
        active ? "text-foreground border-b-2 border-accent -mb-px" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function AboutPanel() {
  const project = useStore((s) => s.project);
  if (!project) return null;
  const totalNodes = Object.values(project.canvases).reduce((a, c) => a + c.nodes.length, 0);
  return (
    <div className="p-4 space-y-4 text-sm">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Project</div>
        <div className="font-display text-xl mt-1">{project.name}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <Stat label="Canvases" value={Object.keys(project.canvases).length} />
        <Stat label="Nodes" value={totalNodes} />
        <Stat label="Versions" value={project.versions.length} />
        <Stat label="Edges" value={Object.values(project.canvases).reduce((a, c) => a + c.edges.length, 0)} />
      </div>
      <div className="text-xs text-muted-foreground">
        Created {new Date(project.createdAt).toLocaleString()}<br />
        Updated {new Date(project.updatedAt).toLocaleString()}
      </div>
      <div className="text-[11px] font-mono text-muted-foreground border-t border-border pt-3">
        Checksum<br />
        <span className="text-foreground">{project.checksum || "—"}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border rounded p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-display">{value}</div>
    </div>
  );
}