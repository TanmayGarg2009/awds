import type { Edge, Node } from "reactflow";

export type NodeKind =
  | "rectangle" | "circle" | "diamond"
  | "database" | "api" | "frontend" | "backend" | "website"
  | "discord" | "queue" | "cache" | "webhook"
  | "auth" | "ai" | "storage" | "custom"
  | "note" | "todo" | "image" | "link" | "code" | "markdown"
  | "terminal" | "cdn" | "loadbalancer" | "analytics" | "email"
  | "payment" | "mobile" | "iot" | "mlmodel" | "vector-db"
  | "cron" | "secret" | "monitoring" | "kanban";

export type NodeStatus = "idea" | "todo" | "in-progress" | "done" | "blocked";

export type BlockKind = "h1" | "h2" | "h3" | "p" | "code" | "todo" | "list" | "quote" | "divider" | "link";
export interface Block {
  id: string;
  kind: BlockKind;
  text: string;
  checked?: boolean;
  href?: string;
  lang?: string;
}

export interface NodeImage {
  src: string; // data URL or http(s)
  fit?: "cover" | "contain" | "auto";
  height?: number; // px
}

export interface CanvasNodeData {
  title: string;
  description?: string;
  notes?: string; // legacy markdown — migrated to blocks on read
  blocks?: Block[];
  image?: NodeImage;
  kind: NodeKind;
  color?: string;
  status?: NodeStatus;
  tags?: string[];
  childCanvasId?: string;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

export type CanvasNode = Node<CanvasNodeData>;
export type CanvasEdge = Edge;

export interface Canvas {
  id: string;
  name: string;
  parentNodeId?: string;
  parentCanvasId?: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface Version {
  id: string;
  createdAt: number;
  description: string;
  nodeCount: number;
  canvasCount: number;
  snapshot: {
    rootCanvasId: string;
    canvases: Record<string, Canvas>;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  versionId: string;
  checksum: string;
  rootCanvasId: string;
  canvases: Record<string, Canvas>;
  versions: Version[];
}

export interface Settings {
  theme: "light" | "dark" | "amoled" | "dracula" | "nord";
  lastProjectId?: string;
  snapPx: number;
  autosaveSec: number;
}