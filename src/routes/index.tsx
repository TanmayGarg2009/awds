import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers, Database, GitBranch, Cpu } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CanvasOS — Infinite visual architecture for developers" },
      { name: "description", content: "An infinite, nestable canvas for architecting software. Diagram, document, and version anything — your data stays in your browser." },
      { property: "og:title", content: "CanvasOS" },
      { property: "og:description", content: "Infinite visual architecture, with version history and local-first storage." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground paper-grid">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border bg-background/80 backdrop-blur">
        <div className="font-display text-2xl leading-none">
          Canvas<span className="text-accent">OS</span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-mono">
          <a href="#features" className="text-muted-foreground hover:text-foreground">features</a>
          <a href="#principles" className="text-muted-foreground hover:text-foreground">principles</a>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded hover:opacity-90"
          >
            Open editor <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      <section className="px-8 pt-24 pb-32 max-w-6xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Local-first · Infinite canvas · v0.1
        </p>
        <h1 className="font-display text-6xl md:text-8xl leading-[0.95] tracking-tight max-w-4xl">
          The canvas where your<br />
          <span className="text-accent italic">architecture</span> lives.
        </h1>
        <p className="mt-8 text-lg text-muted-foreground max-w-xl">
          CanvasOS is an infinite, nestable canvas for the way technical teams actually
          think. Every node can open into another full canvas. Forever.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 rounded hover:opacity-90 font-mono text-sm uppercase tracking-wider"
          >
            Launch the editor <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            No account · No upload · IndexedDB only
          </span>
        </div>
      </section>

      <section id="features" className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-8 py-20 grid md:grid-cols-2 gap-10">
          <Feature
            icon={<Layers className="w-5 h-5" />}
            kicker="01 — Nested canvases"
            title="Open any node into its own world."
            body="Project → Backend → API → Webhook. Drill in, breadcrumb out. No depth limit."
          />
          <Feature
            icon={<GitBranch className="w-5 h-5" />}
            kicker="02 — Versioned"
            title="Snapshots you can roll back."
            body="A git-inspired history per project. Restore is non-destructive — your current state is snapshotted first."
          />
          <Feature
            icon={<Database className="w-5 h-5" />}
            kicker="03 — Local-first"
            title="Your data never leaves the browser."
            body="IndexedDB is the source of truth. Auto-save on edit, every 10 seconds, on tab close, and on refresh."
          />
          <Feature
            icon={<Cpu className="w-5 h-5" />}
            kicker="04 — Developer-shaped"
            title="Nodes for databases, APIs, queues, caches, bots."
            body="Pre-built node kinds for software systems. Add markdown notes, tags, status, and a colour to every one."
          />
        </div>
      </section>

      <section id="principles" className="border-t border-border">
        <div className="max-w-3xl mx-auto px-8 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Principles</p>
          <ol className="space-y-6 font-display text-3xl leading-tight">
            <li><span className="text-accent">i.</span> Your work belongs to you.</li>
            <li><span className="text-accent">ii.</span> A diagram is a thinking tool, not an artifact.</li>
            <li><span className="text-accent">iii.</span> Depth beats breadth — nest, don't sprawl.</li>
            <li><span className="text-accent">iv.</span> Nothing is ever silently overwritten.</li>
          </ol>
        </div>
      </section>

      <footer className="border-t border-border px-8 py-6 flex items-center justify-between text-xs font-mono text-muted-foreground">
        <span>CanvasOS · made for the people who draw boxes for a living.</span>
        <Link to="/app" className="hover:text-foreground">open editor →</Link>
      </footer>
    </div>
  );
}

function Feature({
  icon, kicker, title, body,
}: { icon: React.ReactNode; kicker: string; title: string; body: string }) {
  return (
    <div className="border border-border bg-background rounded-lg p-6 hover:border-foreground transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="font-mono text-xs uppercase tracking-wider">{kicker}</span>
      </div>
      <h3 className="font-display text-2xl mt-3">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
