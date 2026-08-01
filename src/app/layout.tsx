import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/kit";

export const metadata: Metadata = {
  title: "StatLab — MATH 1342",
  description:
    "An evidence-based learning system for Elementary Statistical Methods: lessons, practice, mock exams, flashcards, and an AI tutor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-[#e8eaf0] antialiased">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">{children}</main>
      </body>
    </html>
  );
}
