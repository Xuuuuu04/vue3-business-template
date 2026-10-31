import {
  inject,
  onBeforeUnmount,
  useAttrs,
  watchEffect,
  type ComputedRef,
  type InjectionKey,
} from "vue";

export interface FieldContext {
  id: string;
  labelId: string;
  messageId?: string;
  invalid: boolean;
  required: boolean;
  register: (owner: symbol, id?: string) => void;
}
export const fieldContext: InjectionKey<ComputedRef<FieldContext>> =
  Symbol("ui-field");

export function useFieldControl(
  options: () => {
    id?: string;
    label?: string;
    labelledBy?: string;
    describedBy?: string;
    invalid?: boolean;
    required?: boolean;
  } = () => ({}),
) {
  const field = inject(fieldContext, undefined);
  const attrs = useAttrs();
  const owner = Symbol("field-control");
  const explicitId = () => options().id ?? (attrs.id as string | undefined);
  watchEffect(() => field?.value.register(owner, explicitId()));
  onBeforeUnmount(() => field?.value.register(owner));
  const invalid = () =>
    Boolean(
      options().invalid ||
      attrs["aria-invalid"] === true ||
      attrs["aria-invalid"] === "true" ||
      field?.value.invalid,
    );
  const attributes = () => {
    const explicit = options();
    const label = explicit.label ?? (attrs["aria-label"] as string | undefined);
    const labelledBy =
      explicit.labelledBy ?? (attrs["aria-labelledby"] as string | undefined);
    const describedBy =
      explicit.describedBy ?? (attrs["aria-describedby"] as string | undefined);
    const required =
      explicit.required ??
      (attrs["aria-required"] === undefined
        ? field?.value.required
        : attrs["aria-required"]);
    return {
      id: explicitId() ?? field?.value.id,
      "aria-label": label,
      "aria-labelledby":
        labelledBy ?? (label ? undefined : field?.value.labelId),
      "aria-describedby":
        [describedBy, field?.value.messageId].filter(Boolean).join(" ") ||
        undefined,
      "aria-invalid": invalid() || undefined,
      "aria-required": required as boolean | "true" | "false" | undefined,
    };
  };
  const rootAttributes = () =>
    Object.fromEntries(
      Object.entries(attrs).filter(
        ([name]) =>
          ![
            "id",
            "aria-label",
            "aria-labelledby",
            "aria-describedby",
            "aria-invalid",
            "aria-required",
          ].includes(name),
      ),
    );
  return { attributes, invalid, rootAttributes };
}
