// Seed script (dev instance) — collections `messages_contact` et
// `newsletter_abonnes` (écriture publique restreinte), chacune avec son
// propre rôle "Site Public (...)" + policy create-only + utilisateur de
// service porteur d'un jeton statique. Reproduit ce qui avait été mis en
// place à la main pour /api/contact et /api/newsletter (site/app/api/) —
// jamais scripté avant, d'où sa création après une perte de volume Postgres.
// Idempotent.
//
// Usage : node cms/seed/05-contact-newsletter.mjs
// Affiche les jetons statiques à coller dans site/.env.local
// (DIRECTUS_CONTACT_FORM_TOKEN / DIRECTUS_NEWSLETTER_TOKEN).

import crypto from "node:crypto";

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

async function findRoleByName(name) {
  const res = await api("GET", `/roles?filter[name][_eq]=${encodeURIComponent(name)}&fields=id`);
  return res.data[0]?.id ?? null;
}

async function findUserByEmail(email) {
  const res = await api(
    "GET",
    `/users?filter[email][_eq]=${encodeURIComponent(email)}&fields=id,token`,
  );
  return res.data[0] ?? null;
}

/**
 * Rôle dédié minimal + policy create-only sur une seule collection + user de
 * service porteur d'un jeton statique — jamais le rôle Public (lecture
 * seule) ni un compte admin, pour que ce jeton ne puisse rien faire d'autre
 * que créer une ligne dans `collection` (brief section 7, anti-abus).
 */
async function ensureServiceRole({ roleName, policyName, collection, serviceEmail }) {
  let roleId = await findRoleByName(roleName);
  if (!roleId) {
    const role = await api("POST", "/roles", {
      name: roleName,
      icon: "mail",
      admin_access: false,
      app_access: false,
    });
    roleId = role.data.id;
    console.log(`+ rôle ${roleName} créé`);

    const policy = await api("POST", "/policies", {
      name: policyName,
      icon: "mail",
      admin_access: false,
      app_access: false,
    });
    const policyId = policy.data.id;
    console.log(`+ policy ${policyName} créée`);

    await api("PATCH", `/roles/${roleId}`, {
      policies: { create: [{ policy: { id: policyId } }], update: [], delete: [] },
    });

    await api("POST", "/permissions", {
      policy: policyId,
      collection,
      action: "create",
      permissions: {},
      fields: ["*"],
    });
    console.log(`+ permission create ${collection} (policy ${policyName}) créée`);
  } else {
    console.log(`= rôle ${roleName} existe déjà, skip`);
  }

  let user = await findUserByEmail(serviceEmail);
  let token = user?.token;
  if (!user) {
    token = `wagadu-${collection}-${crypto.randomBytes(16).toString("hex")}`;
    await api("POST", "/users", {
      email: serviceEmail,
      password: crypto.randomBytes(24).toString("hex"),
      role: roleId,
      token,
      status: "active",
    });
    console.log(`+ utilisateur de service ${serviceEmail} créé`);
  } else {
    console.log(`= utilisateur de service ${serviceEmail} existe déjà, skip`);
  }

  return token;
}

// ---------------------------------------------------------------------------
// messages_contact — /contact (brief section 3.9)
// ---------------------------------------------------------------------------
async function setupMessagesContact() {
  await ensureCollection({
    collection: "messages_contact",
    meta: { icon: "mail", note: "Messages reçus via le formulaire /contact du site public." },
    schema: {},
    fields: [
      {
        field: "id",
        type: "uuid",
        meta: { hidden: true, interface: "input", special: ["uuid"] },
        schema: { is_primary_key: true, has_auto_increment: false },
      },
      { field: "nom", type: "string", meta: { interface: "input", sort: 2 } },
      { field: "email", type: "string", meta: { interface: "input", sort: 3 } },
      { field: "telephone", type: "string", meta: { interface: "input", sort: 4 } },
      { field: "message", type: "text", meta: { interface: "input-multiline", sort: 5 } },
      {
        field: "lu",
        type: "boolean",
        meta: { interface: "boolean", sort: 6, note: "Coché une fois traité par l'équipe." },
        schema: { default_value: false },
      },
      {
        field: "date_created",
        type: "timestamp",
        meta: { special: ["date-created"], interface: "datetime", readonly: true, hidden: true, sort: 7 },
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// newsletter_abonnes — pied de page, toutes les pages (brief section 4)
// ---------------------------------------------------------------------------
async function setupNewsletterAbonnes() {
  await ensureCollection({
    collection: "newsletter_abonnes",
    meta: { icon: "forward_to_inbox", note: "Inscriptions à la newsletter via le pied de page." },
    schema: {},
    fields: [
      {
        field: "id",
        type: "uuid",
        meta: { hidden: true, interface: "input", special: ["uuid"] },
        schema: { is_primary_key: true, has_auto_increment: false },
      },
      {
        field: "email",
        type: "string",
        meta: { interface: "input", sort: 2 },
        schema: { is_unique: true },
      },
      {
        field: "langue",
        type: "string",
        meta: {
          interface: "select-dropdown",
          sort: 3,
          options: { choices: [{ text: "Français", value: "fr" }, { text: "English", value: "en" }] },
        },
        schema: { default_value: "fr" },
      },
      {
        field: "date_created",
        type: "timestamp",
        meta: { special: ["date-created"], interface: "datetime", readonly: true, hidden: true, sort: 4 },
      },
    ],
  });
}

async function main() {
  await login();
  console.log("Connecté à Directus en tant qu'admin.");

  await setupMessagesContact();
  await setupNewsletterAbonnes();

  const contactToken = await ensureServiceRole({
    roleName: "Site Public (formulaire contact)",
    policyName: "Formulaire contact — create only",
    collection: "messages_contact",
    serviceEmail: "svc-contact@wagadu-africa.org",
  });

  const newsletterToken = await ensureServiceRole({
    roleName: "Site Public (newsletter)",
    policyName: "Newsletter — create only",
    collection: "newsletter_abonnes",
    serviceEmail: "svc-newsletter@wagadu-africa.org",
  });

  console.log("\nSeed terminé. Colle ces valeurs dans site/.env.local :\n");
  console.log(`DIRECTUS_CONTACT_FORM_TOKEN=${contactToken}`);
  console.log(`DIRECTUS_NEWSLETTER_TOKEN=${newsletterToken}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
