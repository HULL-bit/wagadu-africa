// Seed script (dev instance) — crée le schéma Directus (collections B.1-B.3
// du plan) et le contenu réel migré pour les réalisations prioritaires
// (Blue-Track, Kayar) + les 3 piliers. Idempotent : relance sans erreur si
// les collections existent déjà (skip silencieux).
//
// Usage : DIRECTUS_URL=http://localhost:8055 node cms/seed/schema-and-content.mjs

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

// ---------------------------------------------------------------------------
// 1. languages
// ---------------------------------------------------------------------------
async function setupLanguages() {
  await ensureCollection({
    collection: "languages",
    meta: { icon: "translate", singleton: false },
    schema: {},
    fields: [
      {
        field: "code",
        type: "string",
        meta: { interface: "input", readonly: false, sort: 1 },
        schema: { is_primary_key: true, has_auto_increment: false, max_length: 10 },
      },
      { field: "name", type: "string", meta: { interface: "input", sort: 2 } },
    ],
  });
}

async function seedLanguages() {
  for (const row of [
    { code: "fr", name: "Français" },
    { code: "en", name: "English" },
  ]) {
    const exists = await fetch(`${DIRECTUS_URL}/items/languages/${row.code}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (exists.ok) continue;
    await api("POST", "/items/languages", row);
  }
}

// ---------------------------------------------------------------------------
// Helper générique : ajoute le pattern "Translations" natif à une collection
// déjà créée avec au moins son champ id (uuid).
// ---------------------------------------------------------------------------
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

  await ensureField(junction, {
    field: `${parentCollection}_id`,
    type: "uuid",
    meta: { hidden: true },
  });
  await ensureField(junction, {
    field: "languages_code",
    type: "string",
    meta: { hidden: true },
  });

  for (const f of translatableFields) {
    await ensureField(junction, f);
  }

  await ensureRelation({
    collection: junction,
    field: `${parentCollection}_id`,
    related_collection: parentCollection,
    meta: {
      one_field: "translations",
      sort_field: null,
      one_deselect_action: "delete",
    },
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

// ---------------------------------------------------------------------------
// 2. piliers
// ---------------------------------------------------------------------------
async function setupPiliers() {
  await ensureCollection({
    collection: "piliers",
    meta: { icon: "auto_awesome" },
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
        field: "couleur_accent",
        type: "string",
        meta: {
          interface: "select-dropdown",
          sort: 3,
          options: {
            choices: [
              { text: "Terracotta", value: "terracotta" },
              { text: "Amber", value: "amber" },
              { text: "Bark (technologie)", value: "bark" },
            ],
          },
        },
      },
      { field: "sort", type: "integer", meta: { interface: "input", sort: 4, hidden: true } },
    ],
  });

  await addTranslationsPattern("piliers", [
    { field: "nom", type: "string", meta: { interface: "input" } },
    { field: "resume", type: "text", meta: { interface: "input-multiline" } },
    { field: "description_longue", type: "text", meta: { interface: "input-rich-text-html" } },
  ]);
}

async function seedPiliers() {
  const rows = [
    {
      slug: "maat",
      couleur_accent: "terracotta",
      sort: 1,
      translations: [
        {
          languages_code: "fr",
          nom: "Maât",
          resume:
            "Engagement pour les droits fondamentaux, la lutte contre les discriminations, la transparence et la redevabilité.",
          description_longue:
            "Maât inspire vérité, équité et justice. Ce pilier porte la dimension sociale de Wagadu : droits humains, impact social, souveraineté alimentaire — en référence à la Charte de Kurukan Fuga.",
        },
        {
          languages_code: "en",
          nom: "Maât",
          resume:
            "Commitment to fundamental rights, the fight against discrimination, transparency and accountability.",
          description_longue:
            "Maât inspires truth, equity and justice. This pillar carries Wagadu's social dimension: human rights, social impact, food sovereignty — referencing the Kurukan Fuga Charter.",
        },
      ],
    },
    {
      slug: "technologie",
      couleur_accent: "bark",
      sort: 2,
      translations: [
        {
          languages_code: "fr",
          nom: "Technologie",
          resume:
            "Recherche de la connaissance, développement de technologies innovantes, accessibles et utiles à tous.",
          description_longue:
            "La donnée au service de l'humanité : Data, Tech et IA au service des communautés, illustrés concrètement par Blue-Track — la plateforme de documentation et de défense des droits des pêcheurs.",
        },
        {
          languages_code: "en",
          nom: "Technology",
          resume:
            "Pursuit of knowledge, development of innovative technologies, accessible and useful to all.",
          description_longue:
            "Data in service of humanity: Data, Tech and AI serving communities, embodied by Blue-Track — the platform fishing communities use to document and defend their rights.",
        },
      ],
    },
    {
      slug: "environnement",
      couleur_accent: "amber",
      sort: 3,
      translations: [
        {
          languages_code: "fr",
          nom: "Environnement",
          resume:
            "Solutions environnementales durables, préservation des ressources naturelles, équilibre entre développement économique et conservation des écosystèmes.",
          description_longue:
            "Gestion des ressources naturelles, biodiversité, énergies renouvelables — un pilier de travail concret et mesurable, pas seulement un décor.",
        },
        {
          languages_code: "en",
          nom: "Environment",
          resume:
            "Sustainable environmental solutions, preservation of natural resources, balance between economic development and ecosystem conservation.",
          description_longue:
            "Natural resource management, biodiversity, renewable energy — a concrete, measurable pillar of work, not just scenery.",
        },
      ],
    },
  ];

  for (const row of rows) {
    const existing = await api(
      "GET",
      `/items/piliers?filter[slug][_eq]=${row.slug}&fields=id`,
    );
    if (existing.data?.length) {
      console.log(`= pilier ${row.slug} existe déjà, skip`);
      continue;
    }
    await api("POST", "/items/piliers", row);
    console.log(`+ pilier ${row.slug} créé`);
  }
}

// ---------------------------------------------------------------------------
// 3. realisations (+ M2M piliers)
// ---------------------------------------------------------------------------
async function setupRealisations() {
  await ensureCollection({
    collection: "realisations",
    meta: { icon: "star" },
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
          width: "half",
          options: {
            choices: [
              { text: "Brouillon", value: "draft" },
              { text: "Publié", value: "published" },
              { text: "Archivé", value: "archived" },
            ],
          },
        },
        schema: { default_value: "draft" },
      },
      {
        field: "mise_en_avant",
        type: "boolean",
        meta: { interface: "boolean", sort: 4, width: "half" },
        schema: { default_value: false },
      },
      {
        field: "template",
        type: "string",
        meta: {
          interface: "select-dropdown",
          sort: 5,
          width: "half",
          options: {
            choices: [
              { text: "Standard", value: "standard" },
              { text: "Scroll story", value: "scroll_story" },
            ],
          },
        },
        schema: { default_value: "standard" },
      },
      { field: "sort", type: "integer", meta: { interface: "input", sort: 6, hidden: true } },
      { field: "lien_externe", type: "string", meta: { interface: "input", sort: 7 } },
      { field: "date_realisation", type: "date", meta: { interface: "datetime", sort: 8 } },
      {
        field: "localisation_label",
        type: "string",
        meta: {
          interface: "input",
          sort: 9,
          note: "Texte libre pour l'instant (ex: \"Kayar, Sénégal\") — à remplacer par un vrai champ geometry.Point une fois PostGIS confirmé sur l'instance de production (voir plan section B.3).",
        },
      },
    ],
  });

  await addTranslationsPattern("realisations", [
    { field: "titre", type: "string", meta: { interface: "input" } },
    { field: "resume", type: "text", meta: { interface: "input-multiline" } },
    { field: "corps", type: "text", meta: { interface: "input-rich-text-html" } },
  ]);

  // M2M realisations <-> piliers
  const junction = "realisations_piliers";
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
  await ensureField(junction, { field: "realisations_id", type: "uuid", meta: { hidden: true } });
  await ensureField(junction, { field: "piliers_id", type: "uuid", meta: { hidden: true } });

  await ensureRelation({
    collection: junction,
    field: "realisations_id",
    related_collection: "realisations",
    meta: { one_field: "piliers", junction_field: "piliers_id" },
    schema: { on_delete: "CASCADE" },
  });
  await ensureRelation({
    collection: junction,
    field: "piliers_id",
    related_collection: "piliers",
    meta: { one_field: null, junction_field: "realisations_id" },
    schema: { on_delete: "CASCADE" },
  });

  await ensureField("realisations", {
    field: "piliers",
    type: "alias",
    meta: { interface: "list-m2m", special: ["m2m"], sort: 101 },
  });
}

async function getPilierId(slug) {
  const res = await api("GET", `/items/piliers?filter[slug][_eq]=${slug}&fields=id`);
  return res.data?.[0]?.id;
}

async function seedRealisations() {
  const technologieId = await getPilierId("technologie");
  const environnementId = await getPilierId("environnement");
  const maatId = await getPilierId("maat");

  const rows = [
    {
      slug: "blue-track",
      status: "draft",
      mise_en_avant: true,
      template: "scroll_story",
      sort: 1,
      lien_externe: "https://www.blue-track.org",
      localisation_label: "Kayar et zones côtières, Sénégal",
      piliers: { create: [{ piliers_id: { id: technologieId } }, { piliers_id: { id: environnementId } }], update: [], delete: [] },
      translations: [
        {
          languages_code: "fr",
          titre: "Blue-Track",
          resume:
            "Tracking the sea, protecting lives — une plateforme numérique pour que les communautés côtières documentent et défendent leurs droits face aux atteintes à leur environnement et à leur activité.",
          corps:
            "<p>Blue-Track est la plateforme numérique développée dans le cadre de l'action de Wagadu pour permettre aux communautés de terrain — pêcheurs en première ligne — de documenter et de faire valoir leurs droits face aux atteintes environnementales et sociales, notamment celles liées à l'exploitation pétrolière et gazière au large du Sénégal.</p><p>Concrètement, la plateforme donne aux communautés les moyens de produire leurs propres preuves (constats, incidents, atteintes aux ressources), là où elles étaient auparavant démunies pour faire valoir leurs griefs. C'est l'outil concret derrière l'engagement de transparence et de redevabilité de Wagadu : transformer des communautés informées de leurs droits en acteurs responsables de leur propre avenir, plutôt qu'en victimes sans recours.</p><p><em>Brouillon à valider avec l'équipe et à enrichir dès que le contenu réel de blue-track.org est disponible (captures d'écran, fonctionnalités précises, chiffres d'usage).</em></p>",
        },
        {
          languages_code: "en",
          titre: "Blue-Track",
          resume:
            "Tracking the sea, protecting lives — a digital platform for coastal communities to document and defend their rights against threats to their environment and livelihoods.",
          corps:
            "<p>Blue-Track is the digital platform developed as part of Wagadu's work to let frontline communities — fishers first and foremost — document and assert their rights against environmental and social harm, particularly from offshore oil and gas exploitation off Senegal's coast.</p><p>In practice, the platform gives communities the means to produce their own evidence (incidents, resource damage), where they previously had no way to substantiate their grievances. This is the concrete tool behind Wagadu's commitment to transparency and accountability: turning communities aware of their rights into responsible actors in their own future, rather than victims without recourse.</p><p><em>Draft copy pending team review and enrichment once real content from blue-track.org is available (screenshots, precise features, usage figures).</em></p>",
        },
      ],
    },
    {
      slug: "projet-peche-kayar",
      status: "published",
      mise_en_avant: false,
      template: "standard",
      sort: 2,
      lien_externe: null,
      localisation_label: "Kayar, Sénégal",
      piliers: { create: [{ piliers_id: { id: environnementId } }, { piliers_id: { id: maatId } }], update: [], delete: [] },
      translations: [
        {
          languages_code: "fr",
          titre: "Projet Pêche — Kayar",
          resume:
            "Des pêcheurs formés à la législation et à la protection du milieu marin, désormais capables de documenter eux-mêmes les atteintes à leurs droits grâce à Blue-Track.",
          corps:
            "<p>Les pêcheurs de Kayar ont été formés à la législation, à la protection du milieu marin et aux impacts négatifs de l'exploitation pétrolière et gazière au Sénégal. Cette formation leur a permis de mieux s'opposer aux atteintes à leur activité et aux ressources dont ils dépendent, en comprenant leurs droits et les protections légales existantes.</p><p>Auparavant dans l'incapacité de prouver leurs griefs, ils ont été formés et équipés pour utiliser la plateforme Blue-Track, afin de documenter eux-mêmes les preuves. Une communauté informée peut ainsi produire ses propres preuves — une bascule du statut de victime à celui d'acteur responsable de son propre avenir.</p>",
        },
        {
          languages_code: "en",
          titre: "Fishing Project — Kayar",
          resume:
            "Fishers trained in legislation and marine environment protection, now able to document rights violations themselves using Blue-Track.",
          corps:
            "<p>Kayar's fishers were trained in legislation, marine environment protection, and the negative impacts of oil and gas exploitation in Senegal. This training helped them better oppose harm to their activity and the resources they depend on, by understanding their rights and existing legal protections.</p><p>Previously unable to prove their grievances, they were trained and equipped to use the Blue-Track platform to document evidence themselves. An informed community can produce its own evidence — a shift from victim status to that of a responsible actor in its own future.</p>",
        },
      ],
    },
  ];

  for (const row of rows) {
    const existing = await api("GET", `/items/realisations?filter[slug][_eq]=${row.slug}&fields=id`);
    if (existing.data?.length) {
      console.log(`= réalisation ${row.slug} existe déjà, skip`);
      continue;
    }
    await api("POST", "/items/realisations", row);
    console.log(`+ réalisation ${row.slug} créée`);
  }
}

// ---------------------------------------------------------------------------
// 4. Permissions du rôle Public
// ---------------------------------------------------------------------------
async function setupPublicPermissions() {
  const policies = await api("GET", "/policies?filter[admin_access][_eq]=false");
  const publicPolicy = policies.data[0];
  if (!publicPolicy) throw new Error("Politique Public introuvable");

  const grants = [
    { collection: "languages", fields: ["*"], filter: {} },
    { collection: "piliers", fields: ["*"], filter: {} },
    { collection: "piliers_translations", fields: ["*"], filter: {} },
    {
      collection: "realisations",
      fields: ["*"],
      filter: { status: { _eq: "published" } },
    },
    {
      collection: "realisations_translations",
      fields: ["*"],
      filter: { realisations_id: { status: { _eq: "published" } } },
    },
    { collection: "realisations_piliers", fields: ["*"], filter: {} },
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
  console.log("Connecté à Directus en tant qu'admin.");

  await setupLanguages();
  await seedLanguages();

  await setupPiliers();
  await seedPiliers();

  await setupRealisations();
  await seedRealisations();

  await setupPublicPermissions();

  console.log("\nSeed terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
