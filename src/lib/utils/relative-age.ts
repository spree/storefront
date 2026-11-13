export function formatRelativeAge(
  value: string | null | undefined,
  now = Date.now(),
): string {
  if (!value) return "";

  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return `${Math.max(1, seconds)}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  return `${Math.floor(days / 365)}y`;
}
