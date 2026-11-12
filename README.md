# 2hub

PWA perso servie sur **hub.nobrega.fr**. Une seule page, sans défilement sur ordinateur : une barre de raccourcis configurable, un tiroir avec toutes les apps, et quatre tuiles de résumé (tâches Vikunja, budget Sure, Gitea, infra Coolify). Cliquer sur une tuile ouvre son détail. L'interface s'affiche depuis le cache du service worker, sans réseau ; les données montrent d'abord le dernier état connu puis se mettent à jour.

Style : Material 3 plat (surfaces tonales, sans ombres), police Roboto Flex, thème clair/sombre selon le système. Toutes les couleurs sont des variables définies en haut de `src/styles.css`.

## Architecture

```
src/      Preact + Vite + vite-plugin-pwa (interface)
server/   Hono sur Bun : API /api, passkeys, fichiers statiques de dist/
shared/   catalogue d'apps (shared/apps.ts) + types de l'API
```

- `GET /api/dashboard` regroupe toutes les sources. Chaque source est en cache côté serveur (Vikunja 30 s, Sure 5 min, autres 60 s). Une source en erreur n'affecte que son widget.
- `POST /api/tasks` (création dans l'Inbox Vikunja, échéance aujourd'hui 18h) et `POST /api/tasks/:id/done`.
- `GET/PUT /api/prefs` : raccourcis épinglés, stockés côté serveur pour être identiques sur tous les navigateurs.
- Les tokens des services restent côté serveur ; le navigateur n'a qu'un cookie de session `HttpOnly; SameSite=Strict`.

## Connexion

Passkey (WebAuthn, identifiants découvrables) et session de 400 jours renouvelée automatiquement.

1. Premier lancement : ouvrir `https://hub.nobrega.fr/?setup=<BOOTSTRAP_TOKEN>` et créer la passkey. Le jeton ne fonctionne que tant qu'aucune passkey n'existe.
2. Autres appareils : les passkeys synchronisées (Google, iCloud, Bitwarden) fonctionnent directement ; sinon, Réglages → « Ajouter une passkey » depuis un appareil déjà connecté, ou connexion par QR code.
3. Réglages : liste et suppression des passkeys (ce qui coupe leurs sessions), déconnexion des autres appareils.

## Utilisation

- **Raccourcis** : « + » ouvre le tiroir en mode choix (toucher une app l'ajoute ou la retire). Dans le tiroir, le crayon passe en mode édition : glisser pour réordonner, × pour retirer.
- **Tiroir d'apps** : icône grille en haut à droite.
- **Recherche** : taper n'importe où sur la page. `↑/↓` ou `Tab` pour naviguer, `Entrée` pour ouvrir, `Ctrl+Entrée` pour un nouvel onglet. Une adresse est ouverte directement ; sinon c'est une recherche Google.
- **Tuiles** : cliquer pour voir le détail (toutes les tâches avec ajout rapide, catégories et opérations du budget, onglets Gitea, ressources Coolify et disponibilité des apps). L'œil de la tuile budget masque les montants.

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
