import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from "vue";

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

      frame = requestAnimationFrame(() => {
        frame = undefined;
        width.value = pendingWidth;
      });
    });
    observer.observe(element.value);
  });
  onBeforeUnmount(() => {
    observer?.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  return readonly(width);
}
