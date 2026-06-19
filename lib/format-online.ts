export function formatOnlineLabel(count: number): string {
  const n = Math.max(0, count);
  if (n === 1) return "1 person online right now";
  return `${n.toLocaleString("en-US")} people online right now`;
}

export function formatOnlineShort(count: number): string {
  const n = Math.max(0, count);
  if (n === 1) return "1 person online";
  return `${n.toLocaleString("en-US")} people online`;
}