import { onBeforeUnmount, ref } from "vue";

export function useAiPreview() {
  const prompt = ref("");
  const busy = ref(false);
  let timer: ReturnType<typeof setInterval> | undefined;
  const chat = ref([
    {
      id: "u1",
      role: "user" as const,
      content: "帮我总结一下九月南岸门店的销售情况",
    },
    {
      id: "a1",
      role: "assistant" as const,
      content:
        "九月南岸门店整体**稳中有升**：\n\n1. 实付金额 38.2 万元，环比增长 12.4%\n2. 有效订单 4,120 单，客单价 92.7 元\n3. 推广消耗下降 31%，投入产出更好\n\n需要导出明细，可以运行：\n\n```sql\nselect day, orders, paid from store_daily where store = '南岸门店';\n```",
    },
  ]);
  const reply =
    "好的，我按**周**拆开看：第一周受国庆前备货影响订单偏少，第二、三周恢复到日均 140 单以上，第四周因为 `满减活动` 带动达到峰值。建议十月继续保留周末满减。";
  function send(text: string) {
    chat.value.push({ id: `u${Date.now()}`, role: "user", content: text });
    prompt.value = "";
    const msg = {
      id: `a${Date.now()}`,
      role: "assistant" as const,
      content: "",
      streaming: true,
    };
    chat.value.push(msg);
    busy.value = true;
    let n = 0;
    timer = setInterval(() => {
      n += 3;
      const last = chat.value.at(-1)!;
      last.content = reply.slice(0, n);
      if (n >= reply.length) stop();
    }, 40);
  }
  function stop() {
    clearInterval(timer);
    busy.value = false;
    const last = chat.value.at(-1);
    if (last && "streaming" in last)
      (last as { streaming?: boolean }).streaming = false;
  }
  onBeforeUnmount(stop);

  return { prompt, busy, chat, send, stop };
}
export type AiPreviewState = ReturnType<typeof useAiPreview>;
