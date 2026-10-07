// Applique les corrections "Phase 1" du document NGO "Site WAGADU –
// Propositions d'amélioration" qui touchent du contenu déjà existant en base
// (donc hors de portée des scripts 01-06, qui ne font qu'insérer si absent) :
//   - pilier "technologie" renommé "Données & Technologie" (ex "Our technology")
//   - pilier "environnement" retitré "Environnement, climat et biodiversité"
//   - mot du fondateur réécrit à la première personne (structure : pourquoi/
//     ce qui distingue/une preuve/une invitation), 1er jet validé à partir du
//     contenu déjà réel (aucun fait inventé — FISH4ACP+FAO, Blue-Track).
// Idempotent : relit l'existant par slug+langue, PATCH direct (pas de POST).
//
// Usage : DIRECTUS_URL=https://cms.wagadu-africa.org node cms/seed/07-propositions-ong-phase1.mjs

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@wagadu-africa.org";
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? "wagadu-dev-admin";

let TOKEN;

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
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

async function patchPilierTranslation(pilierSlug, languageCode, fields) {
  const pilier = await api(
    "GET",
    `/items/piliers?filter[slug][_eq]=${pilierSlug}&fields=translations.id,translations.languages_code`,
  );
  const row = pilier.data?.[0]?.translations?.find((t) => t.languages_code === languageCode);
  if (!row) {
    console.warn(`! pilier ${pilierSlug} (${languageCode}) introuvable, skip`);
    return;
  }
  await api("PATCH", `/items/piliers_translations/${row.id}`, fields);
  console.log(`= pilier ${pilierSlug} (${languageCode}) mis à jour`);
}

async function patchPageStatiqueTranslation(slug, languageCode, fields) {
  const page = await api(
    "GET",
    `/items/pages_statiques?filter[slug][_eq]=${slug}&fields=translations.id,translations.languages_code`,
  );
  const row = page.data?.[0]?.translations?.find((t) => t.languages_code === languageCode);
  if (!row) {
    console.warn(`! page_statique ${slug} (${languageCode}) introuvable, skip`);
    return;
  }
  await api("PATCH", `/items/pages_statiques_translations/${row.id}`, fields);
  console.log(`= page_statique ${slug} (${languageCode}) mise à jour`);
}

async function main() {
  await login();

  await patchPilierTranslation("technologie", "fr", {
    nom: "Données & Technologie",
    resume: "Collecte, analyse, visualisation et formation : des outils numériques pensés avec les communautés.",
  });
  await patchPilierTranslation("technologie", "en", {
    nom: "Data & Technology",
    resume: "Collection, analysis, visualization and training: digital tools designed with communities.",
  });

  await patchPilierTranslation("environnement", "fr", {
    nom: "Environnement, climat et biodiversité",
    resume:
      "Des données pour protéger mangroves et zones de pêche, et bâtir une adaptation durable face au changement climatique.",
  });
  await patchPilierTranslation("environnement", "en", {
    nom: "Environment, climate and biodiversity",
    resume: "Data to protect mangroves and fishing grounds, building durable adaptation to climate change.",
  });

  await patchPageStatiqueTranslation("mot-fondateur", "fr", {
    body:
      "<p>Si j'ai fondé Wagadu Africa, c'est par conviction : trop de décisions qui touchent nos communautés — pêcheurs, ostréicultrices, familles côtières — se prennent sans données fiables sur leur réalité. Ce qui nous distingue, c'est notre manière de travailler : nous allions la donnée et le terrain, en formant les communautés à documenter elles-mêmes ce qu'elles vivent, plutôt que de parler à leur place.</p><p>Avec FISH4ACP, aux côtés de la FAO, nous avons accompagné la coopérative de Yokhoss dans la transformation et la valorisation de ses huîtres. Et notre plateforme Blue-Track, née d'une initiative citoyenne, a été présentée au Ministère des Pêches. Rejoignez-nous pour faire de la donnée un outil entre les mains des communautés.</p>",
  });
  await patchPageStatiqueTranslation("mot-fondateur", "en", {
    body:
      "<p>I founded Wagadu Africa out of one conviction: too many decisions affecting our communities — fishers, oyster farmers, coastal families — are made without reliable data about their reality. What sets us apart is how we work: we bring data and fieldwork together, training communities to document their own reality rather than speaking for them.</p><p>Through FISH4ACP, alongside the FAO, we supported the Yokhoss cooperative in processing and selling its oysters. And Blue-Track, born as a grassroots initiative, was presented to Senegal's Ministry of Fisheries. Join us in putting data into communities' own hands.</p>",
  });

  console.log("Terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
