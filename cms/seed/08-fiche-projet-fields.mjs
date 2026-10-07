// Étend `realisations` / `realisations_translations` avec les champs du
// modèle de "fiche projet" demandé par le document NGO "Site WAGADU –
// Propositions d'amélioration" (section "Convaincre les partenaires") :
// trois résultats chiffrés, un témoignage, un rapport téléchargeable.
//
// Aucune valeur n'est seedée ici : ces données n'existent pas encore côté
// ONG (pas de chiffres confirmés, pas de témoignage recueilli, pas de PDF).
// Les champs restent vides — le rendu public (site/app/[locale]/
// realisations/[slug]/page.tsx) n'affiche chaque bloc que si son contenu est
// renseigné, pour ne jamais publier de [À COMPLÉTER] visible aux visiteurs.
// Une fois rempli dans Directus (menu Contenu → Réalisations), ça s'affiche
// automatiquement, sans nouveau déploiement.
//
// Idempotent : ensureField ne recrée rien si le champ existe déjà.
//
// Usage : DIRECTUS_URL=https://cms.wagadu-africa.org node cms/seed/08-fiche-projet-fields.mjs

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

async function main() {
  await login();

  for (const n of [1, 2, 3]) {
    await ensureField("realisations_translations", {
      field: `resultat_${n}`,
      type: "string",
      meta: {
        interface: "input",
        note: `Résultat chiffré ${n} (ex. "120 ostréicultrices formées en 2025") — laisser vide tant que non confirmé.`,
      },
    });
  }

  await ensureField("realisations_translations", {
    field: "temoignage_citation",
    type: "text",
    meta: { interface: "input-multiline", note: "Citation d'une personne réelle, avec son accord — laisser vide sinon." },
  });
  await ensureField("realisations_translations", {
    field: "temoignage_auteur",
    type: "string",
    meta: { interface: "input", note: "Nom et rôle de la personne citée." },
  });

  await ensureField("realisations", {
    field: "rapport_url",
    type: "string",
    meta: {
      interface: "input",
      note: "Lien vers le rapport/publication téléchargeable (PDF hébergé sur Directus ou ailleurs) — laisser vide tant qu'il n'existe pas.",
    },
  });

  console.log("Terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
