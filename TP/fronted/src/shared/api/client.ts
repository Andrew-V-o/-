//Здесь пока прописаны все заглушки
import type { Session, Workspace, User, Store, Metric, Source } from './contracts';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
const mockUser: User = {
  id: "user-1",
  name: "Иван Администратор",
  email: "admin@company.local"
};

const mockWorkspace: Workspace = {
  id: "ws-1",
  name: "Основной воркспейс",
  role: "admin",
  capabilities: [
    "analytics:read",
    "assistant:use",
    "reports:write",
    "cases:write",
    "plans:write",
    "metrics:write",
    "sources:manage",
    "members:manage"
  ],
  all_stores: true,
  store_ids: ["store-1", "store-2"]
};

const mockSession: Session = {
  user: mockUser,
  csrf_token: "mock-csrf-token-12345",
  workspaces: [mockWorkspace]
};

const db = {
  stores: [] as Store[],
  metrics: [] as Metric[],
  sources: [] as Source[],
};

let isBootstrapped = false;

async function exchange<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ payload: T; headers: Headers }> {
  const method = options.method ?? "GET";
  const cleanPath = path.split('?')[0]; 
  
  console.log(`[MOCK API] ${method} -> /api/v1${path}`);
  if (options.body) {
    console.log(`[MOCK API BODY]:`, JSON.parse(options.body as string));
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  if (cleanPath === '/auth/session') {
    if (!isBootstrapped) {
      throw new ApiError(401, "unauthorized", "Сессия отсутствует.");
    }
    mockWorkspace.store_ids = db.stores.map(s => s.id);
    return { payload: mockSession as T, headers: new Headers() };
  }

  if (cleanPath === '/auth/status') {
    return {
      payload: { bootstrap_required: !isBootstrapped, bootstrap_token_required: false } as any,
      headers: new Headers()
    };
  }

  if (method === 'POST' && cleanPath === '/auth/bootstrap') {
    const body = JSON.parse(options.body as string);
    isBootstrapped = true;
    
    mockSession.user.name = body.name || mockSession.user.name;
    mockSession.user.email = body.email || mockSession.user.email;
    mockWorkspace.name = body.workspace_name || mockWorkspace.name;
    
    return { payload: mockSession as T, headers: new Headers() };
  }

  if (cleanPath.endsWith('/overview')) {
    return {
      payload: {
        date_from: "2026-01-01",
        date_to: "2026-12-31",
        metric: db.metrics[0] || null,
        totals: { actual: db.stores.length ? "450000" : null, plan: db.stores.length ? "500000" : null, attainment: db.stores.length ? "90.0" : null, planned_store_count: db.stores.length },
        stores: db.stores.map(s => ({
          store_id: s.id, name: s.name, city: s.city,
          actual: "150000", plan: "166000", attainment: "90.3", status: "normal"
        })),
        coverage: { available: db.stores.length, total: db.stores.length },
        warnings: [],
        comparison: null
      } as any,
      headers: new Headers()
    };
  }

  if (cleanPath.endsWith('/stores')) {
    if (method === 'POST') {
      const body = JSON.parse(options.body as string);
      const newStore: Store = {
        id: `store-${Date.now()}`,
        name: body.name || "Новая точка",
        code: body.code || "NT-01",
        city: body.city || "Москва",
        owner_name: mockUser.name,
        active: true
      };
      db.stores.push(newStore);
      return { payload: newStore as T, headers: new Headers() };
    }
    return { payload: db.stores as T, headers: new Headers() };
  }

  if (cleanPath.endsWith('/sources')) {
    if (method === 'POST') {
      const body = JSON.parse(options.body as string);
      const newSource: Source = {
        id: `source-${Date.now()}`,
        name: body.name || "PostgreSQL база",
        host: body.host || "localhost",
        port: body.port || 5432,
        database: body.database || "analytics",
        username: body.username || "postgres",
        schemas: ["public"],
        enabled: true,
        catalog_version: 1,
        status: "connected",
        last_checked_at: new Date().toISOString(),
        error: null
      };
      db.sources.push(newSource);
      return { payload: newSource as T, headers: new Headers() };
    }
    return { payload: db.sources as T, headers: new Headers() };
  }

  if (cleanPath.endsWith('/metrics')) {
    if (method === 'POST') {
      const body = JSON.parse(options.body as string);
      const newMetric: Metric = {
        id: `metric-${Date.now()}`,
        key: body.key || "revenue",
        name: body.name || "Выручка",
        description: body.description || "Общий объем продаж",
        unit: "руб.",
        source_id: db.sources[0]?.id || "source-1",
        table_schema: "public",
        table_name: "orders",
        value_column: "amount",
        date_column: "created_at",
        store_column: "store_code",
        aggregation: "sum",
        version: 1
      };
      db.metrics.push(newMetric);
      return { payload: newMetric as T, headers: new Headers() };
    }
    return { payload: db.metrics as T, headers: new Headers() };
  }

  if (cleanPath.endsWith('s') || cleanPath.includes('/list') || cleanPath.includes('/history')) {
    return { payload: [] as any, headers: new Headers() };
  }
  return { payload: { items: [], length: 0, status: "success" } as T, headers: new Headers() };
}

export function setCsrfToken(token: string) {}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await exchange<T>(path, options)).payload;
}
export type Page<T> = { items: T[]; nextCursor: string | null };
export async function getPage<T>(path: string, signal?: AbortSignal): Promise<Page<T>> {
  const response = await exchange<T[]>(path, { signal });
  return { items: response.payload, nextCursor: null };
}
export const get = <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal });
export const post = <T>(path: string, body: unknown = {}) => request<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const workspacePath = (workspaceId: string, path = "") => `/workspaces/${encodeURIComponent(workspaceId)}${path}`;
export function queryString(values: Record<string, any>) { return ""; }
