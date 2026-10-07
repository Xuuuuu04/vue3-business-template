/** 含敏感输入时不回显校验器的动态说明或嵌套路径，避免泄漏默认值与转换结果。 */
import type { Action } from "./definitions";
import { fieldErrorsFrom } from "@/shared/http/field-errors";
import type { RecordPrivacy } from "@/shared/records/privacy";

const fixedProblems: Record<string, string> = {
  invalid_type: "取值类型不正确",
  too_small: "请补充填写内容",
  too_big: "填写内容超过限制",
  custom: "输入不符合业务要求",
};

export function inputFieldErrors(
  issues: readonly { path: PropertyKey[]; code: string; message: string }[],
  action: Action,
  privacy: RecordPrivacy,
  prefix: string[] = [],
) {
  const sensitive = Object.values(action.fields).some((field) => field.secret);
  return fieldErrorsFrom(
    issues.slice(0, 50).map((issue) => {
      const path = [...prefix, ...issue.path];
      const root = path[0];
      return {
        field: sensitive
          ? typeof root === "string" && action.inputFields.includes(root)
            ? root
            : ""
          : path.join("."),
        problem: sensitive
          ? (fixedProblems[issue.code] ?? "取值不符合要求")
          : issue.message,
      };
    }),
    (text) => privacy.text(text),
  );
}
