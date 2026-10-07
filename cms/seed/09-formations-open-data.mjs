// Crée la collection `formations` (section "Formations Open Data" du
// document NGO "Site WAGADU – Propositions d'amélioration" : intitulé,
// année, lieu, public, nombre de participants).
//
// Aucune ligne n'est seedée : les formations réelles (à partir du CV cité
// dans le document) n'ont pas encore été listées par l'ONG. Le rendu public
// (site/app/[locale]/realisations/page.tsx) n'affiche la section que si au
// moins une formation existe — tant que la collection est vide, rien ne
// s'affiche (jamais de tableau "[À COMPLÉTER]" visible aux visiteurs).
// Une fois des lignes ajoutées dans Directus (Contenu → Formations), elles
// apparaissent automatiquement, sans nouveau déploiement.
//
// Idempotent. Usage : DIRECTUS_URL=https://cms.wagadu-africa.org node cms/seed/09-formations-open-data.mjs

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
  const res = await fetch(`${DIRECTUS_URL}/relations/${relation.collection}/${relation.field}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
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
      { field: "id", type: "integer", meta: { hidden: true }, schema: { is_primary_key: true, has_auto_increment: true } },
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

async function setupFormations() {
  await ensureCollection({
    collection: "formations",
    meta: { icon: "school", note: "Section « Formations Open Data » — retour NGO." },
    schema: {},
    fields: [
      {
        field: "id",
        type: "uuid",
        meta: { hidden: true, interface: "input", special: ["uuid"] },
        schema: { is_primary_key: true, has_auto_increment: false },
      },
      { field: "annee", type: "string", meta: { interface: "input", sort: 2, note: "Ex. \"2024\"" } },
      { field: "lieu", type: "string", meta: { interface: "input", sort: 3 } },
      { field: "participants", type: "integer", meta: { interface: "input", sort: 4, note: "Nombre de participants" } },
      { field: "sort", type: "integer", meta: { interface: "input", sort: 5, hidden: true } },
    ],
  });

  await addTranslationsPattern("formations", [
    { field: "intitule", type: "string", meta: { interface: "input" } },
    { field: "public_cible", type: "string", meta: { interface: "input", note: "Ex. \"Ostréicultrices de Yokhoss\"" } },
  ]);
}

async function setupPublicPermissions() {
  const policies = await api("GET", "/policies?filter[name][_eq]=$t:public_label");
  const publicPolicy = policies.data[0];
  if (!publicPolicy) {
    throw new Error("Policy Public ($t:public_label) introuvable — vérifier le rôle Public de Directus.");
  }

  const grants = [
    { collection: "formations", fields: ["*"], filter: {} },
    { collection: "formations_translations", fields: ["*"], filter: {} },
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
      fields: grant.fields,
    });
    console.log(`+ permission read ${grant.collection} créée`);
  }
}

async function main() {
  await login();
  await setupFormations();
  await setupPublicPermissions();
  console.log("Terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
