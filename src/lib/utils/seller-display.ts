export function sellerDisplayName(name: string): string {
  return name.replace(/^\[[^\]]+\]\s*/, "").trim() || name.trim();
}

export function sellerMonogram(name: string): string {
  const cleaned = sellerDisplayName(name);
  const match = cleaned.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toUpperCase() : "?";
}
