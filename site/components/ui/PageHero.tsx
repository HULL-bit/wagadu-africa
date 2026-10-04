import Image from "next/image";
import { WaveDivider } from "@/components/ui/WaveDivider";

/**
 * Bannière de sous-page générique (brief section 4 : "motif de branches en
 * filigrane... à généraliser à toutes les pages"). La photo réelle, quand il
 * y en a une, est présentée dans un cadre à taille raisonnable (jamais
 * étirée plein écran) — les visuels récupérés du WordPress ne font que
 * ~300px de large et deviennent flous étirés sur toute la largeur de
 * l'écran ; ici ils restent nets, dans un cadre proche de leur résolution
 * native, plutôt qu'en fond plein cadre dégradé.
 */
const SHAPE_CLASSES: Record<string, string> = {
  rounded: "rounded-3xl",
  leaf: "shape-leaf",
  "leaf-mirror": "shape-leaf-mirror",
  blob: "shape-blob",
};

export function PageHero({
  title,
  subtitle,
  image,
  imageShape = "rounded",
  bgTexture,
  bgTextureRepeat = false,
}: {
  title: string;
  subtitle?: string;
  image?: string;
  /** Réservé à une ou deux pages à la fois (brief : formes organiques en
   * accent, jamais en traitement générique de tous les visuels). */
  imageShape?: "rounded" | "leaf" | "leaf-mirror" | "blob";
  /** Texture de fond discrète derrière le dégradé (motif de marque ou photo
   * d'ambiance) — un ou deux visuels vedettes par page, pas systématique. */
  bgTexture?: string;
  /** true pour un motif carrelé (charte, bogolan...), false pour une photo
   * unique en plein cadre. */
  bgTextureRepeat?: boolean;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-wagadu-terracotta via-wagadu-brown to-wagadu-ebony">
      {bgTexture ? (
        <div
          aria-hidden
          className={`absolute inset-0 opacity-20 ${bgTextureRepeat ? "bg-repeat" : "bg-cover bg-center"}`}
          style={{
            backgroundImage: `url(${bgTexture})`,
            ...(bgTextureRepeat ? { backgroundSize: "220px" } : {}),
          }}
        />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_15%_25%,rgba(255,255,255,0.25)_0,transparent_40%),radial-gradient(circle_at_85%_75%,rgba(255,255,255,0.15)_0,transparent_45%)]"
      />
      <div
        className={`relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 text-wagadu-ivory sm:px-6 lg:px-8 ${
          image ? "lg:flex-row lg:items-center lg:py-24" : "items-center py-24 text-center"
        }`}
      >
        <div className={image ? "lg:w-1/2" : "max-w-3xl"}>
          <h1 className="font-display font-semibold">{title}</h1>
          {subtitle ? (
            <p className="mt-5 text-lg text-wagadu-ivory/85 sm:text-xl">{subtitle}</p>
          ) : null}
        </div>
        {image ? (
          <div
            className={`relative aspect-[4/3] w-full overflow-hidden shadow-2xl ring-1 ring-white/10 lg:w-1/2 ${SHAPE_CLASSES[imageShape]}`}
          >
            <Image src={image} alt="" fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" priority />
          </div>
        ) : null}
      </div>
      <div
        className="h-5 w-full bg-repeat sm:h-7"
        style={{ backgroundImage: "url(/media/brand/motif-africain-colore.jpg)", backgroundSize: "180px" }}
        aria-hidden
      />
      <WaveDivider fillClassName="fill-wagadu-ivory" />
    </div>
  );
}
