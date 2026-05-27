/**
 * Convert a duration string (seconds as string, or "hh:mm:ss") to a
 * human-readable string like "1h 4m 35s".
 */
export function hhmmss(duration: string): string {
  if (duration.includes(":")) return duration;
  if (!/^\d+$/.test(duration)) return "∞";

  const sec = parseInt(duration, 10);
  const hms = new Date(1000 * sec).toISOString().substring(11, 19).split(":");
  let str = "";
  if (hms[0] !== "00") str += `${parseInt(hms[0]!, 10)}h `;
  if (hms[1] !== "00") str += `${parseInt(hms[1]!, 10)}m `;
  if (hms[2] !== "00") str += `${parseInt(hms[2]!, 10)}s`;
  return str.trim() || "0s";
}
