import type { Metadata } from "next";
import { NotFoundMessage } from "@/components/site/not-found-message";

export const metadata: Metadata = { title: "Хуудас олдсонгүй" };

// Unmatched URLs render outside the site layout, so this one fills the screen itself
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <NotFoundMessage />
    </main>
  );
}
