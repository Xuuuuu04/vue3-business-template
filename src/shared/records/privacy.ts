import type { RunRecord } from "./store";
import { ActionError } from "@/shared/http/client";
import { fieldErrorsFrom } from "@/shared/http/field-errors";

export class RecordPrivacy {
  private readonly secrets = new Set<string>();
  private ordered: string[] = [];
  private dirty = false;

  add(value: unknown): void {
    const seen = new WeakSet<object>();
    const visit = (item: unknown): void => {
      if (item == null) return;
      if (typeof item !== "object") {
        if (!["string", "number", "bigint"].includes(typeof item)) return;
        const text = String(item);
        if (!text || (typeof item !== "string" && text.length < 4)) return;
        this.secrets.add(text);
        if (typeof item === "string")
          this.secrets.add(JSON.stringify(item).slice(1, -1));
        this.dirty = true;
        return;
      }
      if (seen.has(item)) return;
      seen.add(item);
      if (item instanceof FormData) {
        for (const entry of item.values()) visit(entry);
      } else if (item instanceof File) visit(item.name);
      else if (!(item instanceof Blob)) {
        for (const descriptor of Object.values(
          Object.getOwnPropertyDescriptors(item),
        ))
          if ("value" in descriptor) visit(descriptor.value);
      }
    };
    visit(value);
  }

  text(message: string, limit = 300): string {
    if (this.dirty) {
      this.ordered = [...this.secrets].sort((a, b) => b.length - a.length);
      this.dirty = false;
    }
    for (const value of this.ordered)
      message = message.split(value).join("已隐藏");
    return message.slice(0, limit);
  }

  failure(error: unknown): Error {
    const message =
      error instanceof Error ? this.text(error.message) : "动作执行失败";
    return error instanceof ActionError
      ? new ActionError(
          error.code,
          message,
          error.unknownResult,
          fieldErrorsFrom(
            Object.entries(error.fieldErrors).map(([field, problem]) => ({
              field,
              problem,
            })),
            (text) => this.text(text),
          ),
        )
      : new Error(message);
  }

  clean(record: RunRecord): void {
    if (record.error) record.error = this.text(record.error);
    for (const step of record.steps) {
      if (step.error) step.error = this.text(step.error);
      step.outputs = step.outputs.map((message) => this.text(message, 200));
      for (const request of step.requests) {
        if (request.requestId) request.requestId = this.text(request.requestId);
        if (request.backendRun)
          request.backendRun = this.text(request.backendRun);
      }
    }
  }
}
