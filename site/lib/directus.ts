import { createDirectus, rest, staticToken, readItems, readSingleton } from "@directus/sdk";
import type { AppLocale } from "@/i18n/routing";

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const DIRECTUS_PUBLIC_TOKEN = process.env.DIRECTUS_PUBLIC_TOKEN;

/**
 * Le schéma complet (collections listées dans le plan, section B) sera étoffé
 * au fur et à mesure de la Phase 1 — ce type minimal couvre ce qui est déjà
 * consommé par les pages construites en Phase 2.
 */
export type DirectusSchema = {
  realisations: RealisationItem[];
  piliers: PilierItem[];
  valeurs: ValeurItem[];
  pages_statiques: PageStatiqueItem[];
  projets: ProjetItem[];
  parametres_site: ParametresSite;
  actualites: ActualiteItem[];
};

export type Translated<T> = T & {
  translations: Array<{ languages_code: string } & Record<string, unknown>>;
};

export type RealisationTranslation = {
  languages_code: string;
  titre: string;
  resume: string;
  corps: string;
};

export type PilierTranslation = {
  languages_code: string;
  nom: string;
  resume: string;
  description_longue: string;
};

export type PilierItem = {
  id: string;
  slug: "maat" | "technologie" | "environnement";
  couleur_accent: "terracotta" | "amber" | "bark";
  sort: number | null;
  translations: PilierTranslation[];
};

export type RealisationItem = {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived";
  mise_en_avant: boolean;
  sort: number | null;
  template: "standard" | "scroll_story";
  lien_externe: string | null;
  date_realisation: string | null;
  localisation_label: string | null;
  piliers: Array<{ piliers_id: PilierItem }>;
  translations: RealisationTranslation[];
};

export type ParametresSite = {
  id: string;
};

export type ProjetTranslation = {
  languages_code: string;
  titre: string;
  description_courte: string;
  description_detaillee: string;
};

export type ProjetItem = {
  id: string;
  slug: string;
  statut: "en_cours" | "a_venir" | "termine";
  statut_publication: "draft" | "published";
  date_debut: string | null;
  date_fin: string | null;
  zone_geographique: string | null;
  piliers: Array<{ piliers_id: PilierItem }>;
  translations: ProjetTranslation[];
};

export type ValeurTranslation = {
  languages_code: string;
  nom: string;
  description: string;
};

export type ValeurItem = {
  id: string;
  contexte: "accueil" | "qui_sommes_nous";
  sort: number | null;
  translations: ValeurTranslation[];
};

export type PageStatiqueTranslation = {
  languages_code: string;
  titre: string;
  sous_titre: string;
  body: string;
};

export type PageStatiqueItem = {
  id: string;
  slug: string;
  translations: PageStatiqueTranslation[];
};

export type ActualiteTranslation = {
  languages_code: string;
  titre: string;
  chapo: string;
  corps: string;
};

export type ActualiteItem = {
  id: string;
  slug: string;
  status: string;
  date_publication: string;
  image_une: string | null;
  translations: ActualiteTranslation[];
};

/** Traduction résolue pour la locale courante (fallback FR si absente). */
export function pickTranslation<T extends { languages_code: string }>(
  translations: T[],
  locale: AppLocale,
): T | undefined {
  return (
    translations.find((t) => t.languages_code === locale) ??
    translations.find((t) => t.languages_code === "fr") ??
    translations[0]
  );
}

