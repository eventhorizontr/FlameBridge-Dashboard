import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { DashboardRuntime } from "@/lib/store/dashboard-runtime";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Fire in Freefall", template: "%s · Fire in Freefall" },
  description:
    "Explore NASA microgravity combustion experiments (PSI-25 BASS-II) with interactive visualizations, real ISS flame footage and an AI research assistant.",
};

export const viewport: Viewport = {
  themeColor: "#04060b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NuqsAdapter>
          <DashboardRuntime />
          {children}
        </NuqsAdapter>
      </body>
    </html>
  );
}
