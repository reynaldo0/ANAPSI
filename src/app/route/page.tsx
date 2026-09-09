import type { Metadata } from "next";
import { Suspense } from "react";
import { RoutePlanner } from "@/components/route/RoutePlanner";

export const metadata: Metadata = { title: "Rencanakan Rute" };

export default function RoutePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-h2 font-bold">Rencanakan rute</h1>
        <p className="mt-1 text-muted-foreground">
          Bandingkan rute tercepat dan rute paling aksesibel berdasarkan data komunitas.
        </p>
      </header>
      <Suspense>
        <RoutePlanner />
      </Suspense>
    </div>
  );
}