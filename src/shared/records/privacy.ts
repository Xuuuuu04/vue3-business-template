/** 按动作声明的敏感值清理说明和错误，不依赖业务字段的名字。 */
import type { RunRecord } from "./store";

export class RecordPrivacy {
  private readonly secrets = new Set<string>();
  private ordered: string[] = [];
  private dirty = false;

  /** 只取已有值；不读取 Blob 正文、不执行对象上的 getter。 */
  add(value: unknown): void {
    const seen = new WeakSet<object>();
    const visit = (item: unknown): void => {
      if (item == null) return;
      if (typeof item !== "object") {
        if (!["string", "number", "bigint", "boolean"].includes(typeof item)) return;
        const text = String(item);
        if (!text) return;
        this.secrets.add(text);
        if (typeof item === "string") this.secrets.add(JSON.stringify(item).slice(1, -1));
        this.dirty = true;
        return;
      }
      if (seen.has(item)) return;
      seen.add(item);
      if (item instanceof FormData) {
        for (const entry of item.values()) visit(entry);
      } else if (item instanceof File) visit(item.name);
      else if (!(item instanceof Blob)) {
        for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(item)))
          if ("value" in descriptor) visit(descriptor.value);
      }
    };
    visit(value);
  }

  /** 清理后再截断，避免长凭据先被截短而无法匹配。 */
  text(message: string, limit = 300): string {
    if (this.dirty) {
      this.ordered = [...this.secrets].sort((a, b) => b.length - a.length);
      this.dirty = false;
    }
    for (const value of this.ordered) message = message.split(value).join("已隐藏");
    return message.slice(0, limit);
  }

  /** 后来产生的敏感输出也不能留在此前保存的错误或说明里。 */
  clean(record: RunRecord): void {
    if (record.error) record.error = this.text(record.error);
    for (const step of record.steps) {
      if (step.error) step.error = this.text(step.error);
      step.outputs = step.outputs.map((message) => this.text(message, 200));
    }
  }
}
