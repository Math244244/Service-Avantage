import { Link } from "react-router-dom";
import "./OutilPlaceholder.css";

function OutilPlaceholder({ titre, description, couleur = "bleu", icone }) {
  return (
    <div className={`outil-page outil-page-${couleur}`}>
      <div className="outil-page-entete">
        <div className={`outil-page-icone outil-page-icone-${couleur}`}>
          {icone}
        </div>
        <div>
          <h1 className="outil-page-titre">{titre}</h1>
          <p className="outil-page-description">{description}</p>
        </div>
      </div>

      <div className="outil-page-corps">
        <div className="outil-page-vide">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h2>Outil en cours de configuration</h2>
          <p>
            Cet outil sera bientôt disponible. Les fonctionnalités, les champs
            et les calculs seront intégrés progressivement selon vos besoins.
          </p>
          <Link to="/" className="outil-page-retour">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OutilPlaceholder;
