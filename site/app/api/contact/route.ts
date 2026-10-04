import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const CONTACT_FORM_TOKEN = process.env.DIRECTUS_CONTACT_FORM_TOKEN;

/**
 * Écrit dans la collection Directus `messages_contact` via un token de
 * service dédié, permission unique : create (rôle "Site Public (formulaire
 * contact)") — jamais le token public en lecture seule du reste du site, et
 * jamais un compte admin. Voir cms/schema pour la définition de la
 * collection/permission.
 */
export async function POST(request: Request) {
  if (!CONTACT_FORM_TOKEN) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  let body: { nom?: string; email?: string; telephone?: string; message?: string; site_web?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Piège à robots (brief section 7 : anti-spam sans dépendance tierce
  // payante) — un champ caché que seul un bot remplit ; on répond succès
  // sans rien écrire, pour ne pas révéler le filtre.
  if (body.site_web) {
    return NextResponse.json({ ok: true });
  }

  const nom = body.nom?.trim();
  const email = body.email?.trim();
  const message = body.message?.trim();
  const telephone = body.telephone?.trim() || null;

  if (!nom || !email || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const res = await fetch(`${DIRECTUS_URL}/items/messages_contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONTACT_FORM_TOKEN}`,
    },
    body: JSON.stringify({ nom, email, telephone, message }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
