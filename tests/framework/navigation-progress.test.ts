import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, h, nextTick, type Component } from "vue";
import { transpileModule, ModuleKind } from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 使用 Vue 的实际组件与更新过程；内存渲染器只替代 DOM，便于确定导航交叠的时间顺序。
const source = readFileSync(new URL("../../src/shared/ui/layout/TopProgress.vue", import.meta.url), "utf8");
const { descriptor } = parse(source);
const script = compileScript(descriptor, { id: "navigation-progress-test", inlineTemplate: true });
const compiled = transpileModule(script.content, { compilerOptions: { module: ModuleKind.CommonJS } });
const componentModule = { exports: {} as { default: Component } };
new Function("require", "module", "exports", compiled.outputText)(createRequire(import.meta.url), componentModule, componentModule.exports);
const TopProgress = componentModule.exports.default;

interface MemoryNode { children: MemoryNode[]; parent: MemoryNode | null; props: Record<string, unknown> }
const node = (): MemoryNode => ({ children: [], parent: null, props: {} });
const renderer = createRenderer<MemoryNode, MemoryNode>({
  createElement: node,
  createText: node,
  createComment: node,
  setText: () => {},
  setElementText: () => {},
  patchProp: (element, key, _previous, value) => { element.props[key] = value; },
  insert: (child, parent, anchor) => {
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    index < 0 ? parent.children.push(child) : parent.children.splice(index, 0, child);
  },
  remove: (child) => {
    const index = child.parent?.children.indexOf(child) ?? -1;
    if (index >= 0) child.parent!.children.splice(index, 1);
    child.parent = null;
  },
  parentNode: (child) => child.parent,
  nextSibling: (child) => child.parent?.children[(child.parent.children.indexOf(child)) + 1] ?? null,
});
let root: MemoryNode;
const style = () => root.children[0]!.children[0]!.props.style as { width: string; opacity: number };
async function active(value: boolean) {
  renderer.render(h(TopProgress, { active: value }), root);
  await nextTick();
}

describe("页面导航进度", () => {
  beforeEach(() => { vi.useFakeTimers(); root = node(); });
  afterEach(() => { renderer.render(null, root); vi.clearAllTimers(); vi.useRealTimers(); });

  it("首次渲染已经在导航时立即显示，完成后补满并隐藏", async () => {
    await active(true);
    expect(style()).toMatchObject({ width: "8%", opacity: 1 });
    await vi.advanceTimersByTimeAsync(120);
    expect(Number.parseFloat(style().width)).toBeGreaterThan(8);
    await active(false);
    expect(style()).toMatchObject({ width: "100%", opacity: 1 });
    await vi.advanceTimersByTimeAsync(260);
    expect(style()).toMatchObject({ width: "0%", opacity: 0 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("上一页刚完成又开始新导航时，旧收尾不能隐藏新进度", async () => {
    await active(true);
    await active(false);
    await vi.advanceTimersByTimeAsync(100);
    await active(true);
    await vi.advanceTimersByTimeAsync(260);
    expect(style().opacity).toBe(1);
    expect(Number.parseFloat(style().width)).toBeGreaterThan(8);
    expect(vi.getTimerCount()).toBe(1);
  });

  it.each([true, false])("卸载清除%s状态下的持续或收尾计时器", async (running) => {
    await active(true);
    if (!running) await active(false);
    expect(vi.getTimerCount()).toBe(1);
    renderer.render(null, root);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(root.children).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
