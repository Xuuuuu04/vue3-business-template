import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from "vue";

/** SVG 坐标宽度跟随实际容器，让坐标文字和图表高度不会随窄屏一起缩小。 */
export function useChartWidth(element: Ref<SVGSVGElement | undefined>) {
  const width = ref(640);
  let observer: ResizeObserver | undefined;
  let frame: number | undefined;
  let pendingWidth = width.value;
  onMounted(() => {
    if (!element.value) return;
    observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width <= 0) return;
      pendingWidth = Math.max(120, Math.round(entry.contentRect.width));
      if (frame !== undefined || pendingWidth === width.value) return;
      // viewBox 会改变 SVG 的比例高度，等下一帧再更新，避免在尺寸回调中再次改变被观察元素。
      frame = requestAnimationFrame(() => { frame = undefined; width.value = pendingWidth; });
    });
    observer.observe(element.value);
  });
  onBeforeUnmount(() => { observer?.disconnect(); if (frame !== undefined) cancelAnimationFrame(frame); });
  return readonly(width);
}
