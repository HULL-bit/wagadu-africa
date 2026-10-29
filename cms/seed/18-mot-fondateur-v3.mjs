// Remplace le corps du mot du fondateur (mot-fondateur) par le texte
// fourni directement par l'utilisateur (FR/EN), verbatim — y compris
// "Mandeh" (pas "Manden") côté FR, tel que donné.
//
// Usage (depuis le conteneur directus) :
//   DIRECTUS_ADMIN_EMAIL="$ADMIN_EMAIL" DIRECTUS_ADMIN_PASSWORD="$ADMIN_PASSWORD" DIRECTUS_URL=http://localhost:8055 node 18-mot-fondateur-v3.mjs

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD;

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

const BODY_FR =
  "<p>Chez Wagadu Africa, tout commence par nos racines. La Maât nous enseigne l’équilibre, la justice et la vérité. La Charte du Mandeh affirme la dignité de chaque personne. L’Ubuntu nous rappelle : « Je suis parce que nous sommes. » Ces valeurs ne sont pas des vestiges du passé. Elles sont la boussole qui nous guide aujourd’hui.</p>" +
  "<p>En Casamance, une guérisseuse demande la permission à un arbre, et lui présente ses excuses, avant de cueillir ses feuilles. Elle ne regarde pas la nature de l’extérieur ; elle sait qu’elle en fait partie. C’est ce respect que nous portons dans chacun des défis auxquels nous faisons face, du changement climatique à la santé publique et à l’insécurité alimentaire. Ces défis, nous les connaissons de l’intérieur, dans notre chair et dans notre esprit. Et nous connaissons la chaîne invisible de solidarité qui a toujours uni nos communautés.</p>" +
  "<p>Aujourd’hui, cet héritage a besoin d’outils nouveaux pour faire face à des menaces nouvelles. Guidés par la Maât, nous mettons la technologie, les données et l’intelligence artificielle au service de la protection de l’environnement, de la sécurité alimentaire, de la santé et des droits humains. Nous plaçons ces outils entre les mains de celles et ceux qui vivent ces réalités. Les communautés documentent leur propre vie, produisent leurs propres preuves et construisent leurs propres solutions. Car ce qui vient d’elles est durable.</p>" +
  "<p>Rejoignez-nous pour bâtir le pont entre la sagesse ancestrale et les défis de notre temps.</p>";

const BODY_EN =
  "<p>At Wagadu Africa, everything begins with our roots. Maat teaches us balance, justice and truth. The Manden Charter affirms the dignity of every person. Ubuntu reminds us: “I am because we are.” These values are not relics of the past. They are the compass that guides us today.</p>" +
  "<p>In Casamance, a healer asks a tree for permission, and apologizes to it, before gathering its leaves. She does not see nature from the outside; she knows she is part of it. This is the respect we bring to every challenge we face, from climate change to public health and food insecurity. We know these challenges from the inside, in our flesh and in our spirit. And we know the invisible chain of solidarity that has always held our communities together.</p>" +
  "<p>Today, this heritage needs new tools to face new threats. Guided by Maat, we use technology, data and artificial intelligence to protect the environment, strengthen food security, improve health and defend human rights. We put these tools in the hands of the people who live these realities. Communities document their own lives, produce their own evidence and shape their own solutions. Because what comes from them lasts.</p>" +
  "<p>Join us in building the bridge between ancestral wisdom and the challenges of our time.</p>";

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("DIRECTUS_ADMIN_EMAIL / DIRECTUS_ADMIN_PASSWORD manquants");
  await login();

  const res = await api(
    "GET",
    `/items/pages_statiques?filter[slug][_eq]=mot-fondateur&fields=translations.id,translations.languages_code`,
  );
  const page = res.data?.[0];
  if (!page) throw new Error("page mot-fondateur introuvable");

  const bodies = { fr: BODY_FR, en: BODY_EN };
  for (const tr of page.translations) {
    const body = bodies[tr.languages_code];
    if (!body) continue;
    await api("PATCH", `/items/pages_statiques_translations/${tr.id}`, { body });
    console.log(`+ ${tr.languages_code} : corps du mot du fondateur mis à jour`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
