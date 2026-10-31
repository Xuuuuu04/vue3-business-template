import type { Fields } from "./definitions";
import { ActionError } from "@/shared/http/client";
import type { RecordPrivacy } from "@/shared/records/privacy";

function readonlyValue(
  value: unknown,
  cache = new WeakMap<object, object>(),
): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Blob ||
    value instanceof FormData
  )
    return value;
  const known = cache.get(value);
  if (known) return known;
  const proxy = new Proxy(value, {
    get(target, key) {
      if (target instanceof Date) {
        if (typeof key === "string" && key.startsWith("set"))
          return () => {
            throw new ActionError(
              "readonly_change",
              "不能原地修改日期，请写入新字段",
            );
          };
        const member: unknown = Reflect.get(target, key);
        return typeof member === "function" ? member.bind(target) : member;
      }
      return readonlyValue(Reflect.get(target, key), cache);
    },
    set() {
      throw new ActionError(
        "readonly_change",
        "不能原地修改只读字段，请写入新字段",
      );
    },
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      return descriptor && "value" in descriptor
        ? { ...descriptor, value: readonlyValue(descriptor.value, cache) }
        : descriptor;
    },
    setPrototypeOf() {
      throw new ActionError("readonly_change", "不能修改只读对象原型");
    },
    deleteProperty() {
      throw new ActionError("readonly_change", "不能删除只读字段");
    },
    defineProperty() {
      throw new ActionError("readonly_change", "不能重定义只读字段");
    },
  });
  cache.set(value, proxy);
  return proxy;
}

export function view(
  values: Record<string, unknown>,
  fields: Fields,
  reads: string[],
  writes: string[],
  written: Set<string>,
  privacy: RecordPrivacy,
) {
  return new Proxy(values, {
    get(target, key) {
      if (
        typeof key !== "string" ||
        (!reads.includes(key) && !written.has(key))
      )
        throw new ActionError(
          "undeclared_read",
          `读取未声明字段 ${String(key)}`,
        );
      if (!(key in target))
        throw new ActionError("missing_value", `字段 ${key} 尚未产生`);
      return readonlyValue(target[key]);
    },
    set(target, key, value) {
      if (typeof key !== "string" || !writes.includes(key))
        throw new ActionError(
          "undeclared_write",
          `写入未声明字段 ${String(key)}`,
        );
      const parsed = fields[key]?.schema.safeParse(value);
      if (!parsed?.success)
        throw new ActionError(
          "invalid_value",
          `字段 ${key} 的值类型不符合约定`,
        );
      target[key] = parsed.data;
      if (fields[key]?.secret) privacy.add(parsed.data);
      written.add(key);
      return true;
    },
    ownKeys(target) {
      return Object.keys(target).filter(
        (key) => reads.includes(key) || written.has(key),
      );
    },
    getOwnPropertyDescriptor(target, key) {
      if (
        typeof key !== "string" ||
        (!reads.includes(key) && !written.has(key))
      )
        return undefined;
      return {
        configurable: true,
        enumerable: true,
        writable: false,
        value: readonlyValue(target[key]),
      };
    },
    getPrototypeOf() {
      return null;
    },
    setPrototypeOf() {
      throw new ActionError("undeclared_write", "步骤不能修改数据原型");
    },
    deleteProperty() {
      throw new ActionError("undeclared_write", "步骤不能删除字段");
    },
    defineProperty() {
      throw new ActionError("undeclared_write", "步骤不能重定义字段");
    },
  });
}
