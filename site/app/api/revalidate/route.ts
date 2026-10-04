import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cible du webhook Directus (Flow déclenché sur items.create/update/delete,
 * voir plan section B.4) pour la revalidation ISR à la demande. Le secret
 * partagé est passé soit en en-tête `x-revalidate-secret`, soit dans le body.
 */
export async function POST(request: NextRequest) {
  const secret =
    request.headers.get("x-revalidate-secret") ??
    new URL(request.url).searchParams.get("secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ revalidated: false, error: "Invalid secret" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { tag, path } = body as { tag?: string; path?: string };

  // { expire: 0 } : la donnée est immédiatement considérée périmée, la
  // prochaine requête revalide sans servir de contenu obsolète (Next.js 16
  // exige désormais ce second argument — voir revalidateTag doc).
  if (tag) revalidateTag(tag, { expire: 0 });
  if (path) revalidatePath(path);

  if (!tag && !path) {
    return NextResponse.json({ revalidated: false, error: "Missing tag or path" }, { status: 400 });
  }

  return NextResponse.json({ revalidated: true, tag, path, now: Date.now() });
}
