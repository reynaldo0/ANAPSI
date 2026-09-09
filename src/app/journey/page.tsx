import type { Metadata } from "next";
import { Suspense } from "react";
import { JourneyController } from "@/components/journey/JourneyController";

export const metadata: Metadata = { title: "Perjalanan" };

export default function JourneyPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <Suspense>
        <JourneyController />
      </Suspense>
    </div>
  );
}