import type { Metadata } from "next";
import { BlindChatbot } from "@/components/chatbot/BlindChatbot";
export const metadata: Metadata = { title: "Chatbot Tunanetra" };
export default function Page() { return <BlindChatbot />; }