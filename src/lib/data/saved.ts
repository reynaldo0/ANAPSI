import { getDb } from "@/lib/db";
import { demoPlaces } from "@/lib/data/demo-data";

export interface SavedPlaceRecord {
  id: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  createdAt: string;
}

interface DbSavedPlace {
  id: string;
  placeId: string;
  createdAt: Date;
  place?: { id: string; name: string; address: string | null; city: string } | null;
}

const demoStore = new Map<string, SavedPlaceRecord>();

function placeName(placeId: string): { name: string; address: string } | null {
  const place = demoPlaces.find((p) => p.id === placeId);
  return place ? { name: place.name, address: `${place.address}, ${place.city}` } : null;
}

export async function listSavedFor(userId: string): Promise<{
  data: SavedPlaceRecord[];
  source: string;
}> {
  const db = getDb();
  if (!db) {
    const data = [...demoStore.values()]
      .filter((record) => record.placeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { data, source: "demo" };
  }

  const rows = await db.savedPlace.findMany({
    where: { userId },
    include: { place: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    data: rows.map(toRecord),
    source: "database",
  };
}

export async function toggleSaved(
  userId: string,
  placeId: string,
): Promise<{ data: SavedPlaceRecord | null; saved: boolean; source: string }> {
  const db = getDb();
  if (!db) {
    const key = `${userId}:${placeId}`;
    const existing = demoStore.get(key);
    if (existing) {
      demoStore.delete(key);
      return { data: null, saved: false, source: "demo" };
    }
    const place = placeName(placeId);
    if (!place) return { data: null, saved: false, source: "demo" };
    const record: SavedPlaceRecord = {
      id: key,
      placeId,
      placeName: place.name,
      placeAddress: place.address,
      createdAt: new Date().toISOString(),
    };
    demoStore.set(key, record);
    return { data: record, saved: true, source: "demo" };
  }

  const existing = await db.savedPlace.findUnique({
    where: { userId_placeId: { userId, placeId } },
  });
  if (existing) {
    await db.savedPlace.delete({ where: { userId_placeId: { userId, placeId } } });
    return { data: null, saved: false, source: "database" };
  }

  const created = await db.savedPlace.create({
    data: { userId, placeId },
    include: { place: true },
  });
  return { data: toRecord(created), saved: true, source: "database" };
}

export async function removeSaved(
  userId: string,
  placeId: string,
): Promise<{ saved: boolean; source: string }> {
  const db = getDb();
  if (!db) {
    const key = `${userId}:${placeId}`;
    demoStore.delete(key);
    return { saved: false, source: "demo" };
  }
  const existing = await db.savedPlace.findUnique({
    where: { userId_placeId: { userId, placeId } },
  });
  if (!existing) return { saved: false, source: "database" };
  await db.savedPlace.delete({ where: { userId_placeId: { userId, placeId } } });
  return { saved: false, source: "database" };
}

export async function isSaved(userId: string, placeId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return demoStore.has(`${userId}:${placeId}`);
  const existing = await db.savedPlace.findUnique({
    where: { userId_placeId: { userId, placeId } },
  });
  return Boolean(existing);
}

function toRecord(row: DbSavedPlace): SavedPlaceRecord {
  return {
    id: row.id,
    placeId: row.placeId,
    placeName: row.place?.name ?? placeName(row.placeId)?.name ?? "Tempat",
    placeAddress: row.place
      ? `${row.place.address ?? ""}${row.place.address ? ", " : ""}${row.place.city}`
      : placeName(row.placeId)?.address ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

export function assertKnownPlace(placeId: string): void {
  const db = getDb();
  if (db) return;
  if (!demoPlaces.find((p) => p.id === placeId)) {
    throw new Error("PLACE_NOT_FOUND");
  }
}

export function assertKnownPlaceId(placeId: string): void {
  if (typeof placeId !== "string" || placeId.length === 0) {
    throw new Error("PLACE_INVALID");
  }
  assertKnownPlace(placeId);
}