export type FieldErrors = Readonly<Record<string, string>>;

export function fieldErrorsFrom(
  value: unknown,
  safeText: (message: string) => string,
): FieldErrors {
  const errors: Record<string, string> = Object.create(null);
  if (!Array.isArray(value)) return Object.freeze(errors);
  for (const entry of value.slice(0, 50)) {
    if (!entry || typeof entry !== "object") continue;
    const { field, problem } = entry as Record<string, unknown>;
    if (typeof field !== "string" || typeof problem !== "string") continue;
    if (
      field.length > 200 ||
      !/^[A-Za-z_][A-Za-z0-9_]*(\.(?:[A-Za-z_][A-Za-z0-9_]*|0|[1-9][0-9]*))*$/.test(
        field,
      )
    )
      continue;
    if (
      field
        .split(".")
        .some((part) =>
          ["__proto__", "prototype", "constructor"].includes(part),
        )
    )
      continue;
    if (safeText(field) !== field) continue;
    const message = safeText(problem).trim().slice(0, 300);
    if (message && !Object.hasOwn(errors, field)) errors[field] = message;
  }
  return Object.freeze(errors);
}
