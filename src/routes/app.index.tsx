import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { deleteProject, listProjects, saveProject } from "@/lib/db";
import { newProject } from "@/lib/store";
import { reIdProject } from "@/lib/project-utils";
import type { Project } from "@/lib/types";
import { Plus, Trash2, ArrowRight, Upload } from "lucide-react";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "CanvasOS — Projects" }] }),
  component: ProjectList,
});

function ProjectList() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    listProjects().then(setProjects);
  }, []);

  async function create() {
    const name = prompt("Project name", "New Project")?.trim();
    if (!name) return;
    const p = newProject(name);
    await saveProject(p);
    navigate({ to: "/app/$projectId", params: { projectId: p.id } });
  }

  async function remove(id: string) {
    if (!confirm("Delete this project? This cannot be undone (it's only in your browser).")) return;
    await deleteProject(id);
    setProjects((ps) => ps?.filter((p) => p.id !== id) ?? null);
  }

  async function importFile(file: File) {
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      if (!raw.canvases || !raw.rootCanvasId) throw new Error("Not a CanvasOS file");
      const fresh = reIdProject(raw);
      await saveProject(fresh);
      navigate({ to: "/app/$projectId", params: { projectId: fresh.id } });
    } catch (e) {
      alert("Invalid CanvasOS file: " + (e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <Link to="/" className="font-display text-2xl leading-none">
          Canvas<span className="text-accent">OS</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 rounded text-sm font-mono uppercase tracking-wider hover:bg-secondary"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={create}
            className="inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded text-sm font-mono uppercase tracking-wider hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> New project
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="font-display text-4xl mb-1">Your projects</h1>
        <p className="text-sm text-muted-foreground mb-10 font-mono">
          Stored locally in IndexedDB · {projects?.length ?? "…"} project{projects?.length === 1 ? "" : "s"}
        </p>

        {projects === null ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-16 text-center">
            <p className="font-display text-2xl mb-2">Start with an empty canvas.</p>
            <p className="text-sm text-muted-foreground mb-6">
              Your first project lives only in your browser. You can export it any time.
            </p>
            <button
              onClick={create}
              className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded text-sm font-mono uppercase tracking-wider hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Create project
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
            {projects.map((p) => {
              const nodes = Object.values(p.canvases).reduce((a, c) => a + c.nodes.length, 0);
              return (
                <li key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/40 group">
                  <div className="flex-1 min-w-0">
                    <Link
                      to="/app/$projectId"
                      params={{ projectId: p.id }}
                      className="font-display text-xl truncate block hover:text-accent"
                    >
                      {p.name}
                    </Link>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      {nodes} nodes · {Object.keys(p.canvases).length} canvases · updated {new Date(p.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded border border-border hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link
                    to="/app/$projectId"
                    params={{ projectId: p.id }}
                    className="p-2 rounded border border-border hover:border-foreground"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}