/**
 * 坐标轴刻度：步长取 1、2、2.5、5 乘以 10 的整数次方，刻度值都是整齐的数。
 * 数据全是整数时步长至少为 1，不会出现 1.5 人、3.333 次这样的刻度。
 */
export function niceTicks(values: number[], count = 4): number[] {
  const finite = values.filter(Number.isFinite);
  const lo = Math.min(0, ...finite);
  const top = Math.max(lo, ...finite);
  const hi = top > lo ? top : lo + 1;
  const integers = finite.every(Number.isInteger);
  // 在 count 到 count+2 个刻度之间，选顶端最贴近最大值的一种，避免图上留出大片空白。
  let best: number[] = [];
  for (let n = count; n <= count + 2; n++) {
    const raw = (hi - lo) / Math.max(1, n - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    let step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? raw;
    if (integers) step = Math.max(1, Math.ceil(step));
    const start = Math.floor(lo / step) * step;
    const ticks: number[] = [];
    for (let t = start; t < hi + step - 1e-9; t += step) ticks.push(Number(t.toFixed(10)));
    if (!best.length || ticks.at(-1)! < best.at(-1)! || (ticks.at(-1) === best.at(-1) && ticks.length < best.length)) best = ticks;
  }
  return best;
}
