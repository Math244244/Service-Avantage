import { useLocation } from "react-router-dom";
import "./Header.css";

const titreParRoute = {
  "/": { titre: "Tableau d'accueil", sousTitre: "Vue exécutive" },
  "/calculateur-vitrine-voiture": {
    titre: "Calculateur Vitrine Voiture",
    sousTitre: "Outil de calcul",
  },
  "/calculateur-pret-interet": {
    titre: "Calculateur Prêt et Intérêt",
    sousTitre: "Calcul de paiements automobiles",
  },
  "/formulaire-accueil-client": {
    titre: "Formulaire Accueil Client",
    sousTitre: "Saisie client",
  },
  "/formulaire-transfert-fi": {
    titre: "Formulaire Transfert F&I",
    sousTitre: "Transfert de dossier",
  },
  "/texte-personnalise-marketplace": {
    titre: "Texte personnalisé Marketplace",
    sousTitre: "Générateur de descriptions",
  },
};

function formatDateFR() {
  const d = new Date();
  return d.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Header() {
  const location = useLocation();
  const { titre, sousTitre } = titreParRoute[location.pathname] || {
    titre: "Outil-Avantage",
    sousTitre: "",
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-titre-bloc">
          <h1 className="header-titre">{titre}</h1>
          <span className="header-soustitre">
            {sousTitre} · {formatDateFR()}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;
