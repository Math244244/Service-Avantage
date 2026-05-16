import { Link } from "react-router-dom";
import "./Accueil.css";

const outils = [
  {
    to: "/calculateur-vitrine-voiture",
    titre: "Calculateur Vitrine Voiture",
    description:
      "Calculez rapidement les paiements, taux et structures de financement automobile pour vos clients.",
    couleur: "vert",
    icone: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="10" y2="11" />
        <line x1="13" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="10" y2="15" />
        <line x1="13" y1="15" x2="16" y2="15" />
      </svg>
    ),
  },
  {
    to: "/calculateur-pret-interet",
    titre: "Calculateur Prêt et Intérêt",
    description:
      "Estimez en un clin d'œil le paiement, les intérêts totaux et obtenez le tableau d'amortissement complet.",
    couleur: "rouge",
    icone: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9h6M9 12h6M9 15h4" />
        <path d="M16 6l-4 4M14 18l2-2" />
      </svg>
    ),
  },
  {
    to: "/formulaire-accueil-client",
    titre: "Formulaire Accueil Client",
    description:
      "Recueillez efficacement les informations de vos clients lors de leur arrivée en concession.",
    couleur: "bleu",
    icone: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="14" y2="17" />
      </svg>
    ),
  },
  {
    to: "/formulaire-transfert-fi",
    titre: "Formulaire Transfert F&I",
    description:
      "Transférez les dossiers vers le département Financement & Assurance en toute simplicité.",
    couleur: "violet",
    icone: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    ),
  },
  {
    to: "/texte-personnalise-marketplace",
    titre: "Texte personnalisé Marketplace",
    description:
      "Générez des descriptions de véhicules attrayantes et personnalisées pour vos annonces Marketplace.",
    couleur: "orange",
    icone: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1-5h16l1 5" />
        <path d="M5 9v11a1 1 0 001 1h12a1 1 0 001-1V9" />
        <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
  },
];

function Accueil() {
  return (
    <div className="accueil-page">
      <section className="hero-card">
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Plateforme en ligne
          </div>
          <h1 className="hero-titre">
            Bienvenue sur <span className="hero-titre-accent">Outil-Avantage</span>
          </h1>
          <p className="hero-description">
            Votre centre d'outils professionnels conçu pour simplifier votre
            quotidien en concession. Accédez rapidement à tous les outils
            essentiels — calculs de financement, accueil client, transferts F&I,
            messages Marketplace — depuis un seul endroit, sécurisé et toujours
            disponible.
          </p>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-valeur">{outils.length}</div>
              <div className="hero-stat-label">Outils disponibles</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-valeur">24/7</div>
              <div className="hero-stat-label">Accessibilité</div>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <div className="hero-stat-valeur">100%</div>
              <div className="hero-stat-label">Sécurisé</div>
            </div>
          </div>

          <Link to="/calculateur-vitrine-voiture" className="hero-cta">
            Commencer maintenant
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>

        <div className="hero-deco hero-deco-1" />
        <div className="hero-deco hero-deco-2" />
        <div className="hero-deco hero-deco-3" />
      </section>

      <section className="section">
        <div className="section-entete">
          <div>
            <h2 className="section-titre">Outils disponibles</h2>
            <p className="section-soustitre">
              Sélectionnez un outil pour démarrer
            </p>
          </div>
          <span className="section-compteur">{outils.length} outils</span>
        </div>

        <div className="outils-grille">
          {outils.map((outil) => (
            <Link
              key={outil.to}
              to={outil.to}
              className={`outil-carte outil-${outil.couleur}`}
            >
              <div className="outil-icone-wrap">{outil.icone}</div>
              <div className="outil-contenu">
                <h3 className="outil-titre">{outil.titre}</h3>
                <p className="outil-description">{outil.description}</p>
              </div>
              <div className="outil-fleche">
                <span>Ouvrir</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Accueil;
