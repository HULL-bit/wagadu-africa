// Ajoute un paragraphe "Mission" juste avant "Vision" sur la page
// qui-sommes-nous (pages_statiques), FR + EN. Texte fourni directement par
// l'ONG. Idempotent : si le body contient déjà "<h2>Mission</h2>", skip.
//
// Usage : DIRECTUS_URL=... DIRECTUS_ADMIN_EMAIL=... DIRECTUS_ADMIN_PASSWORD=... node 13-ajout-mission.mjs

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

const MISSION_HTML = {
  fr: "<h2>Mission</h2><p>WAGADU considère l’Afrique de l’Ouest comme une seule et même communauté, unie par une histoire, des valeurs et un destin commun qui dépassent les frontières. Inspirés par les valeurs de la Maât et les principes de la Charte du Manden, nous œuvrons à promouvoir la paix, l’éducation, la justice, le développement économique et la dignité humaine dans toute la région. Nous croyons que les défis des peuples ouest-africains, comme l’urbanisation galopante, la protection des communautés et la gestion équitable des ressources naturelles entre autres, appellent des réponses partagées, solidaires, ancrées dans notre héritage commun et les innovations technologiques. Ensemble, bâtissons une Afrique de l’Ouest unie, juste et prospère.</p>",
  en: "<h2>Mission</h2><p>WAGADU views West Africa as a single community, united by a shared history, values, and destiny that transcend borders. Inspired by the values of Ma’at and the principles of the Manden Charter, we work to promote peace, education, justice, economic development, and human dignity throughout the region. We believe that the challenges facing the peoples of West Africa—such as rapid urbanization, community protection, and the equitable management of natural resources, among others—call for shared, collaborative responses rooted in our common heritage and technological innovations. Together, let us build a united, just, and prosperous West Africa.</p>",
};

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
    const lang = tr.languages_code;
    if (!MISSION_HTML[lang]) continue;
    if (tr.body?.includes("<h2>Mission</h2>")) {
      console.log(`= ${lang} contient déjà Mission, skip`);
      continue;
    }
    const newBody = MISSION_HTML[lang] + (tr.body ?? "");
    await api("PATCH", `/items/pages_statiques_translations/${tr.id}`, { body: newBody });
    console.log(`+ ${lang} : Mission ajoutée avant Vision`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
