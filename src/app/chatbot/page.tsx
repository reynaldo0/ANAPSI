import type { Metadata } from "next";
import { GroqBlindChatbot } from "@/components/chatbot/GroqBlindChatbot";
export const metadata: Metadata = { title: "Chatbot Tunanetra — Groq" };
export default function Page() { return <GroqBlindChatbot />; }
