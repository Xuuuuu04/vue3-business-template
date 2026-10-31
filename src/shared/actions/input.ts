import type { Action } from "./definitions";
import { ActionError } from "@/shared/http/client";
import type { RecordPrivacy } from "@/shared/records/privacy";
import { inputFieldErrors } from "./input-errors";
import { zhCN } from "zod/locales";
const localeError = zhCN().localeError;
const inputError: typeof localeError = (issue) =>
  issue.code === "invalid_type" && issue.expected === "int"
    ? "请填写整数"
    : localeError(issue);
export function prepareInput<I extends object>(
  action: Action<I>,
  input: I,
  privacy: RecordPrivacy,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(input))
    if (!action.inputFields.includes(key))
      throw new ActionError("undeclared_input", `输入字段 ${key} 没有声明`);
  const checked = action.input.safeParse(input, { error: inputError });
  if (!checked.success)
    throw new ActionError(
      "invalid_input",
      "输入不符合要求，请修改对应字段。",
      false,
      inputFieldErrors(checked.error.issues, action, privacy),
    );
  Object.assign(values, checked.data);
  for (const [key, field] of Object.entries(action.fields))
    if (field.secret && key in values) privacy.add(values[key]);
  for (const key of action.inputFields) {
    const parsed = action.fields[key]?.schema.safeParse(values[key], {
      error: inputError,
    });
    if (!parsed?.success)
      throw new ActionError(
        "invalid_input",
        `输入字段 ${key} 类型不符合约定`,
        false,
        inputFieldErrors(parsed?.error.issues ?? [], action, privacy, [key]),
      );
    values[key] = parsed.data;
    if (action.fields[key]?.secret) privacy.add(parsed.data);
  }
  for (const [key, field] of Object.entries(action.fields)) {
    if (!(key in values)) {
      const parsed = field.schema.safeParse(undefined);
      if (parsed.success) {
        values[key] = parsed.data;
        if (field.secret) privacy.add(parsed.data);
      }
    }
  }
  return values;
}
