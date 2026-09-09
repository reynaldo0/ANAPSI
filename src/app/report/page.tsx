import type { Metadata } from "next";
import { ReportFlow } from "@/components/report/ReportFlow";

export const metadata: Metadata = { title: "Lapor Hambatan" };

export default function ReportPage() {
  return <ReportFlow />;
}