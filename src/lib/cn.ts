export type ClassValue =
  string | number | null | undefined | false | Record<string, boolean> | ClassValue[];

function flatten(value: ClassValue, out: string[]): void {
  if (!value) return;
  if (typeof value === "string" || typeof value === "number") {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out);
    return;
  }
  if (typeof value === "object") {
    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) out.push(key);
    }
  }
}

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) flatten(input, out);
  return out.join(" ");
}
