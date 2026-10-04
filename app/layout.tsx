import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gita Daily — A moment of wisdom, every day",
  description: "A daily Bhagavad Gita companion with Sanskrit shlokas, meanings and mindful reminders.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}