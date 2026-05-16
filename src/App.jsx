import { useEffect, useState } from "react";
import { app, analyticsPromise } from "./firebase";
import "./App.css";

function App() {
  const [firebaseStatus, setFirebaseStatus] = useState("Connexion en cours...");
  const [analyticsStatus, setAnalyticsStatus] = useState("Vérification...");

  useEffect(() => {
    if (app && app.options && app.options.projectId) {
      setFirebaseStatus(`Connecté au projet : ${app.options.projectId}`);
    } else {
      setFirebaseStatus("Échec de la connexion à Firebase");
    }

    analyticsPromise
      .then((analytics) => {
        setAnalyticsStatus(
          analytics ? "Analytics activé" : "Analytics non supporté dans cet environnement"
        );
      })
      .catch(() => setAnalyticsStatus("Analytics indisponible"));
  }, []);

  return (
    <div className="app">
      <header className="hero">
        <h1>Service-Avantage</h1>
        <p className="tagline">Votre partenaire de confiance</p>
      </header>

      <main className="content">
        <section className="card">
          <h2>Bienvenue</h2>
          <p>
            Le site Service-Avantage est en cours de construction. Cette page de
            départ confirme que React, Vite et Firebase sont correctement
            configurés.
          </p>
        </section>

        <section className="card">
          <h2>État de Firebase</h2>
          <ul className="status-list">
            <li>
              <strong>Firebase :</strong> {firebaseStatus}
            </li>
            <li>
              <strong>Analytics :</strong> {analyticsStatus}
            </li>
          </ul>
        </section>

        <section className="card">
          <h2>Prochaines étapes</h2>
          <ol>
            <li>Définir l'identité visuelle et la structure des pages</li>
            <li>Mettre en place le routing avec React Router</li>
            <li>Configurer les règles de sécurité Firestore</li>
            <li>Déployer sur Firebase Hosting</li>
          </ol>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Service-Avantage</p>
      </footer>
    </div>
  );
}

export default App;
