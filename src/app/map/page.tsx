import type { Metadata } from "next";
import { Suspense } from "react";
import { MapPageController } from "@/components/map/MapPageController";

export const metadata: Metadata = { title: "Peta Aksesibilitas" };

export default function MapPage() {
  return (
    <Suspense>
      <MapPageController />
    </Suspense>
  );
}