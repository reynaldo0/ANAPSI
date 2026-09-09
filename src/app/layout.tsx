import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem("blindspot:appearance");var s=raw?JSON.parse(raw):{};var theme=s.theme||"system";var isDark=theme==="dark"||(theme==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var el=document.documentElement;el.setAttribute("data-theme",isDark?"dark":"light");el.style.colorScheme=isDark?"dark":"light";if(s.highContrast)el.setAttribute("data-high-contrast","true");}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "BLINDSPOT — Navigate Beyond Barriers",
    template: "%s · BLINDSPOT",
  },
  description:
    "Platform navigasi aksesibilitas personal untuk tunanetra dan pengguna kursi roda. Temukan tempat dan rute aman berdasarkan kebutuhanmu.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
