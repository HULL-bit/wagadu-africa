// Seed script (dev instance) — corrections de contenu demandées par
// l'utilisateur en session : (1) le "Projet Pêche Kayar" et "Blue-Track" ne
// sont PAS deux réalisations distinctes, Kayar EST le terrain de Blue-Track
// — fusion en une seule fiche ; (2) ajout des deux autres projets réellement
// réalisés par Wagadu : O'Crystal (eau minérale, ocrystal.sn) et FISH4ACP
// (collecte de données économiques KoboToolbox pour la filière pêche,
// Sénégal). Idempotent.
//
// Usage : node cms/seed/04-realisations-reelles.mjs

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
  const res = await api(
    "GET",
    `/items/realisations?filter[slug][_eq]=${slug}&fields=id,slug,translations.id,translations.languages_code`,
  );
  return res.data?.[0];
}

async function main() {
  await login();
  console.log("Connecté à Directus en tant qu'admin.");

  const technologieId = await getPilierId("technologie");
  const environnementId = await getPilierId("environnement");
  const maatId = await getPilierId("maat");

  // --- 1. Fusion : Blue-Track absorbe le récit Kayar, publié ---
  const blueTrack = await getRealisationBySlug("blue-track");
  if (blueTrack) {
    const frTrans = blueTrack.translations.find((t) => t.languages_code === "fr");
    const enTrans = blueTrack.translations.find((t) => t.languages_code === "en");

    await api("PATCH", `/items/realisations/${blueTrack.id}`, {
      status: "published",
      localisation_label: "Kayar et zones côtières, Sénégal",
    });

    if (frTrans) {
      await api("PATCH", `/items/realisations_translations/${frTrans.id}`, {
        resume:
          "Tracking the sea, protecting lives — la plateforme que les pêcheurs de Kayar utilisent pour documenter et défendre leurs droits face aux atteintes à leur environnement et à leur activité.",
        corps:
          "<p>Blue-Track est la plateforme numérique développée dans le cadre de l'action de Wagadu pour permettre aux communautés de terrain — pêcheurs en première ligne — de documenter et de faire valoir leurs droits face aux atteintes environnementales et sociales, notamment celles liées à l'exploitation pétrolière et gazière au large du Sénégal.</p><p>À Kayar, les pêcheurs ont été formés à la législation, à la protection du milieu marin et aux impacts de cette exploitation. Auparavant démunis pour prouver leurs griefs, ils ont été formés et équipés pour utiliser Blue-Track afin de documenter eux-mêmes les preuves des atteintes à leurs ressources. Une communauté informée peut ainsi produire ses propres preuves — une bascule du statut de victime à celui d'acteur responsable de son propre avenir.</p><p><em>Captures d'écran et fonctionnalités précises de la plateforme à enrichir avec l'équipe dès qu'elles sont disponibles.</em></p>",
      });
    }
    if (enTrans) {
      await api("PATCH", `/items/realisations_translations/${enTrans.id}`, {
        resume:
          "Tracking the sea, protecting lives — the platform Kayar's fishers use to document and defend their rights against threats to their environment and livelihoods.",
        corps:
          "<p>Blue-Track is the digital platform developed as part of Wagadu's work to let frontline communities — fishers first and foremost — document and assert their rights against environmental and social harm, particularly from offshore oil and gas exploitation off Senegal's coast.</p><p>In Kayar, fishers were trained in legislation, marine environment protection, and the impacts of this exploitation. Previously unable to prove their grievances, they were trained and equipped to use Blue-Track to document evidence of harm to their resources themselves. An informed community can produce its own evidence — a shift from victim status to that of a responsible actor in its own future.</p><p><em>Real platform screenshots and precise features to be added with the team once available.</em></p>",
      });
    }
    console.log("~ blue-track : fusionné avec le récit Kayar, publié");
  }

  // --- Archiver l'ancienne fiche séparée "Projet Pêche — Kayar" ---
  const kayar = await getRealisationBySlug("projet-peche-kayar");
  if (kayar) {
    await api("PATCH", `/items/realisations/${kayar.id}`, { status: "archived" });
    console.log("~ projet-peche-kayar : archivé (fusionné dans blue-track)");
  }

  // --- 2. O'Crystal ---
  const existingOcrystal = await getRealisationBySlug("ocrystal");
  if (!existingOcrystal) {
    await api("POST", "/items/realisations", {
      slug: "ocrystal",
      status: "published",
      mise_en_avant: true,
      template: "standard",
      sort: 3,
      lien_externe: "https://ocrystal.sn",
      localisation_label: "Niague, Sénégal",
      piliers: { create: [{ piliers_id: { id: technologieId } }, { piliers_id: { id: environnementId } }], update: [], delete: [] },
      translations: [
        {
          languages_code: "fr",
          titre: "O'Crystal",
          resume: "Née à Niague, pensée pour le monde — le site vitrine et distributeur de l'eau minérale naturelle O'Crystal, conçu et développé par Wagadu.",
          corps: "<p>O'Crystal est une eau minérale naturelle puisée à la source de Niague, au Sénégal, proposée en six formats. Wagadu a conçu et développé le site de la marque : présentation de la source et de sa minéralité, filtration naturelle, réseau de distributeurs, actualités.</p>",
        },
        {
          languages_code: "en",
          titre: "O'Crystal",
          resume: "Born in Niague, made for the world — the showcase and distributor site for O'Crystal natural mineral water, designed and built by Wagadu.",
          corps: "<p>O'Crystal is a natural mineral water drawn from the Niague source in Senegal, sold in six formats. Wagadu designed and built the brand's website: the source and its mineral balance, natural filtration, distributor network, news.</p>",
        },
      ],
    });
    console.log("+ réalisation ocrystal créée");
  } else {
    console.log("= réalisation ocrystal existe déjà, skip");
  }

  // --- 3. FISH4ACP ---
  const existingFish = await getRealisationBySlug("fish4acp");
  if (!existingFish) {
    await api("POST", "/items/realisations", {
      slug: "fish4acp",
      status: "published",
      mise_en_avant: true,
      template: "standard",
      sort: 4,
      lien_externe: null,
      localisation_label: "Thiès, Dakar, Ziguinchor, Saint-Louis — Sénégal",
      piliers: { create: [{ piliers_id: { id: technologieId } }, { piliers_id: { id: maatId } }], update: [], delete: [] },
      translations: [
        {
          languages_code: "fr",
          titre: "FISH4ACP",
          resume: "Une contribution de Wagadu à la collecte de données économiques pour la filière pêche sénégalaise, dans le cadre du programme international FISH4ACP.",
          corps: "<p>Wagadu a contribué à la collecte de données de terrain pour le questionnaire de performance économique de la filière pêche au Sénégal, dans le cadre du programme international FISH4ACP — mené auprès d'organisations de pêcheurs sur plusieurs régions du littoral (Thiès, Dakar, Ziguinchor, Saint-Louis), via l'outil KoboToolbox.</p><p><em>Description à affiner avec l'équipe : rôle exact de Wagadu et partenaires du programme à préciser avant publication définitive.</em></p>",
        },
        {
          languages_code: "en",
          titre: "FISH4ACP",
          resume: "A Wagadu contribution to economic data collection for Senegal's fisheries value chain, under the international FISH4ACP programme.",
          corps: "<p>Wagadu contributed field data collection for the economic performance questionnaire of Senegal's fisheries value chain, under the international FISH4ACP programme — conducted with fishing organizations across several coastal regions (Thiès, Dakar, Ziguinchor, Saint-Louis), using KoboToolbox.</p><p><em>Description to refine with the team: Wagadu's exact role and programme partners to confirm before final publication.</em></p>",
        },
      ],
    });
    console.log("+ réalisation fish4acp créée");
  } else {
    console.log("= réalisation fish4acp existe déjà, skip");
  }

  console.log("\nSeed terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
