// Nouvelle réalisation "ETF" (Energy Transition Fund) — formation des
// pêcheurs de Kayar à la législation, à la protection du milieu marin et
// aux impacts de l'exploitation pétrolière/gazière. Contenu et titre fournis
// directement par l'ONG (EN), FR traduit fidèlement. Photos réelles fournies
// par l'ONG (dossier media/ETF/ETF), compressées et copiées dans
// site/public/media/etf/. Idempotent.
//
// Usage : DIRECTUS_URL=https://cms.wagadu-africa.org node cms/seed/12-etf-realisation.mjs

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@wagadu-africa.org";
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? "wagadu-dev-admin";

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

async function getPilierId(slug) {
  const res = await api("GET", `/items/piliers?filter[slug][_eq]=${slug}&fields=id`);
  return res.data?.[0]?.id;
}

async function getRealisationBySlug(slug) {
  const res = await api("GET", `/items/realisations?filter[slug][_eq]=${slug}&fields=id`);
  return res.data?.[0];
}

async function main() {
  await login();

  const maatId = await getPilierId("maat");
  const environnementId = await getPilierId("environnement");

  const existing = await getRealisationBySlug("etf");
  if (existing) {
    console.log("= réalisation etf existe déjà, skip");
    return;
  }

  await api("POST", "/items/realisations", {
    slug: "etf",
    status: "published",
    mise_en_avant: false,
    template: "standard",
    sort: 5,
    lien_externe: null,
    localisation_label: "Kayar, Sénégal",
    piliers: { create: [{ piliers_id: { id: maatId } }, { piliers_id: { id: environnementId } }], update: [], delete: [] },
    translations: [
      {
        languages_code: "fr",
        titre: "Combler le fossé technologique pour protéger la pêche artisanale face aux impacts négatifs des projets pétroliers et gaziers au Sénégal",
        resume:
          "Formés au droit et aux technologies, les pêcheurs de Kayar documentent eux-mêmes les impacts de l'exploitation pétrolière et gazière sur leur activité.",
        corps:
          "<p>Les pêcheurs de Kayar ont reçu des formations sur la législation, la protection du milieu marin et les impacts négatifs de l'exploitation pétrolière et gazière. Cela leur a donné les moyens de s'y opposer plus efficacement. Ils comprennent désormais l'enjeu, ses conséquences, et savent qu'ils sont protégés par la loi. Ni les institutions publiques ni les institutions privées n'ont le droit de nuire à leurs activités ou aux ressources dont ils dépendent.</p><p>Auparavant, ils ne pouvaient pas faire valoir leurs griefs faute de moyens pour les prouver ; c'est pourquoi Wagadu les a formés et équipés pour utiliser ces technologies. Ainsi, une communauté informée, consciente de ses droits et qui comprend l'enjeu, est capable de produire ses propres preuves pour faire fructifier les connaissances reçues. Les synergies entre communautés amélioreront la visibilité et feront passer le paradigme de victimes à celui de personnes responsables de leur propre avenir.</p>",
      },
      {
        languages_code: "en",
        titre: "Bridging the gap in new technologies to protect small-scale fisheries against negative impacts of oil and gas projects in Senegal",
        resume:
          "Trained in law and technology, Kayar's fishing communities now document for themselves the impacts of oil and gas exploitation on their livelihoods.",
        corps:
          "<p>Kayar fishermen have received trainings in legislation, marine environment protection and negative impacts oil and gas exploitation. This has empowered and enabled them to oppose more effectively. They now understand the issue, its consequences and they also know that they are protected by the legislation. Neither public nor private institutions have the right to harm their activities or the resources on which they depend.</p><p>Previously, they were unable to pursue their grievances because they lacked the means to prove them, for this reason Wagadu has trained and equipped them to use the technologies. Thus, an informed community that is aware of its rights and understands the issue is able to provide its own evidence to catalyze the knowledge received. Synergies between communities will improve visibility and change the paradigm from one of victims to one of people who are responsible for their own future.</p>",
      },
    ],
  });
  console.log("+ réalisation etf créée");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
