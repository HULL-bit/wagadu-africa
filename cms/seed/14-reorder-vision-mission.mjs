// Inverse l'ordre Mission/Vision sur qui-sommes-nous : Vision doit venir
// avant Mission (retour utilisateur). Réordonne les sections <h2> existantes
// plutôt que de retaper le texte. Idempotent (si Vision est déjà en premier,
// skip).
//
// Usage (depuis le conteneur directus, ADMIN_EMAIL/ADMIN_PASSWORD déjà dans
// son environnement) :
//   DIRECTUS_ADMIN_EMAIL="$ADMIN_EMAIL" DIRECTUS_ADMIN_PASSWORD="$ADMIN_PASSWORD" DIRECTUS_URL=http://localhost:8055 node 14-reorder-vision-mission.mjs

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD;

let TOKEN;

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function login() {
  const res = await api("POST", "/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  TOKEN = res.data.access_token;
}

function splitSections(html) {
  const parts = html.split(/<h2>(.*?)<\/h2>/);
  const sections = [];
  for (let i = 1; i < parts.length; i += 2) {
    sections.push({ heading: parts[i], bodyHtml: parts[i + 1] ?? "" });
  }
  return sections;
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("DIRECTUS_ADMIN_EMAIL / DIRECTUS_ADMIN_PASSWORD manquants");
  await login();

  const res = await api(
    "GET",
    `/items/pages_statiques?filter[slug][_eq]=qui-sommes-nous&fields=id,translations.id,translations.languages_code,translations.body`,
  );
  const page = res.data?.[0];
  if (!page) throw new Error("page qui-sommes-nous introuvable");

  for (const tr of page.translations) {
    const sections = splitSections(tr.body ?? "");
    const visionIndex = sections.findIndex((s) => s.heading === "Vision");
    if (visionIndex <= 0) {
      console.log(`= ${tr.languages_code} : Vision déjà en premier (ou absente), skip`);
      continue;
    }
    const reordered = [sections[visionIndex], ...sections.filter((_, i) => i !== visionIndex)];
    const newBody = reordered.map((s) => `<h2>${s.heading}</h2>${s.bodyHtml}`).join("");
    await api("PATCH", `/items/pages_statiques_translations/${tr.id}`, { body: newBody });
    console.log(`+ ${tr.languages_code} : Vision remontée avant Mission`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
