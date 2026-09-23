# ImmoGestion — Application de gestion immobilière

Application de gestion immobilière centralisant les **biens immobiliers**, **propriétaires** et **clients**, avec authentification et gestion des **utilisateurs** internes.

> **Phase 1 livrée** : socle de l'application, authentification, utilisateurs, propriétaires, clients et biens immobiliers (avec photos et documents).
> Les ventes, locations, contrats, paiements et visites sont prévus pour les phases suivantes.

## Stack technique

| Côté | Technologies |
| --- | --- |
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS 4, React Router 7, react-hook-form + Zod, Axios, lucide-react |
| Backend | Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL, Zod, JWT, bcryptjs, Multer |
| Base | PostgreSQL (base locale `immobilier`) |

## Structure du projet

```
localBridge/
├── server/                  # API Express + Prisma
│   ├── prisma/              # schéma de base + seed (compte admin)
│   ├── uploads/             # photos et documents des biens (fichiers sur disque)
│   └── src/
│       ├── config/          # variables d'environnement + constantes métier (enums)
│       ├── middleware/      # auth JWT, rôles, upload multer, gestion d'erreurs
│       ├── modules/         # auth, users, owners, clients, properties (+ médias), stats
│       └── utils/           # erreurs applicatives, pagination, référence bien, validation
└── client/                  # SPA React
    └── src/
        ├── api/             # client axios + un module par domaine
        ├── auth/            # AuthContext, routes protégées
        ├── components/      # layout (sidebar) + bibliothèque de composants UI
        ├── pages/           # connexion, tableau de bord, biens, propriétaires, clients, utilisateurs, profil
        ├── hooks/           # useAsync (requêtes annulables), useDebounce
        └── types/ + utils/  # types du domaine, libellés français, formatage (prix, dates)
```

## Démarrage

### Prérequis

- Node.js 20.19+ (ou 22.12+)
- PostgreSQL en fonctionnement
- Une base `immobilier` accessible (voir `server/.env`)

### Installation

```bash
# 1. Installer les dépendances (racine + server + client)
npm install

# 2. Créer la base si nécessaire
createdb immobilier

# 3. Créer les tables
npm run db:push

# 4. Créer les comptes et les données de démonstration
npm run db:seed
```

La configuration de la base et du JWT se fait dans `server/.env` :

```
DATABASE_URL="postgresql://<user>:<motdepasse>@127.0.0.1:5432/immobilier"
JWT_SECRET="<secret aléatoire>"
PORT=4000
```

### Lancement en développement

```bash
npm run dev
```

Cette commande démarre simultanément :
- l'**API** sur http://localhost:4000
- le **frontend** sur http://localhost:5173 (proxy `/api` et `/uploads` vers l'API)

### Connexion

Comptes créés par le seed (un par rôle) :

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@gmail.com` | `admin` |
| Responsable | `manager@gmail.com` | `manager` |
| Agent | `agent@gmail.com` | `agent` |
| Administrateur (compte d'origine) | `admin@agence.fr` | `Admin2026!` |

> ⚠️ **Ces mots de passe de démonstration sont à changer après la première connexion** (page « Mon profil »).

### Données de démonstration

`npm run db:seed` remplit également toutes les tables métier pour visualiser immédiatement l'application :

- **6 propriétaires** (avec coordonnées, pièces d'identité et notes),
- **8 clients** dont un archivé,
- **12 biens** couvrant tous les types (maison, appartement, terrain, local commercial, bureau, autre), les trois types de transaction et les cinq statuts, dont un archivé,
- **37 médias** : 24 photos (SVG de démonstration générés dans `server/uploads/`) et 13 documents PDF (titre de propriété, DPE, règlement de copropriété…).

La ré-exécution du seed est sans danger : les comptes utilisateurs ne sont jamais écrasés et les données de démonstration sont réinitialisées à l'identique (les fichiers `seed-*` de `server/uploads/` sont régénérés).

## Fonctionnalités (Phase 1)

- **Authentification** : connexion, déconnexion, session persistante (JWT), routes protégées, modification du profil et du mot de passe. Rôles ADMIN / AGENT / MANAGER, extensibles via `server/src/config/constants.ts`, `prisma/schema.prisma` et `client/src/types/index.ts`.
- **Utilisateurs** (réservé à l'ADMIN) : liste avec recherche et filtres (rôle, statut), création, consultation, modification, attribution de rôle, désactivation/réactivation, réinitialisation de mot de passe.
- **Propriétaires** : CRUD complet, recherche, consultation des biens d'un propriétaire.
- **Clients** : CRUD complet, recherche, filtre actif/archivé, archivage/restauration. Aucune catégorie « acheteur/locataire » imposée.
- **Biens immobiliers** : CRUD complet, référence générée automatiquement (`BIEN-<année>-<n°>`), recherche plein texte (titre, référence, ville, quartier), filtres (type, transaction, statut, ville, prix), archivage, association à un propriétaire, disponibilité via statut.
- **Médias** : upload de plusieurs photos et documents (stockés sur disque dans `server/uploads/`, seules les métadonnées en base), photo principale, suppression, galerie.
- **Tableau de bord** : biens au total, disponibles, réservés, destinés à la vente / location, nombre de propriétaires et clients, derniers biens ajoutés. Aucune donnée de vente ou de revenus simulée.
- **Interface** : intégralement en français, avec recherche debouncée, pagination, états de chargement, états vides et gestion visuelle des erreurs.

## Scripts utiles

| Commande | Effet |
| --- | --- |
| `npm run dev` | API + frontend en parallèle |
| `npm run build` | Build de production (server + client) |
| `npm run typecheck` | Vérification TypeScript des deux projets |
| `npm run db:push` | Applique le schéma Prisma à la base |
| `npm run db:seed` | Crée les comptes utilisateurs et les données de démonstration |
| `npm run db:studio -w server` | Prisma Studio (exploration de la base) |

## Extension (phases suivantes)

Le modèle `Property` est le point d'ancrage prévu pour la Phase 2 : intérêts clients, visites, demandes, ventes, locations, contrats et paiements pourront y être rattachés par simple ajout de tables liées (`propertyId`), sans restructuration du cœur existant.
