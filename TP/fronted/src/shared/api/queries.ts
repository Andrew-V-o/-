import { useQuery } from "@tanstack/react-query";
import { get, workspacePath } from "./client";
import type { Source } from "./contracts";

export const keys = {
  workspace: (id: string) => ["workspace", id] as const,
  resource: (id: string, name: string, ...parameters: unknown[]) =>
    ["workspace", id, name, ...parameters] as const,
};

export function useSources(id: string) {
  return useQuery({
    queryKey: keys.resource(id, "sources"),
    queryFn: ({ signal }) =>
      get<Source[]>(workspacePath(id, "/sources"), signal),
  });
}
