import { collections } from "@/lib/db/mongo";
import { parseId } from "@/lib/data/queries";

// Logo ids change on every upload, so responses are immutable.
export async function GET(_req: Request, ctx: RouteContext<"/api/logos/[id]">) {
  const { id } = await ctx.params;
  const _id = parseId(id);
  if (!_id) return new Response("Not found", { status: 404 });

  const { logos } = await collections();
  const logo = await logos.findOne({ _id });
  if (!logo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(logo.data.buffer), {
    headers: {
      "Content-Type": logo.contentType,
      "Content-Length": String(logo.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
