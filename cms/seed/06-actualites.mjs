// Seed script (dev instance) — collection `actualites` (brief section 3.3,
// fil d'actualités) + premier article réel : la présentation de Blue-Track
// au Ministère des Pêches et de l'Économie maritime du Sénégal, basée sur le
// dossier de présentation officiel (BT/docs/Brochure_BlueTrack_Ministere_
// Peche.pdf, octobre 2026) — faits réels uniquement, rien d'inventé.
// Idempotent.
//
// Usage : node cms/seed/06-actualites.mjs

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
  if (!res.ok) {
    const alreadyExists = JSON.stringify(json)?.includes("already exists");
    if (alreadyExists) return { skipped: true, json };
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function login() {
  const res = await api("POST", "/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  TOKEN = res.data.access_token;
}

async function collectionExists(name) {
  const res = await fetch(`${DIRECTUS_URL}/collections/${name}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.ok;
}

async function ensureCollection(definition) {
  if (await collectionExists(definition.collection)) {
    console.log(`= collection ${definition.collection} existe déjà, skip`);
    return;
  }
  await api("POST", "/collections", definition);
  console.log(`+ collection ${definition.collection} créée`);
}

async function ensureField(collection, field) {
  const res = await fetch(`${DIRECTUS_URL}/fields/${collection}/${field.field}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (res.ok) {
    console.log(`= champ ${collection}.${field.field} existe déjà, skip`);
    return;
  }
  await api("POST", `/fields/${collection}`, field);
  console.log(`+ champ ${collection}.${field.field} créé`);
}

async function ensureRelation(relation) {
  const res = await fetch(
    `${DIRECTUS_URL}/relations/${relation.collection}/${relation.field}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  if (res.ok) {
    console.log(`= relation ${relation.collection}.${relation.field} existe déjà, skip`);
    return;
  }
  await api("POST", "/relations", relation);
  console.log(`+ relation ${relation.collection}.${relation.field} créée`);
}

async function addTranslationsPattern(parentCollection, translatableFields) {
  const junction = `${parentCollection}_translations`;

  await ensureCollection({
    collection: junction,
    meta: { hidden: true, icon: "import_export" },
    schema: {},
    fields: [
      {
        field: "id",
        type: "integer",
        meta: { hidden: true },
        schema: { is_primary_key: true, has_auto_increment: true },
      },
    ],
  });

  await ensureField(junction, { field: `${parentCollection}_id`, type: "uuid", meta: { hidden: true } });
  await ensureField(junction, { field: "languages_code", type: "string", meta: { hidden: true } });

  for (const f of translatableFields) {
    await ensureField(junction, f);
  }

  await ensureRelation({
    collection: junction,
    field: `${parentCollection}_id`,
    related_collection: parentCollection,
    meta: { one_field: "translations", sort_field: null, one_deselect_action: "delete" },
    schema: { on_delete: "CASCADE" },
  });

  await ensureRelation({
    collection: junction,
    field: "languages_code",
    related_collection: "languages",
    meta: { one_field: null },
    schema: { on_delete: "CASCADE" },
  });

  await ensureField(parentCollection, {
    field: "translations",
    type: "alias",
    meta: { interface: "list-o2m", special: ["translations"], sort: 100 },
  });
}

async function setupActualites() {
  await ensureCollection({
    collection: "actualites",
    meta: { icon: "newspaper" },
    schema: {},
    fields: [
      {
        field: "id",
        type: "uuid",
        meta: { hidden: true, interface: "input", special: ["uuid"] },
        schema: { is_primary_key: true, has_auto_increment: false },
      },
      { field: "slug", type: "string", meta: { interface: "input", sort: 2 }, schema: { is_unique: true } },
      {
        field: "status",
        type: "string",
        meta: {
          interface: "select-dropdown",
          sort: 3,
          options: {
            choices: [
              { text: "Published", value: "published" },
              { text: "Draft", value: "draft" },
              { text: "Archived", value: "archived" },
            ],
          },
        },
        schema: { default_value: "draft" },
      },
      {
        field: "date_publication",
        type: "date",
        meta: { interface: "datetime", sort: 4 },
      },
      { field: "image_une", type: "string", meta: { interface: "input", sort: 5, note: "Chemin /media/... (pas de gestionnaire de fichiers Directus pour l'instant)" } },
    ],
  });

  await addTranslationsPattern("actualites", [
    { field: "titre", type: "string", meta: { interface: "input" } },
    { field: "chapo", type: "text", meta: { interface: "input-multiline" } },
    { field: "corps", type: "text", meta: { interface: "input-rich-text-html" } },
  ]);
}

async function seedActualites() {
  const rows = [
    {
      slug: "blue-track-presentation-ministere-peches",
      status: "published",
      date_publication: "2026-10-02",
      image_une: "/media/photos/ministre.jpeg",
      translations: [
        {
          languages_code: "fr",
          titre: "Blue-Track présenté au Ministère des Pêches et de l'Économie maritime",
          chapo:
            "Wagadu Africa a présenté Blue-Track, sa plateforme de suivi GPS des pirogues de pêche artisanale, à Madame la Ministre des Pêches et de l'Économie maritime du Sénégal — une étape clé pour faire de cette initiative citoyenne un outil national de gouvernance maritime.",
          corps: `<p>Wagadu Africa a présenté <strong>Blue-Track</strong> — « Tracking the Sea, Protecting Lives » — à Madame la Ministre des Pêches et de l'Économie maritime de la République du Sénégal, dans le cadre d'un dossier de présentation officiel remis en octobre 2026.</p>
<p>Blue-Track est une plateforme numérique de suivi GPS des pirogues de pêche artisanale, déjà opérationnelle (version 1.0.0, disponible sur web, Android et iOS). Elle répond à un constat documenté sur le terrain : la pêche artisanale représente 95 % des captures nationales et fait vivre plus de 100 000 familles au Sénégal, mais chaque année des dizaines de pêcheurs perdent la vie en mer faute de moyens de localisation et de secours adaptés.</p>
<p>La plateforme combine suivi GPS en temps réel, alerte SOS, cartographie des zones marines, météo maritime et un assistant vocal intelligent en wolof — pensé pour des pêcheurs qui, pour beaucoup, ne lisent ni n'écrivent le français. Wagadu Africa estime qu'un suivi GPS continu et une intervention des secours plus rapide pourraient réduire de 30 à 50 % les décès en mer.</p>
<p>Au Ministère, Wagadu Africa a proposé une donnée centralisée et fiable sur la flotte artisanale nationale, une intégration possible avec les Centres Régionaux de Surveillance des Pêches (CRSP), un appui concret à la lutte contre la pêche illicite, non déclarée et non réglementée (INN), et un déploiement progressif — d'abord à l'échelle d'une région pilote, puis à l'échelle nationale.</p>
<p>« Une initiative citoyenne prête à devenir un outil national de gouvernance maritime », résume le dossier remis à la Ministre. Wagadu Africa porte déjà ce projet sur le terrain, à ses propres moyens — un partenariat avec le Ministère permettrait d'en accélérer significativement le déploiement.</p>`,
        },
        {
          languages_code: "en",
          titre: "Blue-Track presented to the Ministry of Fisheries and Maritime Economy",
          chapo:
            "Wagadu Africa presented Blue-Track, its GPS tracking platform for artisanal fishing pirogues, to the Senegalese Minister of Fisheries and Maritime Economy — a key step toward turning this grassroots initiative into a national maritime governance tool.",
          corps: `<p>Wagadu Africa presented <strong>Blue-Track</strong> — "Tracking the Sea, Protecting Lives" — to the Minister of Fisheries and Maritime Economy of the Republic of Senegal, as part of an official presentation dossier submitted in October 2026.</p>
<p>Blue-Track is a digital GPS tracking platform for artisanal fishing pirogues, already operational (version 1.0.0, available on web, Android and iOS). It responds to a field-documented reality: artisanal fishing accounts for 95% of national catches and supports more than 100,000 families in Senegal, yet every year dozens of fishers lose their lives at sea for lack of proper localization and rescue means.</p>
<p>The platform combines real-time GPS tracking, SOS alerts, marine zone mapping, maritime weather, and an intelligent voice assistant in Wolof — built for fishers who, for many, neither read nor write French. Wagadu Africa estimates that continuous GPS tracking and faster rescue response could reduce deaths at sea by 30 to 50%.</p>
<p>At the Ministry, Wagadu Africa proposed centralized, reliable data on the national artisanal fleet, possible integration with the Regional Fisheries Surveillance Centres (CRSP), concrete support in the fight against illegal, unreported and unregulated (IUU) fishing, and a phased rollout — starting with a pilot region before scaling nationally.</p>
<p>"A grassroots initiative ready to become a national maritime governance tool," the dossier presented to the Minister concludes. Wagadu Africa is already carrying this project forward in the field, with its own means — a partnership with the Ministry would significantly accelerate its deployment.</p>`,
        },
      ],
    },
  ];

  for (const row of rows) {
    const existing = await api("GET", `/items/actualites?filter[slug][_eq]=${row.slug}&fields=id`);
    if (existing.data?.length) {
      console.log(`= actualite ${row.slug} existe déjà, skip`);
      continue;
    }
    await api("POST", "/items/actualites", row);
    console.log(`+ actualite ${row.slug} créée`);
  }
}

