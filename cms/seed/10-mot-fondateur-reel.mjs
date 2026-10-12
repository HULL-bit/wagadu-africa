// Remplace le mot du fondateur par le texte réel fourni par l'ONG (FR+EN),
// en lieu et place du brouillon rédigé en Phase 1 à partir de faits déjà
// établis ailleurs sur le site. Texte fourni tel quel, à une correction près
// demandée explicitement : ajout de "(Sénégal)" après "Casamance" en FR,
// pour matcher la version anglaise qui l'a déjà.
//
// Usage : DIRECTUS_URL=https://cms.wagadu-africa.org node cms/seed/10-mot-fondateur-reel.mjs

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
  "<p>Chez Wagadu Africa, tout part d'un ancrage dans nos valeurs. La Maât nous enseigne l'équilibre, la justice et la vérité. La Charte du Kurukan Fuga affirme la dignité de chaque personne et la responsabilité de chacun envers la communauté. L'Ubuntu nous rappelle que notre existence ne prend sens qu'à travers notre contribution aux autres : « Je suis parce que nous sommes ». Ces valeurs identitaires africaines ne sont pas pour nous un héritage figé. Elles sont notre boussole pour agir aujourd'hui.</p>" +
  "<p>C'est à leur lumière que nous abordons des défis que nous connaissons de l'intérieur. Nos expériences, vécues dans notre chair comme dans notre esprit, nous obligent à partager cet héritage. L'environnement, le changement climatique et la santé publique ne doivent plus être regardés de l'extérieur, comme on contemple une œuvre d'art. Ils doivent être vécus de l'intérieur, car nous faisons nous-mêmes partie intégrante de cet environnement. Pensons à cette guérisseuse de Casamance (Sénégal) qui demande la permission à l'arbre, et s'excuse auprès de lui, avant d'en cueillir les feuilles. Ce respect est une tradition à perpétuer et une leçon à partager. Il en va de même de l'esprit de partage et de solidarité, cette chaîne invisible qui a toujours permis à nos communautés de faire face à l'insécurité alimentaire.</p>" +
  "<p>Riche de cet héritage, Wagadu est convaincue que les avancées technologiques, l'intelligence artificielle et les données doivent être intégrées aux solutions et servir de leviers pour un développement et un changement durables. Ces solutions sont conçues par et pour les communautés concernées. Nous formons celles-ci à documenter elles-mêmes leur réalité et à trouver des réponses adaptées à leur contexte. Ces réponses sont durables parce qu'elles viennent d'elles et sont faites pour elles. C'est par cette approche que le développement profitera réellement aux populations, en accord avec l'esprit de la Maât.</p>" +
  "<p>Rejoignez-nous pour partager cet héritage et bâtir le pont entre les savoirs endogènes et les défis de notre époque. Mettons les technologies, l'intelligence artificielle et les données au service de ces défis, dans le respect de la Maât et de l'esprit Ubuntu.</p>";

const BODY_EN =
  '<p>At Wagadu Africa, everything begins with being rooted in our values. Maat teaches us balance, justice and truth. The Kurukan Fuga Charter affirms the dignity of every person and each individual’s responsibility toward the community. Ubuntu reminds us that our existence only takes on meaning through our contribution to others: “I am because we are.” For us, these African identity values are not a frozen heritage. They are our compass for acting today.</p>' +
  "<p>It is in their light that we approach challenges we know from the inside. Our experiences, lived in our flesh as well as in our minds, compel us to share this heritage. The environment, climate change and public health should no longer be viewed from the outside, the way one contemplates a work of art. They must be experienced from within, because we ourselves are an integral part of this environment. Think of the healer in Casamance (Senegal) who asks the tree for permission, and apologizes to it, before gathering its leaves. This respect is a tradition to uphold and a lesson to share. The same is true of the spirit of sharing and solidarity, the invisible chain that has always enabled our communities to face food insecurity.</p>" +
  "<p>Drawing on this heritage, Wagadu firmly believes that technological advances, artificial intelligence and data must be built into solutions and serve as levers for sustainable development and lasting change. These solutions are designed by and for the communities concerned. We train these communities to document their own reality and to find answers suited to their context. These answers last because they come from the communities themselves and are made for them. It is through this approach that development will truly benefit people, in keeping with the spirit of Maat.</p>" +
  "<p>Join us in sharing this heritage and building the bridge between local knowledge and the challenges of our time. Let us put technology, artificial intelligence and data to work on these challenges, in the spirit of Maat and Ubuntu.</p>";

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
