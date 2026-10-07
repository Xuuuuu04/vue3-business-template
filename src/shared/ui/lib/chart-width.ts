import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from "vue";

/** SVG 坐标宽度跟随实际容器，让坐标文字和图表高度不会随窄屏一起缩小。 */
export function useChartWidth(element: Ref<SVGSVGElement | undefined>) {
  const width = ref(640);
  let observer: ResizeObserver | undefined;
  onMounted(() => {
    if (!element.value) return;
    observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0)
        width.value = Math.max(120, Math.round(entry.contentRect.width));
    });
    observer.observe(element.value);
  });
  onBeforeUnmount(() => observer?.disconnect());
  return readonly(width);
}
