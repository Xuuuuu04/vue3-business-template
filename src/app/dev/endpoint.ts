import generatedGraph from "@/generated/graph.json";
import type { describe } from "@/shared/modules/graph";

const graph = generatedGraph as unknown as ReturnType<typeof describe>;
const known = new Map(
  graph.flatMap((m) =>
    m.endpoints.map((e) => [e.id, `${e.method} ${e.path}`] as const),
  ),
);

export function endpointLabel(id: string, method?: string): string {
  return known.get(id) ?? (method ? `${method} ${id}` : id);
}
