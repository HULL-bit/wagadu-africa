"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type DonationBackgroundImage = { src: string; alt: string };

/**
 * Fond du bloc "Faire un don" — 3 vraies photos de terrain en fondu
 * enchaîné, légèrement floutées, pour rappeler concrètement à quoi
 * servent les dons (retour utilisateur) plutôt qu'un fond uni.
 */
export function DonationBackground({ images }: { images: DonationBackgroundImage[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {images.map((image, i) => (
        <div
          key={image.src}
          className="absolute inset-0 scale-110 blur-sm transition-opacity duration-[1500ms] ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          <Image src={image.src} alt={image.alt} fill sizes="100vw" className="object-cover" priority={i === 0} />
        </div>
      ))}
      <div className="absolute inset-0 bg-wagadu-ivory/80" />
    </div>
  );
}
