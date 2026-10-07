import fs from "node:fs";
import path from "node:path";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { MediaLightbox, type LightboxImage } from "@/components/ui/MediaLightbox";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: t("media"),
    description:
      locale === "fr"
        ? "Nos photos de terrain, au Sénégal, aux côtés des communautés."
        : "Our field photos from Senegal, alongside communities.",
  };
}

/**
 * Uniquement des photos réelles de terrain (dossier fish4acp + vision +
 * Blue-Track) — pas les visuels génériques/stock du dossier `photos`, pour
 * qu'une médiathèque censée prouver la crédibilité de l'organisation ne
 * mélange pas du vrai et du générique sans le dire (brief section 4).
 */
const GALLERY_LEGENDEE: Array<{ src: string; legendeFr: string; legendeEn: string }> = [
  { src: "/media/photos/blue-track-plateforme-full.jpg", legendeFr: "Poste de suivi Blue-Track", legendeEn: "Blue-Track monitoring station" },
  { src: "/media/vision/cooperative-yokhoss-groupe-produit.jpg", legendeFr: "La coopérative de Yokhoss", legendeEn: "The Yokhoss cooperative" },
  { src: "/media/vision/equipe-mangrove-parc-huitres.jpg", legendeFr: "L'équipe dans le parc ostréicole", legendeEn: "The team at the oyster farm" },
  { src: "/media/fish4acp/equipe-terrain-mangrove.jpg", legendeFr: "Équipe de terrain, mangrove de Kayar", legendeEn: "Field team, Kayar mangrove" },
  { src: "/media/fish4acp/equipe-pirogue-salut.jpg", legendeFr: "Départ en pirogue", legendeEn: "Setting off by pirogue" },
  { src: "/media/fish4acp/cooperative-yokhoss.jpg", legendeFr: "Production transformée, coopérative Yokhoss", legendeEn: "Processed produce, Yokhoss cooperative" },
  { src: "/media/fish4acp/ostreiculture-coucher-soleil.jpg", legendeFr: "Récolte au coucher du soleil", legendeEn: "Harvest at sunset" },
  { src: "/media/fish4acp/recolte-huitres-sourire.jpg", legendeFr: "Récolte d'huîtres", legendeEn: "Oyster harvest" },
  { src: "/media/fish4acp/recolte-huitres-plage.jpg", legendeFr: "Sur la plage, parc ostréicole", legendeEn: "On the beach, oyster farm" },
  { src: "/media/fish4acp/entretien-beneficiaire.jpg", legendeFr: "Échange avec une bénéficiaire", legendeEn: "Conversation with a beneficiary" },
  { src: "/media/fish4acp/controle-qualite-huitres.jpg", legendeFr: "Contrôle qualité", legendeEn: "Quality control" },
  { src: "/media/fish4acp/controle-cages-ostreicoles.jpg", legendeFr: "Contrôle des cages ostréicoles", legendeEn: "Checking the oyster cages" },
  { src: "/media/fish4acp/pesee-conditionnement.jpg", legendeFr: "Pesée et conditionnement", legendeEn: "Weighing and packaging" },
  { src: "/media/fish4acp/unite-transformation.jpg", legendeFr: "Unité de transformation", legendeEn: "Processing unit" },
  { src: "/media/fish4acp/zone-ostreicole-pirogues.jpg", legendeFr: "Zone ostréicole", legendeEn: "Oyster-farming area" },
  { src: "/media/fish4acp/equipe-pirogue.jpg", legendeFr: "L'équipe en mer", legendeEn: "The team at sea" },
  { src: "/media/fish4acp/groupe-silhouette-coucher-soleil.jpg", legendeFr: "L'équipe face au coucher de soleil, parc ostréicole", legendeEn: "The team facing the sunset, oyster farm" },
  { src: "/media/fish4acp/silhouette-cage-coucher-soleil-01.jpg", legendeFr: "Transport d'une cage ostréicole, coucher de soleil", legendeEn: "Carrying an oyster cage, sunset" },
  { src: "/media/fish4acp/silhouette-cage-coucher-soleil-02.jpg", legendeFr: "Transport d'une cage ostréicole, coucher de soleil", legendeEn: "Carrying an oyster cage, sunset" },
  { src: "/media/fish4acp/silhouette-cage-coucher-soleil-03.jpg", legendeFr: "Transport d'une cage ostréicole, coucher de soleil", legendeEn: "Carrying an oyster cage, sunset" },
];

/** Le reste du fonds photo terrain (112 fichiers) — pas de légende unique par
 * photo (trop nombreuses pour en rédiger une à la main pour chacune), listées
 * directement depuis le dossier au moment du build plutôt que copiées à la
 * main une par une dans le code. */
function getNouveauPhotos(): string[] {
  const dir = path.join(process.cwd(), "public/media/nouveau");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.jpe?g$/i.test(f))
      .sort()
      .map((f) => `/media/nouveau/${f}`);
  } catch {
    return [];
  }
}

export default async function MediaPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");

  const legendees: LightboxImage[] = GALLERY_LEGENDEE.map((item) => ({
    src: item.src,
    alt: locale === "fr" ? item.legendeFr : item.legendeEn,
  }));
  const dejaListees = new Set(GALLERY_LEGENDEE.map((item) => item.src.split("/").pop()));
  const reste: LightboxImage[] = getNouveauPhotos()
    .filter((src) => !dejaListees.has(src.split("/").pop()))
    .map((src) => ({
      src,
      alt: locale === "fr" ? "Photo de terrain, programme FISH4ACP" : "Field photo, FISH4ACP programme",
    }));

  const images = [...legendees, ...reste];

  return (
    <>
      <PageHero
        title={t("media")}
        subtitle={
          locale === "fr"
            ? "Nos photos de terrain, au Sénégal, aux côtés des communautés."
            : "Our field photos from Senegal, alongside communities."
        }
        image="/media/fish4acp/groupe-silhouette-coucher-soleil.jpg"
      />

      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <p className="mb-10 text-base text-wagadu-ebony/60">
          {locale === "fr"
            ? `${images.length} photos — cliquez sur une image pour l'agrandir.`
            : `${images.length} photos — click an image to view it full-size.`}
        </p>
        <MediaLightbox images={images} />
      </div>
    </>
  );
}
