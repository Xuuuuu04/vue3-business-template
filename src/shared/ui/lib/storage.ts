export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn("无法读取浏览器本地存储：", key, error);
    return null;
  }
}

export function writeStorage(
  key: string,
  value: string,
  warning?: string,
): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (warning) console.warn(warning, error);
    return false;
  }
}

export function removeStorage(key: string, warning?: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    if (warning) console.warn(warning, error);
  }
}
