import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Penyimpanan file sederhana untuk mode demo (tanpa database).
 * Semua data menarik disimpan sebagai JSON atomik di `.data/` (gitignored)
 * sehingga bertahan antar restart server pada satu instance lokal.
 */
const DATA_DIR = join(process.cwd(), ".data");

function ensureDir(): string {
  mkdirSync(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

export function storagePath(name: string): string {
  return join(ensureDir(), name);
}

export function readJsonFile<T>(name: string, fallback: T): T {
  try {
    const raw = readFileSync(storagePath(name), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(name: string, data: unknown): void {
  const target = storagePath(name);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, target);
}