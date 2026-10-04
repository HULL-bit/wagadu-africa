# Frontend — Wagadu Hub

Application Next.js (App Router) + React, installable en PWA. Code sous `frontend/`.

## Prérequis

- Node.js 22+

## Installation locale

```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
# http://localhost:3000
```

En développement, le front appelle **directement** le backend Django à l'URL
`NEXT_PUBLIC_API_BASE_URL` (CORS ouvert dans `wagadu.settings.dev`). En
production, Nginx sert le front et proxifie `/api/` vers Django
(`NEXT_PUBLIC_API_BASE_URL=/api/v1`).

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | serveur de développement (port 3000) |
| `npm run build` | build de production (`output: standalone`) |
| `npm run start` | sert le build |
| `npm run lint` | ESLint (config `next/core-web-vitals`) |
| `npm test` | Vitest |

## Charte graphique

Design tokens Wagadu dans `tailwind.config.ts` + `app/globals.css` :

| Token | Hex | Usage |
|---|---|---|
| `wagadu-ivory` | `#FBF6EC` | fond de page |
| `wagadu-sand` | `#F0E4C8` | fond de carte alternatif |
| `wagadu-gold` | `#F6BB24` | primaire / CTA (jamais en texte sur fond clair) |
| `wagadu-amber` | `#FFA900` | hover / accent |
| `wagadu-terracotta` | `#D2812E` | badges, échéances, alertes douces |
| `wagadu-brown` | `#6E3C13` | titres, texte fort |
| `wagadu-bark` | `#4A2A12` | fond de la sidebar |
| `wagadu-ebony` | `#1E0F04` | texte principal |

Typographies (Google Fonts) : **Fraunces** (titres), **Work Sans** (interface),
**IBM Plex Mono** (identifiants, dates, numéros). Filigrane `.wagadu-branches`
(clin d'œil à l'arbre du logo) sur la sidebar et l'écran de connexion.

## Structure

```
app/
  layout.tsx              racine : polices, AuthProvider, enregistrement du service worker
  page.tsx                redirection / → /dashboard ou /login
  login/page.tsx          connexion e-mail + mot de passe (+ 2FA si activée)
  (app)/
    layout.tsx            garde d'authentification + sidebar
    dashboard/page.tsx    tableau de bord adapté au rôle
    account/page.tsx      libre-service, mot de passe, 2FA
    notifications/page.tsx
    admin/users/page.tsx
    admin/roles/page.tsx               éditeur de matrice de permissions
    admin/permission-overrides/page.tsx  exceptions individuelles
    admin/audit/page.tsx              journal filtrable + export CSV
components/    Sidebar, RegisterSW
lib/          api.ts (client + refresh token), auth.tsx (contexte, can()), useApi.ts, types.ts
public/       manifest.webmanifest, sw.js, icons/
```

## Authentification côté client

`lib/api.ts` : jetons dans `localStorage`, rafraîchissement automatique sur 401,
purge sur échec. `lib/auth.tsx` expose `useAuth()` → `me`, `login`, `logout`,
`can(perm)`. **`can()` ne sert qu'à l'affichage ; l'autorisation réelle est
toujours vérifiée par l'API.**

## PWA / connexion faible

- `public/manifest.webmanifest` : installation sans store.
- `public/sw.js` : app shell en cache (`cache-first` pour la navigation,
  `network-first` pour `/api/`). Enregistré uniquement en production.
- Interfaces mobile-first (grilles qui s'empilent, tables scrollables).
