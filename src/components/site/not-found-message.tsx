import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NotFoundMessage() {
  return (
    <div className="grid min-h-[50dvh] place-items-center px-4 text-center">
      <div className="space-y-4">
        <p className="font-heading text-6xl font-extrabold text-primary">404</p>
        <h1 className="text-xl font-bold">Хуудас олдсонгүй</h1>
        <p className="text-sm text-muted-foreground">Энэ хуудас устсан эсвэл хаяг буруу байна.</p>
        <Button asChild>
          <Link href="/">Нүүр хуудас руу буцах</Link>
        </Button>
      </div>
    </div>
  );
}
