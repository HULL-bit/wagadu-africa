// Remplace le mot du fondateur par la version resserrée fournie par l'ONG
// (titre "Rooted in who we are" / "Ancrés dans ce que nous sommes" + 4
// paragraphes plus courts) — remplace le texte long de la v1 (10-mot-
// fondateur-reel.mjs), jugé trop volumineux à l'affichage. FR traduit
// fidèlement depuis l'anglais fourni (pas de fait ajouté).
//
// Usage : DIRECTUS_URL=https://cms.wagadu-africa.org node cms/seed/11-mot-fondateur-v2.mjs

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

async function patchPageStatiqueTranslation(slug, languageCode, fields) {
  const page = await api(
    "GET",
    `/items/pages_statiques?filter[slug][_eq]=${slug}&fields=translations.id,translations.languages_code`,
  );
  const row = page.data?.[0]?.translations?.find((t) => t.languages_code === languageCode);
  if (!row) {
    console.warn(`! page_statique ${slug} (${languageCode}) introuvable, skip`);
    return;
  }
  await api("PATCH", `/items/pages_statiques_translations/${row.id}`, fields);
  console.log(`= page_statique ${slug} (${languageCode}) mise à jour`);
}

const BODY_FR =
  "<p>Chez Wagadu Africa, tout part de nos racines. La Maât nous enseigne l'équilibre, la justice et la vérité. La Charte du Kurukan Fuga affirme la dignité de chaque personne. L'Ubuntu nous rappelle : « Je suis parce que nous sommes ». Ces valeurs ne sont pas des reliques du passé. Elles sont la boussole qui nous guide aujourd'hui.</p>" +
  "<p>En Casamance, une guérisseuse demande la permission à un arbre, et s'excuse auprès de lui, avant d'en cueillir les feuilles. Elle ne regarde pas la nature de l'extérieur : elle sait qu'elle en fait partie. C'est ce respect que nous portons dans chaque défi que nous affrontons, du changement climatique à la santé publique en passant par l'insécurité alimentaire. Nous connaissons ces défis de l'intérieur, dans notre chair et dans notre esprit. Et nous connaissons la chaîne invisible de solidarité qui a toujours uni nos communautés.</p>" +
  "<p>C'est pourquoi nous mettons la technologie, l'intelligence artificielle et la donnée entre les mains de celles et ceux qui vivent ces réalités. Les communautés documentent elles-mêmes leur vie et façonnent leurs propres solutions. Parce que ce qui vient d'elles, dure.</p>" +
  "<p>Rejoignez-nous pour bâtir le pont entre la sagesse ancestrale et les défis de notre époque.</p>";

const BODY_EN =
  '<p>At Wagadu Africa, everything begins with our roots. Maat teaches us balance, justice and truth. The Kurukan Fuga Charter affirms the dignity of every person. Ubuntu reminds us: “I am because we are.” These values are not relics of the past. They are the compass that guides us today.</p>' +
  "<p>In Casamance, a healer asks a tree for permission, and apologizes to it, before gathering its leaves. She does not see nature from the outside; she knows she is part of it. This is the respect we carry into every challenge we face, from climate change to public health to food insecurity. We know these challenges from the inside, in our flesh and in our spirit. And we know the invisible chain of solidarity that has always held our communities together.</p>" +
  "<p>This is why we put technology, artificial intelligence and data into the hands of the people who live these realities. Communities document their own lives and shape their own solutions. Because what comes from them, lasts.</p>" +
  "<p>Join us in building the bridge between ancestral wisdom and the challenges of our time.</p>";

async function main() {
  await login();
  await patchPageStatiqueTranslation("mot-fondateur", "fr", { body: BODY_FR });
  await patchPageStatiqueTranslation("mot-fondateur", "en", { body: BODY_EN });
  console.log("Terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
