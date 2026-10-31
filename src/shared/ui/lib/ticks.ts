export function niceTicks(values: number[], count = 4): number[] {
  const finite = values.filter(Number.isFinite);
  const lo = Math.min(0, ...finite);
  const top = Math.max(lo, ...finite);
  const hi = top > lo ? top : lo + 1;
  const integers = finite.every(Number.isInteger);

  let best: number[] = [];
  for (let n = count; n <= count + 2; n++) {
    const raw = (hi - lo) / Math.max(1, n - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    let step =
      [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? raw;
    if (integers) step = Math.max(1, Math.ceil(step));
    const start = Math.floor(lo / step) * step;
    const ticks: number[] = [];
    for (let t = start; t < hi + step - 1e-9; t += step)
      ticks.push(Number(t.toFixed(10)));
    if (
      !best.length ||
      ticks.at(-1)! < best.at(-1)! ||
      (ticks.at(-1) === best.at(-1) && ticks.length < best.length)
    )
      best = ticks;
  }
  return best;
}
