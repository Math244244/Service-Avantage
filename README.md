# Outil-Avantage

Centre d'outils pour concessionnaires automobiles — construit avec **React + Vite** et hébergé sur **Firebase Hosting**.

Outil-Avantage regroupe plusieurs outils du quotidien d'une concession (calculateurs de financement, formulaires d'accueil et de transfert, génération de messages Marketplace, etc.) dans une interface unique et professionnelle.

## Stack technique

- **React 19** + **Vite** — Framework frontend rapide
- **Firebase 12** — Authentication, Firestore, Realtime Database, Storage, Analytics
- **React Router DOM 7** — Navigation côté client
- **Firebase Hosting** — Hébergement CDN mondial

## Prérequis

- Node.js >= 20
- npm
- Firebase CLI (installé automatiquement via `npx`)
- Un compte Firebase avec accès au projet Firebase utilisé (par défaut `service-avantage` — voir `.firebaserc`)

## Installation

```bash
npm install
```

## Configuration

Les clés Firebase sont stockées dans `.env.local` (ignoré par Git). Pour configurer un nouvel environnement, copiez `.env.example` :

```bash
cp .env.example .env.local
```

Puis remplissez vos clés Firebase.

## Développement local

```bash
npm run dev
```

Le site sera disponible sur [http://localhost:5173](http://localhost:5173).

## Build de production

```bash
npm run build
```

Le build est généré dans le dossier `dist/`.

## Aperçu du build

```bash
npm run preview
```

## Déploiement sur Firebase Hosting

1. Se connecter à Firebase (première fois seulement) :

   ```bash
   npx -y firebase-tools@latest login
   ```

2. Définir le projet actif (voir `.firebaserc` pour l'ID exact) :

   ```bash
   npx -y firebase-tools@latest use service-avantage
   ```

3. Construire et déployer :

   ```bash
   npm run build
   npx -y firebase-tools@latest deploy --only hosting
   ```

### Déploiement avec aperçu (preview channel)

```bash
npx -y firebase-tools@latest hosting:channel:deploy preview-name
```

## Structure du projet

```
Outil-Avantage/
├── public/             Fichiers statiques (favicon, outils HTML, images)
│   ├── outils/         Outils HTML iframés (calculateur, formulaires)
│   └── images/         Bannières et ressources partagées
├── src/
│   ├── components/     Composants React partagés (Sidebar, Header, Layout, OutilFrame)
│   ├── pages/          Pages de l'application
│   ├── styles/         Thème global (theme.css)
│   ├── App.jsx         Composant racine + routes
│   ├── firebase.js     Initialisation Firebase
│   ├── index.css       Styles globaux
│   └── main.jsx        Point d'entrée
├── .env.local          Variables d'environnement (NON versionné)
├── .env.example        Modèle de configuration
├── .firebaserc         Projet Firebase actif
├── firebase.json       Configuration Firebase Hosting
├── index.html          Template HTML
├── package.json
└── vite.config.js      Configuration Vite
```

## Dépôt GitHub

Le code est versionné sur GitHub. Si le dépôt distant a été renommé en `Outil-Avantage` côté GitHub, mettez la remote à jour :

```bash
git remote set-url origin https://github.com/Math244244/Outil-Avantage.git
```

Sinon, la remote actuelle reste valide grâce aux redirections automatiques de GitHub.
