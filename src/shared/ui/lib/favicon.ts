export function syncFavicon(mark: string, logo?: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.append(link);
  }
  if (logo) {
    link.type = "";
    link.href = logo;
    return;
  }
  const color =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim() || "#3b5bdb";
  const ink =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-ink")
      .trim() || "#fff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${color}"/><text x="32" y="44" font-size="34" font-weight="700" text-anchor="middle" font-family="-apple-system,PingFang SC,sans-serif" fill="${ink}">${mark}</text></svg>`;
  link.type = "image/svg+xml";
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
