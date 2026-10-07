import { afterEach, expect, test, vi } from "vitest";
import { effectScope, nextTick, reactive, type EffectScope } from "vue";
import { TEXT_PREVIEW_LIMIT, useFilePreview, type PreviewSource } from "@/shared/ui/lib/file-preview";

const scopes: EffectScope[] = [];
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.restoreAllMocks();
});
function preview(props: PreviewSource) {
  const source = reactive(props);
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() => useFilePreview(source))!;
  return { source, scope, state };
}
async function settle() {
  await nextTick();
  await new Promise<void>((resolve) => setImmediate(resolve));
}
function delayedBlob() {
  const blob = new Blob(["pending"]);
  let resolve!: (text: string) => void;
  vi.spyOn(blob, "text").mockImplementation(() => new Promise<string>((done) => { resolve = done; }));
  return { blob, finish: (text: string) => resolve(text) };
}

test("A 的旧内容晚完成时不能覆盖已显示的 B", async () => {
  const old = delayedBlob();
  const { source, state } = preview({ name: "A.md", size: 7, blob: old.blob });
  source.name = "B.md";
  source.blob = new Blob(["NEW_B"]);
  await settle();
  expect(state.lines.value).toEqual(["NEW_B"]);
  old.finish("OLD_A");
  await settle();
  expect(state.lines.value).toEqual(["NEW_B"]);
  expect(state.ready.value).toBe(true);
});

test("退出组件后不再写入待完成的文本读取", async () => {
  const old = delayedBlob();
  const { state, scope } = preview({ name: "A.txt", size: 7, blob: old.blob });
  scope.stop();
  old.finish("OLD_A");
  await settle();
  expect(state.lines.value).toEqual([]);
  expect(state.ready.value).toBe(false);
});

test("元数据再小也不能读取超过实际 1 MiB 的 Blob", async () => {
  const blob = new Blob(["X".repeat(TEXT_PREVIEW_LIMIT + 1)]);
  const read = vi.spyOn(blob, "text");
  const { state } = preview({ name: "tiny.txt", size: 3, blob });
  await settle();
  expect(read).not.toHaveBeenCalled();
  expect(state.canPreview.value).toBe(false);
  expect(state.unavailable.value).toContain("超过 1 MB");
  expect(state.ready.value).toBe(false);
});

test("已经取得的实际小 Blob 按实际大小判断", async () => {
  const { state } = preview({ name: "small.txt", size: TEXT_PREVIEW_LIMIT + 1, blob: new Blob(["small"]) });
  await settle();
  expect(state.canPreview.value).toBe(true);
  expect(state.lines.value).toEqual(["small"]);
});

test("不支持的类型即使收到 Blob 也不按文本读取", async () => {
  const blob = new Blob(["PDF placeholder"]);
  const read = vi.spyOn(blob, "text");
  const { state } = preview({ name: "file.pdf", size: blob.size, blob });
  await settle();
  expect(read).not.toHaveBeenCalled();
  expect(state.canPreview.value).toBe(false);
  expect(state.ready.value).toBe(false);
});

test("正常文本只显示前 200 行", async () => {
  const blob = new Blob([Array.from({ length: 250 }, (_, i) => `line-${i + 1}`).join("\n")]);
  const { state } = preview({ name: "file.txt", size: blob.size, blob });
  await settle();
  expect(state.lines.value).toHaveLength(200);
  expect(state.lines.value[0]).toBe("line-1");
  expect(state.lines.value[199]).toBe("line-200");
});

test("图片替换与退出时回收每一个临时地址", async () => {
  const create = vi.spyOn(URL, "createObjectURL").mockReturnValueOnce("blob:one").mockReturnValueOnce("blob:two");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const { source, state, scope } = preview({ name: "A.png", size: 3, blob: new Blob(["one"]) });
  expect(state.url.value).toBe("blob:one");
  source.blob = new Blob(["two"]);
  await settle();
  expect(state.url.value).toBe("blob:two");
  expect(revoke).toHaveBeenCalledWith("blob:one");
  scope.stop();
  expect(revoke).toHaveBeenCalledWith("blob:two");
  expect(create).toHaveBeenCalledTimes(2);
});

test("文本读取失败显示明确错误，不假装空内容成功", async () => {
  const blob = new Blob(["pending"]);
  vi.spyOn(blob, "text").mockRejectedValue(new Error("private file content"));
  const { state } = preview({ name: "file.txt", size: blob.size, blob });
  await settle();
  expect(state.error.value).toContain("无法读取");
  expect(state.error.value).not.toContain("private file content");
  expect(state.ready.value).toBe(false);
  expect(state.reading.value).toBe(false);
});
