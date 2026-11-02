import { context, assertIdentity } from "./context";
export default async function setup() {
  const run = context();
  const response = await fetch(
    `http://127.0.0.1:${run.backendPort}/health/ready`,
    {
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    },
  );
  assertIdentity(
    response.status,
    response.headers.get("x-acceptance-run"),
    run.runId,
  );
}
