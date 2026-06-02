import { openDB, type IDBPDatabase } from "idb";
import type { Project, Settings } from "./types";

const DB_NAME = "canvasos";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB unavailable (SSR)");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(p: Project) {
  const db = await getDB();
  await db.put("projects", p);
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get("projects", id);
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDB();
  const all = (await db.getAll("projects")) as Project[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string) {
  const db = await getDB();
  await db.delete("projects", id);
}

export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const s = (await db.get("kv", "settings")) as Settings | undefined;
  return (
    s ?? { theme: "light", snapPx: 16, autosaveSec: 10 }
  );
}

export async function saveSettings(s: Settings) {
  const db = await getDB();
  await db.put("kv", s, "settings");
}

export async function checksum(input: unknown): Promise<string> {
  const text = JSON.stringify(input);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h.toString(16);
}