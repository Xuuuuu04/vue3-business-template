export type DemoHandler = (
  request: Request,
  params: Record<string, string>,
) => unknown;
export type DemoData = Record<
  string,
  DemoHandler | object | string | number | boolean | null
>;

export function defineDemo<T extends DemoData>(data: T): T {
  return data;
}
