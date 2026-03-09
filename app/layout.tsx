// app/layout.tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PageTransitionProvider } from "../components/providers/TransitionProvider";
import SakuraController from "../components/SakuraController";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { Toaster } from "react-hot-toast";

const fontSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "INKAI-APP",
  description: "Sistem Informasi Karate Modern",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${fontSans.variable} ${fontMono.variable} antialiased`}
      >
        {/* EFFECTS */}
        <SakuraController />

        {/* PROVIDERS */}
        <SupabaseProvider>
          <PageTransitionProvider>{children}</PageTransitionProvider>
        </SupabaseProvider>

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 5000,
            style: {
              background: "rgb(24 24 27)",
              color: "rgb(244 244 245)",
              border: "1px solid rgba(251 191 36 / 0.2)",
              borderRadius: "12px",
              padding: "14px 18px",
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
            },
            success: {
              iconTheme: { primary: "rgb(52 211 153)", secondary: "rgb(24 24 27)" },
            },
            error: {
              style: {
                background: "rgb(24 24 27)",
                color: "rgb(244 244 245)",
                border: "1px solid rgba(248 113 113 / 0.35)",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
              },
              iconTheme: { primary: "rgb(248 113 113)", secondary: "rgb(24 24 27)" },
            },
          }}
        />
      </body>
    </html>
  );
}
