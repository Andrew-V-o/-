export type Capability =
  | "assistant:use";
export type Role =
  | "admin";
export type User = { id: string; email: string; name: string };
export type Workspace = {
  id: string;
  name: string;
  role: Role;
  capabilities: Capability[];
  all_stores: boolean;
  store_ids: string[];
};
export type Session = {
  user: User;
  csrf_token: string;
  workspaces: Workspace[];
};
export type Source = {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  schemas: string[];
  enabled: boolean;
  catalog_version: number;
  permitted_table_count?: number;
  status: string;
  last_checked_at: string | null;
  error: string | { message: string } | null;
  ssl_mode?: "require" | "verify-full" | "disable";
  reader_ids?: string[] | null;
};
export type RunStatus =
  | "queued"
  | "running"
  | "cancel_requested"
  | "cancelled"
  | "succeeded"
  | "failed"
  | "needs_input"
  | "rejected";
export const activeRun = (status: RunStatus) =>
  ["queued", "running", "cancel_requested"].includes(status);
