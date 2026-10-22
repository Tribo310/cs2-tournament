import type { Metadata, Viewport } from "next";
import { Exo_2, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Both fonts cover Mongolian Cyrillic (Ө ө Ү ү) — verified in phase 1.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const exo = Exo_2({
  variable: "--font-exo",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "CS2 Тэмцээн",
    template: "%s · CS2 Тэмцээн",
  },
  description: "CS2 тэмцээний хуваарь, үр дүн, групп болон плей-оффын шат.",
};

export const viewport: Viewport = {
  themeColor: "#0a0d12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="mn"
      className={`dark ${inter.variable} ${exo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
