# 2hub

PWA perso servie sur **hub.nobrega.fr** : lanceur d'apps plus widgets (tâches Vikunja, dépenses Sure, Gitea, état Coolify). L'interface s'affiche depuis le cache du service worker, sans réseau ; les widgets montrent d'abord le dernier état connu puis se mettent à jour.

## Architecture

```
src/      Preact + Vite + vite-plugin-pwa (interface)
server/   Hono sur Bun : API /api, passkeys, fichiers statiques de dist/
shared/   catalogue d'apps (shared/apps.ts) + types de l'API
```

- `GET /api/dashboard` regroupe toutes les sources. Chaque source est en cache côté serveur (Vikunja 30 s, Sure 5 min, autres 60 s). Une source en erreur n'affecte que son widget.
- `POST /api/tasks` (création dans l'Inbox Vikunja, échéance aujourd'hui 18h) et `POST /api/tasks/:id/done`.
- Les tokens des services restent côté serveur ; le navigateur n'a qu'un cookie de session `HttpOnly; SameSite=Strict`.

## Connexion

Passkey (WebAuthn, identifiants découvrables) et session de 400 jours renouvelée automatiquement.

1. Premier lancement : ouvrir `https://hub.nobrega.fr/?setup=<BOOTSTRAP_TOKEN>` et créer la passkey. Le jeton ne fonctionne que tant qu'aucune passkey n'existe.
2. Autres appareils : les passkeys synchronisées (Google, iCloud, Bitwarden) fonctionnent directement ; sinon, Réglages → « Ajouter une passkey » depuis un appareil déjà connecté, ou connexion par QR code.
3. Réglages : liste et suppression des passkeys (ce qui coupe leurs sessions), déconnexion des autres appareils.

## Raccourcis

- Taper n'importe où pour chercher dans le lanceur. `↑/↓` ou `Tab` pour naviguer, `Entrée` pour ouvrir, `Ctrl+Entrée` pour un nouvel onglet.
- Si la saisie ressemble à un domaine, il est ouvert directement ; sinon c'est une recherche Google.
- Icône œil sur le widget dépenses : masque les montants (flou, visible au survol).

## Ajouter une app

Modifier `shared/apps.ts`. L'icône est un nom lucide qui doit être déclaré dans `src/icons.ts`.

## Nouvel onglet du navigateur

Chrome et Firefox ne permettent pas de mettre une URL comme page « nouvel onglet ». Il faut une extension : *New Tab Redirect* (Chrome) ou *New Tab Override* (Firefox), pointée vers `https://hub.nobrega.fr`.

## Développement

```sh
bun install
cp .env.example .env    # remplir les tokens
bun --env-file=.env run dev:server   # API sur :3000
bun run dev                           # Vite sur :5173, proxy /api
```

`bun run typecheck`, `bun run build`, puis `bun --env-file=.env run start` sert `dist/` comme en prod.

## Déploiement

Coolify (2serv-1), build pack Dockerfile, auto-deploy sur `main`. Volume persistant `/data` (SQLite : passkeys et sessions). Variables : voir `.env.example`.

## Tokens utilisés

Tous dédiés au hub et révocables séparément. Valeurs dans `~/.secrets/hub.env`.

| Variable | Service | Droits |
|---|---|---|
| `VIKUNJA_TOKEN` | todo.nobrega.fr, token « 2hub » (anobrega) | tâches : lire, créer, modifier · projets : lire |
| `SURE_API_KEY` | finance.nobrega.fr, clé API « 2hub » | `read` |
| `GITEA_TOKEN` | git.eduvia.dev, token « 2hub » (arthurnbr) | `read:notification,issue,repository,user` |
| `COOLIFY_TOKEN` | cool.nobrega.fr, token « 2hub » | `read` |
| `COOLIFY_EDUVIA_TOKEN` | coolify.eduvia.dev, token « 2hub » | `read` |
