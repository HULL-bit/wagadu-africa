import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const NEWSLETTER_TOKEN = process.env.DIRECTUS_NEWSLETTER_TOKEN;

/**
 * Écrit dans la collection Directus `newsletter_abonnes` via un token de
 * service dédié, permission unique : create (rôle "Site Public
 * (newsletter)") — même principe que /api/contact.
 */
export async function POST(request: Request) {
  if (!NEWSLETTER_TOKEN) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  let body: { email?: string; langue?: string; site_web?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.site_web) {
    return NextResponse.json({ ok: true });
  }

  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const res = await fetch(`${DIRECTUS_URL}/items/newsletter_abonnes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NEWSLETTER_TOKEN}`,
    },
    body: JSON.stringify({ email, langue: body.langue === "en" ? "en" : "fr" }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
