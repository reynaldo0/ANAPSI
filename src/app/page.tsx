import type { Metadata } from "next";
import { HomeController } from "@/components/home/HomeController";

export const metadata: Metadata = { title: "Beranda" };

export default function HomePage() {
  return <HomeController />;
}