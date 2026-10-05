/**
 * Correspondance slug → média réel, le temps que l'équipe Wagadu charge les
 * vraies images dans Directus (galeries `realisations`/`piliers`, brief
 * section 5). En attendant, on utilise les vrais médias déjà récupérés du
 * site WordPress (dossier /media à la racine du dépôt, copiés dans
 * /public/media) plutôt que des blocs de couleur unis — jamais d'image
 * générique quand un vrai visuel Wagadu existe (brief section 4).
 */
export const PILIER_IMAGES: Record<string, string> = {
  maat: "/media/fish4acp/cooperative-yokhoss.jpg",
  // Poste de suivi Blue-Track — même photo que `REALISATION_IMAGES["blue-track"]`.
  technologie: "/media/tech/blue-track-carte-marine.png",
  environnement: "/media/fish4acp/ostreiculture-coucher-soleil.jpg",
};

/**
 * Note qualité : les visuels `/media/photos/*` viennent du dump WordPress
 * d'origine et ne font que ~300px de large — corrects en vignette (galeries,
 * médaillons ≤300px), mais flous dès qu'ils sont étirés en grand (hero,
 * cartes, panneaux ≥400px). Ces contextes-là utilisent donc exclusivement
 * les photos haute résolution `/media/fish4acp/*` (2048px) et
 * `/media/tech/technologie-0{1-5}*` (1920px).
 *
 * `blue-track` : photo réelle fournie par l'équipe (poste de suivi
 * GPS/données), en pleine résolution (1600×1066) — remplace l'ancienne
 * vignette 300×200 rééchantillonnée en douceur (`-hd.jpg`, gardée seulement
 * pour le médaillon secondaire ≤80px ci-dessous, où elle reste nette).
 */
export const REALISATION_IMAGES: Record<string, string> = {
  "blue-track": "/media/photos/blue-track-plateforme-full.jpg",
  ocrystal: "/media/tech/ocrystal-bouteille.jpg",
  fish4acp: "/media/fish4acp/equipe-terrain-mangrove.jpg",
  // Photo générique de mangrove (paysage, aucune personne, aucun lieu
  // identifiable) — en attendant une vraie photo du programme lui-même
  // (équipe, plantation, plateforme). Deux autres fichiers fournis pour ce
  // projet ont été écartés : l'un credité à un photographe tiers au Kenya
  // (Gasi Bay), l'autre pris à Sumatra pour une autre campagne — ni l'un ni
  // l'autre ne représentent le travail de Wagadu.
  "mangroves-reforestation": "/media/photos/mangrove-foret-cotiere.jpg",
};

/** Deuxième visuel réel par réalisation — insert en médaillon sur les cartes
 * (accueil + liste réalisations) pour que chaque carte porte au moins 2
 * images plutôt qu'une seule (retour utilisateur : « ajoute d'autres
 * images »). Affiché en petit (≤80px), donc les vignettes basse résolution
 * restent nettes ici. */
export const REALISATION_IMAGES_SECONDARY: Record<string, string> = {
  "blue-track": "/media/photos/atelier-equipe-ordinateur-01.jpg",
  ocrystal: "/media/tech/technologie-02-laptop.jpg",
  fish4acp: "/media/fish4acp/recolte-huitres-plage.jpg",
  "mangroves-reforestation": "/media/vision/equipe-mangrove-parc-huitres.jpg",
};

export const FALLBACK_CARD_IMAGE = "/media/fish4acp/zone-ostreicole-pirogues.jpg";

/** Sous-thématiques affichées en petites étiquettes sur les cartes piliers de
 * l'accueil — reprend la structure de `/thematiques` (brief : Data/Tech/IA
 * sous Technologie, etc.) pour que ce soit explicite dès l'accueil. */
export const PILIER_TAGS: Record<string, string[]> = {
  technologie: ["Data", "Tech", "IA"],
  maat: ["Souveraineté alimentaire", "Santé", "Droits humains"],
  environnement: ["Conservation", "Énergies renouvelables", "Kayar"],
};

/** Motif africain riche et multicolore (brief section 4) — séparateur de
 * section plein écran, jamais en fond de texte courant. Repris du Hub
 * (`frontend/public/brand/bg-pattern.jpg`), où il n'est utilisé qu'en
 * filigrane à 5% d'opacité ; ici on l'assume pleinement, en franc. */
export const MOTIF_AFRICAIN_COLORE = "/media/brand/motif-africain-colore.jpg";
