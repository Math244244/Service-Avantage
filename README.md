# Service-Avantage

Site web officiel de Service-Avantage construit avec **React + Vite** et hébergé sur **Firebase Hosting**.

## Stack technique

- **React 19** + **Vite** — Framework frontend rapide
- **Firebase 12** — Authentication, Firestore, Realtime Database, Storage, Analytics
- **React Router DOM 7** — Navigation côté client
- **Firebase Hosting** — Hébergement CDN mondial

## Prérequis

- Node.js >= 20
- npm
- Firebase CLI (installé automatiquement via `npx`)
- Un compte Firebase avec accès au projet `service-avantage`

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

2. Définir le projet actif :

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
Service-Avantage/
├── public/             Fichiers statiques (favicon, etc.)
├── src/
│   ├── assets/         Images et ressources
│   ├── App.jsx         Composant racine
│   ├── App.css         Styles principaux
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

Le code est versionné sur : [https://github.com/Math244244/Service-Avantage](https://github.com/Math244244/Service-Avantage)
