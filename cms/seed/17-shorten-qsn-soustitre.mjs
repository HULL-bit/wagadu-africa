// Raccourcit le sous_titre de qui-sommes-nous (utilisé comme sous-titre du
// 1er slide du carrousel À propos) — trop long, se faisait tronquer avec
// des points de suspension dans la petite carte (retour utilisateur).
//
// Usage (depuis le conteneur directus) :
//   DIRECTUS_ADMIN_EMAIL="$ADMIN_EMAIL" DIRECTUS_ADMIN_PASSWORD="$ADMIN_PASSWORD" DIRECTUS_URL=http://localhost:8055 node 17-shorten-qsn-soustitre.mjs

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

const SOUS_TITRE = {
  fr: "Un développement durable en Afrique, fondé sur l'ordre, la justice et la vérité.",
  en: "Sustainable development in Africa, grounded in order, justice and truth.",
};

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("DIRECTUS_ADMIN_EMAIL / DIRECTUS_ADMIN_PASSWORD manquants");
  await login();

  const res = await api(
    "GET",
    `/items/pages_statiques?filter[slug][_eq]=qui-sommes-nous&fields=translations.id,translations.languages_code`,
  );
  const page = res.data?.[0];
  if (!page) throw new Error("page qui-sommes-nous introuvable");

  for (const tr of page.translations) {
    const value = SOUS_TITRE[tr.languages_code];
    if (!value) continue;
    await api("PATCH", `/items/pages_statiques_translations/${tr.id}`, { sous_titre: value });
    console.log(`+ ${tr.languages_code} : "${value}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
