/**
 * 演示数据：每个业务包的 demo.ts 按 api.ts 里的接口编号给出样例回包，只由开发服务读取。
 * 固定值按 200 JSON 返回；函数可以按请求计算，返回 Response 时原样发出（别的状态码、文件下载、204）。
 * 页面和步骤不能导入 demo.ts，生产打包因此不带演示数据。
 */
export type DemoHandler = (
  request: Request,
  params: Record<string, string>,
) => unknown;
export type DemoData = Record<
  string,
  DemoHandler | object | string | number | boolean | null
>;
/** 只用来给 demo.ts 加上类型，原样返回。 */
export function defineDemo<T extends DemoData>(data: T): T {
  return data;
}
