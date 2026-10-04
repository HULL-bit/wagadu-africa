// Seed script (dev instance) — étend le schéma avec `valeurs` (grille de 3
// cartes sur l'accueil ET grille de 6 cartes sur Qui sommes-nous, distinguées
// par le champ `contexte`) et `pages_statiques` (positionnement + Vision).
// Contenu migré depuis le brief, sections 2.1 et 2.2. Idempotent.
//
// Usage : node cms/seed/02-valeurs-et-pages.mjs

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

// ---------------------------------------------------------------------------
// valeurs (accueil : 3 cartes — brief 2.1 ; qui-sommes-nous : 6 cartes — 2.2)
// ---------------------------------------------------------------------------
async function setupValeurs() {
  await ensureCollection({
    collection: "valeurs",
    meta: { icon: "favorite" },
    schema: {},
    fields: [
      {
        field: "id",
        type: "uuid",
        meta: { hidden: true, interface: "input", special: ["uuid"] },
        schema: { is_primary_key: true, has_auto_increment: false },
      },
      {
        field: "contexte",
        type: "string",
        meta: {
          interface: "select-dropdown",
          sort: 2,
          note: "Quelle grille affiche cette valeur — accueil (brief 2.1, 3 cartes) ou qui-sommes-nous (brief 2.2, 6 cartes).",
          options: {
            choices: [
              { text: "Accueil", value: "accueil" },
              { text: "Qui sommes-nous", value: "qui_sommes_nous" },
            ],
          },
        },
      },
      { field: "sort", type: "integer", meta: { interface: "input", sort: 3, hidden: true } },
    ],
  });

  await addTranslationsPattern("valeurs", [
    { field: "nom", type: "string", meta: { interface: "input" } },
    { field: "description", type: "text", meta: { interface: "input-multiline" } },
  ]);
}

async function seedValeurs() {
  const rows = [
    // --- Accueil (brief 2.1) ---
    {
      contexte: "accueil",
      sort: 1,
      translations: [
        {
          languages_code: "fr",
          nom: "Éthique",
          description:
            "Engagement réel envers la transparence, l'équité et la redevabilité vis-à-vis des communautés.",
        },
        {
          languages_code: "en",
          nom: "Ethics",
          description:
            "A real commitment to transparency, fairness and accountability towards communities.",
        },
      ],
    },
    {
      contexte: "accueil",
      sort: 2,
      translations: [
        {
          languages_code: "fr",
          nom: "Vérité",
          description:
            "Fondation de l'impact à long terme — pratiques éthiques, relations communautaires fortes, gestion responsable des ressources.",
        },
        {
          languages_code: "en",
          nom: "Truth",
          description:
            "The foundation of long-term impact — ethical practices, strong community relationships, responsible resource management.",
        },
      ],
    },
    {
      contexte: "accueil",
      sort: 3,
      translations: [
        {
          languages_code: "fr",
          nom: "Transparence",
          description: "Confiance mutuelle, communication ouverte et collaboration avec les communautés.",
        },
        {
          languages_code: "en",
          nom: "Transparency",
          description: "Mutual trust, open communication and collaboration with communities.",
        },
      ],
    },
    // --- Qui sommes-nous (brief 2.2, grille de 6) ---
    {
      contexte: "qui_sommes_nous",
      sort: 1,
      translations: [
        { languages_code: "fr", nom: "Maât", description: "Inspire vérité, équité et justice." },
        { languages_code: "en", nom: "Maât", description: "Inspires truth, equity and justice." },
      ],
    },
    {
      contexte: "qui_sommes_nous",
      sort: 2,
      translations: [
        {
          languages_code: "fr",
          nom: "Environnement",
          description: "Promotion de technologies respectueuses de l'environnement.",
        },
        {
          languages_code: "en",
          nom: "Environment",
          description: "Promoting environmentally responsible technologies.",
        },
      ],
    },
    {
      contexte: "qui_sommes_nous",
      sort: 3,
      translations: [
        {
          languages_code: "fr",
          nom: "Technologie",
          description: "Développement et adoption de technologies innovantes, pour tous et par tous.",
        },
        {
          languages_code: "en",
          nom: "Technology",
          description: "Developing and adopting innovative technologies, for everyone and by everyone.",
        },
      ],
    },
    {
      contexte: "qui_sommes_nous",
      sort: 4,
      translations: [
        {
          languages_code: "fr",
          nom: "Éthique, vérité et transparence",
          description: "Gestion transparente des ressources, gouvernance responsable.",
        },
        {
          languages_code: "en",
          nom: "Ethics, truth and transparency",
          description: "Transparent resource management, responsible governance.",
        },
      ],
    },
    {
      contexte: "qui_sommes_nous",
      sort: 5,
      translations: [
        {
          languages_code: "fr",
          nom: "Adaptabilité et durabilité",
          description:
            "Agriculture respectueuse de l'environnement, énergies renouvelables, technologies éco-responsables.",
        },
        {
          languages_code: "en",
          nom: "Adaptability and sustainability",
          description: "Environmentally friendly agriculture, renewable energy, eco-responsible technologies.",
        },
      ],
    },
    {
      contexte: "qui_sommes_nous",
      sort: 6,
      translations: [
        {
          languages_code: "fr",
          nom: "Valorisation du capital humain",
          description:
            "Intégration des valeurs de Maât dans l'éducation, articulation entre pratiques éducatives africaines traditionnelles et savoirs scientifiques modernes.",
        },
        {
          languages_code: "en",
          nom: "Valuing human capital",
          description:
            "Integrating Maât's values into education, bridging traditional African educational practices and modern scientific knowledge.",
        },
      ],
    },
  ];

  for (const row of rows) {
    const nomFr = row.translations.find((t) => t.languages_code === "fr").nom;
    const existing = await api(
      "GET",
      `/items/valeurs?filter[contexte][_eq]=${row.contexte}&filter[translations][nom][_eq]=${encodeURIComponent(nomFr)}&fields=id`,
    );
    if (existing.data?.length) {
      console.log(`= valeur ${row.contexte}/${nomFr} existe déjà, skip`);
      continue;
    }
    await api("POST", "/items/valeurs", row);
    console.log(`+ valeur ${row.contexte}/${nomFr} créée`);
  }
}