async function setupPublicPermissions() {
  // Le rôle "Public" de Directus n'existe pas en tant que ligne `roles` — son
  // accès anonyme passe par une policy nommée littéralement "$t:public_label"
  // (clé de traduction interne, pas un libellé à afficher). Filtrer par
  // `admin_access=false` seul est fragile dès qu'une autre policy non-admin
  // existe (ex. comptes de service formulaire/newsletter) : `[0]` peut alors
  // tomber sur la mauvaise policy et rendre une collection invisible pour le
  // public (bug constaté en pratique sur `actualites`).
  const policies = await api("GET", "/policies?filter[name][_eq]=$t:public_label");
  const publicPolicy = policies.data[0];
  if (!publicPolicy) {
    throw new Error("Policy Public ($t:public_label) introuvable — vérifier le rôle Public de Directus.");
  }

  const grants = [
    { collection: "actualites", filter: { status: { _eq: "published" } } },
    { collection: "actualites_translations", filter: {} },
  ];

  for (const grant of grants) {
    const existing = await api(
      "GET",
      `/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_eq]=${grant.collection}&filter[action][_eq]=read`,
    );
    if (existing.data?.length) {
      console.log(`= permission read ${grant.collection} existe déjà, skip`);
      continue;
    }
    await api("POST", "/permissions", {
      policy: publicPolicy.id,
      collection: grant.collection,
      action: "read",
      permissions: grant.filter,
      fields: ["*"],
    });
    console.log(`+ permission read ${grant.collection} créée`);
  }
}

async function main() {
  await login();
  console.log("Connecté à Directus en tant qu'admin.");

  await setupActualites();
  await seedActualites();
  await setupPublicPermissions();

  console.log("\nSeed terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
