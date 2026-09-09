import type { Metadata } from "next";
import { Assistant } from "@/components/assistant/Assistant";

export const metadata: Metadata = { title: "Tanya Asisten" };

export default function AssistantPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Assistant />
    </div>
  );
}