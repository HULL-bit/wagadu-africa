// Seed script (dev instance) — crée la collection `projets` (plan section
// B.3), distincte de `realisations` (portefeuille d'initiatives en cours,
// pas des réussites déjà obtenues). Aucun contenu réel n'existe encore pour
// cette collection dans le brief (section 2) au-delà de ce qui vit déjà dans
// `realisations` — on pose donc la structure sans fabriquer de faux projets ;
// le relation vers `partenaires` sera ajoutée en Phase 4 quand cette
// collection existera. Idempotent.
//
// Usage : node cms/seed/03-projets.mjs

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

async function setupProjets() {
  await ensureCollection({
    collection: "projets",
    meta: { icon: "rocket_launch" },
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
        field: "statut",
        type: "string",
        meta: {
          interface: "select-dropdown",
          sort: 3,
          options: {
            choices: [
              { text: "En cours", value: "en_cours" },
              { text: "À venir", value: "a_venir" },
              { text: "Terminé", value: "termine" },
            ],
          },
        },
        schema: { default_value: "a_venir" },
      },
      {
        field: "statut_publication",
        type: "string",
        meta: {
          interface: "select-dropdown",
          sort: 4,
          width: "half",
          options: {
            choices: [
              { text: "Brouillon", value: "draft" },
              { text: "Publié", value: "published" },
            ],
          },
        },
        schema: { default_value: "draft" },
      },
      { field: "date_debut", type: "date", meta: { interface: "datetime", sort: 5, width: "half" } },
      { field: "date_fin", type: "date", meta: { interface: "datetime", sort: 6, width: "half" } },
      { field: "zone_geographique", type: "string", meta: { interface: "input", sort: 7 } },
      { field: "sort", type: "integer", meta: { interface: "input", sort: 8, hidden: true } },
    ],
  });

  await addTranslationsPattern("projets", [
    { field: "titre", type: "string", meta: { interface: "input" } },
    { field: "description_courte", type: "text", meta: { interface: "input-multiline" } },
    { field: "description_detaillee", type: "text", meta: { interface: "input-rich-text-html" } },
  ]);

  const junction = "projets_piliers";
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
  await ensureField(junction, { field: "projets_id", type: "uuid", meta: { hidden: true } });
  await ensureField(junction, { field: "piliers_id", type: "uuid", meta: { hidden: true } });

  await ensureRelation({
    collection: junction,
    field: "projets_id",
    related_collection: "projets",
    meta: { one_field: "piliers", junction_field: "piliers_id" },
    schema: { on_delete: "CASCADE" },
  });
  await ensureRelation({
    collection: junction,
    field: "piliers_id",
    related_collection: "piliers",
    meta: { one_field: null, junction_field: "projets_id" },
    schema: { on_delete: "CASCADE" },
  });

  await ensureField("projets", {
    field: "piliers",
    type: "alias",
    meta: { interface: "list-m2m", special: ["m2m"], sort: 101 },
  });
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
    {
      collection: "projets",
      filter: { statut_publication: { _eq: "published" } },
    },
    {
      collection: "projets_translations",
      filter: { projets_id: { statut_publication: { _eq: "published" } } },
    },
    { collection: "projets_piliers", filter: {} },
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

  await setupProjets();
  await setupPublicPermissions();

  console.log("\nSeed terminé (collection `projets` prête, sans contenu fabriqué).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
