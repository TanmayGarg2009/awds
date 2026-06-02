import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "@/lib/db";
import type { Settings } from "@/lib/types";
import { applyTheme } from "@/components/canvas/Topbar";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "CanvasOS — Settings" }] }),
  component: SettingsPage,
});

const THEMES: Settings["theme"][] = ["light", "dark", "amoled", "dracula", "nord"];

function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { getSettings().then(setS); }, []);
  if (!s) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
    if (patch.theme) {
      applyTheme(patch.theme);
      try { localStorage.setItem("canvasos-theme", patch.theme); } catch {}
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Link to="/app" className="p-1.5 rounded border border-border hover:bg-secondary"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="font-display text-2xl">Settings</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <section>
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Theme</h2>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button key={t} onClick={() => update({ theme: t })}
                className={`px-3 py-1.5 rounded border text-xs font-mono uppercase ${s.theme === t ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>
                {t}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Editor</h2>
          <label className="flex items-center justify-between border border-border rounded p-3">
            <span className="text-sm">Snap-to-grid (px)</span>
            <input type="number" value={s.snapPx} min={4} max={64}
              onChange={(e) => update({ snapPx: +e.target.value || 16 })}
              className="w-20 bg-secondary/50 rounded px-2 py-1 text-sm" />
          </label>
          <label className="flex items-center justify-between border border-border rounded p-3 mt-2">
            <span className="text-sm">Autosave interval (s)</span>
            <input type="number" value={s.autosaveSec} min={2} max={120}
              onChange={(e) => update({ autosaveSec: +e.target.value || 10 })}
              className="w-20 bg-secondary/50 rounded px-2 py-1 text-sm" />
          </label>
        </section>
        <section>
          <h2 className="text-xs font-mono uppercase tracking-wider text-destructive mb-3">Danger zone</h2>
          <button
            onClick={async () => {
              if (!confirm("Clear all local CanvasOS data? This deletes every project in this browser.")) return;
              indexedDB.deleteDatabase("canvasos");
              try { localStorage.removeItem("canvasos-theme"); } catch {}
              location.href = "/app";
            }}
            className="border border-destructive text-destructive px-3 py-2 rounded text-xs font-mono uppercase hover:bg-destructive hover:text-destructive-foreground"
          >Wipe local data</button>
        </section>
      </main>
    </div>
  );
}
