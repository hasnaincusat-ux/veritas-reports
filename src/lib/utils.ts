import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(d: Date | string, withTime = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function timeAgo(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeReference(prefix = "VR") {
  let out = "";
  for (let i = 0; i < 6; i++)
    out += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  return `${prefix}-${out}`;
}

/** Colour band for a similarity / AI percentage. */
export function scoreBand(score: number) {
  // Kept clear of the metric accents (sky, violet) so identity and severity
  // never read as the same signal.
  if (score < 15) return { label: "Low", cls: "text-mint", ring: "stroke-mint" };
  if (score < 30)
    return { label: "Moderate", cls: "text-amber-400", ring: "stroke-amber-400" };
  return { label: "High", cls: "text-oxblood", ring: "stroke-oxblood" };
}