/**
 * Jusqu'à 3 tentatives sur erreur réseau ou 5xx (jamais sur un 4xx, qui
 * indique un vrai bug plutôt qu'un aléa) — Directus met quelques secondes à
 * être réellement prêt à répondre après le démarrage de son conteneur (pas
 * seulement "démarré" au sens Docker), ce qui faisait échouer le tout
 * premier fetch de la page et déclenchait app/[locale]/error.tsx. Corrigé
 * aussi au niveau infra (healthcheck + depends_on condition dans
 * docker-compose.dev.yml) ; ce filet reste utile pour tout aléa réseau
 * ponctuel au-delà du seul démarrage à froid.
 */
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`Directus ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * Crée un client Directus configuré pour le rôle Public (lecture seule),
 * avec un hook `onRequest` qui injecte les options de cache/ISR de Next.js —
 * c'est le point d'extension utilisé par toutes les fonctions `get*` ci-dessous.
 */
function getClient(nextFetchOptions?: NextFetchRequestConfig & { revalidate?: number | false }) {
  const client = createDirectus<DirectusSchema>(DIRECTUS_URL, { globals: { fetch: fetchWithRetry } }).with(rest());

  if (DIRECTUS_PUBLIC_TOKEN) {
    client.with(staticToken(DIRECTUS_PUBLIC_TOKEN));
  }

  // En dev, jamais de cache Next.js sur les données Directus : si Directus
  // répond un jour un tableau vide de façon transitoire (ex. pendant un des
  // nombreux redémarrages de conteneur en développement), le mettre en cache
  // jusqu'à `revalidate` (1h) rendrait le site "cassé" pour tout le monde
  // pendant une heure sans qu'aucun fichier n'ait changé — constaté en
  // pratique. La fraîcheur prime sur la perf en dev ; le cache/ISR normal
  // (tags + revalidate, webhook Directus) ne s'applique qu'en production.
  if (process.env.NODE_ENV !== "production") {
    return client.with(rest({ onRequest: (options) => ({ ...options, cache: "no-store" }) }));
  }

  if (nextFetchOptions) {
    return client.with(
      rest({
        onRequest: (options) => ({ ...options, next: nextFetchOptions }),
      }),
    );
  }

  return client;
}

/**
 * Toutes les requêtes `get*` ci-dessous passent par ici : si Directus est
 * injoignable (build Docker lancé avant que le conteneur `directus` ne
 * tourne — ordre de démarrage, voir docs/deploiement-vps.md —, ou panne
 * transitoire en production), on dégrade vers une valeur vide plutôt que de
 * faire planter toute la page (et donc tout `next build`, puisque ces pages
 * sont pré-rendues statiquement). Le vrai contenu arrive dès la première
 * revalidation ISR une fois Directus accessible.
 */
async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.warn("[directus] requête échouée, repli sur une valeur vide :", error);
    return fallback;
  }
}

/**
 * Ne restreint QUE le sous-ensemble de traductions renvoyé dans le tableau
 * `translations` (via `deep`) — ne doit jamais définir de clé `filter` ici,
 * pour ne pas écraser le filtre principal de chaque requête au spread (bug
 * repéré à l'implémentation : `{filter: A, ...{filter: B}}` perd A).
 */
function translationFilter(locale: AppLocale) {
  return {
    deep: {
      translations: {
        _filter: { languages_code: { _eq: locale } },
      },
    },
  } as const;
}

const REALISATION_FIELDS = [
  "*",
  { translations: ["*"] },
  { piliers: [{ piliers_id: ["*", { translations: ["*"] }] }] },
] as const;

/**
 * Le générateur de types du SDK Directus attend un schéma "plat" (une entrée
 * par collection, sans relations imbriquées) pour inférer `fields`/`filter` —
 * notre schéma applicatif (avec relations résolues) est plus riche que ça.
 * On construit donc les requêtes en `any` ici et on retype le résultat au
 * point d'usage (déjà vérifié par des appels réels contre l'instance locale,
 * voir la vérification manuelle faite pendant la Phase 1).
 */
function query(options: Record<string, unknown>) {
  return options as never;
}

export async function getRealisations(locale: AppLocale): Promise<RealisationItem[]> {
  const client = getClient({ tags: ["realisations"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "realisations",
        query({
          filter: { status: { _eq: "published" } },
          sort: ["-mise_en_avant", "sort"],
          fields: REALISATION_FIELDS,
          ...translationFilter(locale),
        }),
      ),
    ),
    [],
  );
  return rows as unknown as RealisationItem[];
}

export async function getAllRealisationSlugs(): Promise<Array<{ slug: string }>> {
  const client = getClient({ tags: ["realisations"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "realisations",
        query({
          filter: { status: { _eq: "published" } },
          fields: ["slug"],
          limit: -1,
        }),
      ),
    ),
    [],
  );
  return rows as unknown as Array<{ slug: string }>;
}

export async function getRealisationBySlug(
  slug: string,
  locale: AppLocale,
): Promise<RealisationItem | undefined> {
  const client = getClient({ tags: ["realisations"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "realisations",
        query({
          filter: { slug: { _eq: slug }, status: { _eq: "published" } },
          fields: REALISATION_FIELDS,
          limit: 1,
          ...translationFilter(locale),
        }),
      ),
    ),
    [],
  );
  return (rows as unknown as RealisationItem[])[0];
}

export async function getPiliers(locale: AppLocale): Promise<PilierItem[]> {
  const client = getClient({ tags: ["piliers"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "piliers",
        query({
          sort: ["sort"],
          fields: ["*", { translations: ["*"] }],
          ...translationFilter(locale),
        }),
      ),
    ),
    [],
  );
  return rows as unknown as PilierItem[];
}

export async function getValeurs(
  contexte: ValeurItem["contexte"],
  locale: AppLocale,
): Promise<ValeurItem[]> {
  const client = getClient({ tags: ["valeurs"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "valeurs",
        query({
          filter: { contexte: { _eq: contexte } },
          sort: ["sort"],
          fields: ["*", { translations: ["*"] }],
          ...translationFilter(locale),
        }),
      ),
    ),
    [],
  );
  return rows as unknown as ValeurItem[];
}

export async function getPageStatique(
  slug: string,
  locale: AppLocale,
): Promise<PageStatiqueItem | undefined> {
  const client = getClient({ tags: ["pages_statiques"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "pages_statiques",
        query({
          filter: { slug: { _eq: slug } },
          fields: ["*", { translations: ["*"] }],
          limit: 1,
          ...translationFilter(locale),
        }),
      ),
    ),
    [],
  );
  return (rows as unknown as PageStatiqueItem[])[0];
}

export async function getProjets(locale: AppLocale): Promise<ProjetItem[]> {
  const client = getClient({ tags: ["projets"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "projets",
        query({
          filter: { statut_publication: { _eq: "published" } },
          sort: ["sort"],
          fields: ["*", { translations: ["*"] }, { piliers: [{ piliers_id: ["*", { translations: ["*"] }] }] }],
          ...translationFilter(locale),
        }),
      ),
    ),
    [],
  );
  return rows as unknown as ProjetItem[];
}

export async function getActualites(locale: AppLocale): Promise<ActualiteItem[]> {
  const client = getClient({ tags: ["actualites"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "actualites",
        query({
          filter: { status: { _eq: "published" } },
          sort: ["-date_publication"],
          fields: ["*", { translations: ["*"] }],
          ...translationFilter(locale),
        }),
      ),
    ),
    [],
  );
  return rows as unknown as ActualiteItem[];
}

export async function getAllActualiteSlugs(): Promise<Array<{ slug: string }>> {
  const client = getClient({ tags: ["actualites"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "actualites",
        query({ filter: { status: { _eq: "published" } }, fields: ["slug"] }),
      ),
    ),
    [],
  );
  return rows as unknown as Array<{ slug: string }>;
}

export async function getActualiteBySlug(
  slug: string,
  locale: AppLocale,
): Promise<ActualiteItem | undefined> {
  const client = getClient({ tags: ["actualites"], revalidate: 3600 });
  const rows = await safe(
    client.request(
      readItems(
        "actualites",
        query({
          filter: { slug: { _eq: slug }, status: { _eq: "published" } },
          fields: ["*", { translations: ["*"] }],
          limit: 1,
          ...translationFilter(locale),
        }),
      ),
    ),
    [],
  );
  return (rows as unknown as ActualiteItem[])[0];
}

export async function getParametresSite(locale: AppLocale): Promise<ParametresSite> {
  const client = getClient({ tags: ["parametres_site"], revalidate: 3600 });
  const row = await safe(
    client.request(
      readSingleton(
        "parametres_site",
        query({
          fields: ["*", { translations: ["*"] }],
          ...translationFilter(locale),
        }),
      ),
    ),
    {} as ParametresSite,
  );
  return row as unknown as ParametresSite;
}
