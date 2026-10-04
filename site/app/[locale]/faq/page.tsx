import { getLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("faq") };
}

const FAQ_FR = [
  { q: "Comment faire un don ?", r: "Le paiement en ligne n'est pas encore disponible sur le site. En attendant, écrivez-nous à contact@wagadu-africa.org et nous vous indiquerons la marche à suivre — voir la page « Faire un don »." },
  { q: "Comment devenir bénévole ou rejoindre l'équipe ?", r: "Aucune offre n'est ouverte pour le moment, mais nous lisons chaque candidature spontanée envoyée à contact@wagadu-africa.org — voir la page « Nous rejoindre »." },
  { q: "Où Wagadu Africa intervient-elle ?", r: "Nos actions se concentrent au Sénégal, notamment auprès des communautés côtières (pêcheurs de Kayar, zones ostréicoles), avec la volonté d'essaimer plus largement en Afrique de l'Ouest." },
  { q: "Qu'est-ce que Blue-Track ?", r: "Blue-Track est notre outil phare : une plateforme numérique qui permet aux communautés de terrain de documenter et de faire valoir leurs droits face aux atteintes environnementales et sociales. Voir la page « Nos outils technologiques »." },
  { q: "Comment sont utilisées les données que vous collectez ?", r: "Les communautés restent propriétaires de ce qu'elles documentent : la donnée sert à faire valoir leurs droits, dans le respect des principes d'éthique et de transparence de Maât." },
  { q: "Comment vous contacter ?", r: "Par email à contact@wagadu-africa.org, par téléphone, ou via le formulaire de la page Contact." },
];

const FAQ_EN = [
  { q: "How can I make a donation?", r: "Online payment isn't available on the site yet. In the meantime, write to us at contact@wagadu-africa.org and we'll let you know how to proceed — see the “Donate” page." },
  { q: "How can I volunteer or join the team?", r: "No positions are open right now, but we read every unsolicited application sent to contact@wagadu-africa.org — see the “Join us” page." },
  { q: "Where does Wagadu Africa work?", r: "Our work is centered in Senegal, particularly with coastal communities (Kayar fishers, oyster-farming areas), with the aim of expanding further across West Africa." },
  { q: "What is Blue-Track?", r: "Blue-Track is our flagship tool: a digital platform that lets communities on the ground document and assert their rights in the face of environmental and social harm. See the “Our technology tools” page." },
  { q: "How is the data you collect used?", r: "Communities remain owners of what they document: the data serves to assert their rights, in line with Maât's principles of ethics and transparency." },
  { q: "How can I reach you?", r: "By email at contact@wagadu-africa.org, by phone, or via the form on the Contact page." },
];

export default async function FaqPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const items = locale === "fr" ? FAQ_FR : FAQ_EN;

  return (
    <>
      <PageHero
        title={t("faq")}
        subtitle={
          locale === "fr"
            ? "Les questions les plus fréquentes, sur le don comme sur notre mission."
            : "The most frequent questions, on donating as well as on our mission."
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {items.map((item, index) => (
            <Reveal key={item.q} delay={index * 0.05}>
              <details className="group rounded-2xl border border-wagadu-sand bg-white p-6 open:shadow-sm">
                <summary className="cursor-pointer list-none font-display text-lg font-semibold text-wagadu-ebony marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="shrink-0 text-wagadu-terracotta transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-4 text-base leading-relaxed text-wagadu-ebony/70">{item.r}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  );
}