// ---------------------------------------------------------------------------
// pages_statiques (positionnement accueil + Vision qui-sommes-nous)
// ---------------------------------------------------------------------------
async function setupPagesStatiques() {
  await ensureCollection({
    collection: "pages_statiques",
    meta: { icon: "description" },
    schema: {},
    fields: [
      {
        field: "id",
        type: "uuid",
        meta: { hidden: true, interface: "input", special: ["uuid"] },
        schema: { is_primary_key: true, has_auto_increment: false },
      },
      { field: "slug", type: "string", meta: { interface: "input", sort: 2 }, schema: { is_unique: true } },
    ],
  });

  await addTranslationsPattern("pages_statiques", [
    { field: "titre", type: "string", meta: { interface: "input" } },
    { field: "sous_titre", type: "text", meta: { interface: "input-multiline" } },
    { field: "body", type: "text", meta: { interface: "input-rich-text-html" } },
  ]);
}

async function seedPagesStatiques() {
  const rows = [
    {
      slug: "accueil-positionnement",
      translations: [
        {
          languages_code: "fr",
          titre: "La donnée et la technologie au service de l'humanité",
          sous_titre:
            "Wagadu construit des outils concrets de collecte et de documentation de données pour que les communautés d'Afrique de l'Ouest fassent valoir leurs droits — Blue-Track en est la preuve.",
          body:
            "<p>Wagadu est une organisation africaine qui met l'héritage africain au service de l'humanité, en conciliant valeurs ancestrales et opportunités modernes pour un progrès harmonieux, équilibré et durable — respectueux de l'environnement et bénéfique pour la société. L'organisation s'appuie sur la résilience et la force intérieure des peuples africains pour construire un avenir positif, à la fois pour l'Afrique et pour l'humanité.</p>",
        },
        {
          languages_code: "en",
          titre: "Data and tech in service of humanity",
          sous_titre:
            "Wagadu builds concrete data collection and documentation tools so West African communities can assert their rights — Blue-Track is the proof.",
          body:
            "<p>Wagadu is an African organization putting African heritage in service of humanity, reconciling ancestral values and modern opportunities for harmonious, balanced and sustainable progress — respectful of the environment and beneficial to society. The organization draws on the resilience and inner strength of African peoples to build a positive future, for Africa and for humanity alike.</p>",
        },
      ],
    },
    {
      slug: "qui-sommes-nous",
      translations: [
        {
          languages_code: "fr",
          titre: "Qui sommes-nous",
          sous_titre:
            "Wagadu promeut un développement durable en Afrique en intégrant science et valeurs culturelles, fondé sur l'ordre, la justice, l'équilibre et la vérité.",
          body:
            "<h2>Vision</h2><p>Harmonie entre tradition et progrès — développement durable équilibré combinant avancée technologique et respect de l'environnement, avec un accent sur la justice sociale, la transparence et des pratiques durables, sans compromettre les besoins des générations futures.</p>",
        },
        {
          languages_code: "en",
          titre: "About us",
          sous_titre:
            "Wagadu promotes sustainable development in Africa by integrating science and cultural values, grounded in order, justice, balance and truth.",
          body:
            "<h2>Vision</h2><p>Harmony between tradition and progress — balanced sustainable development combining technological advancement and respect for the environment, with an emphasis on social justice, transparency and sustainable practices, without compromising the needs of future generations.</p>",
        },
      ],
    },
  ];

  for (const row of rows) {
    const existing = await api("GET", `/items/pages_statiques?filter[slug][_eq]=${row.slug}&fields=id`);
    if (existing.data?.length) {
      console.log(`= page_statique ${row.slug} existe déjà, skip`);
      continue;
    }
    await api("POST", "/items/pages_statiques", row);
    console.log(`+ page_statique ${row.slug} créée`);
  }
}

// ---------------------------------------------------------------------------
// Permissions du rôle Public
// ---------------------------------------------------------------------------
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
    { collection: "valeurs", filter: {} },
    { collection: "valeurs_translations", filter: {} },
    { collection: "pages_statiques", filter: {} },
    { collection: "pages_statiques_translations", filter: {} },
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

  await setupValeurs();
  await seedValeurs();

  await setupPagesStatiques();
  await seedPagesStatiques();

  await setupPublicPermissions();

  console.log("\nSeed terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
