import { useState } from "react";
import "./PDFGaranties.css";

/* Présentation classique : icônes, badges et cartes compactes faciles à scanner. */
const categories = [
  {
    id: "automobile",
    titre: "Automobile",
    description: "Dépliants de garanties pour véhicules automobiles.",
    accent: "rouge",
    documents: [
      {
        titre: "Dépliant AT-ATPlus",
        statut: "PDF disponible",
        url: "/Dépliant PDF/Dépliant-Auto-AT-ATplus.pdf",
      },
      {
        titre: "Dépliant AVE",
        statut: "PDF disponible",
        url: "/Dépliant PDF/Dépliant-Auto-AVE.pdf",
      },
      {
        titre: "Dépliant AVEX",
        statut: "PDF disponible",
        url: "/Dépliant PDF/Dépliant-Auto- AVEX.pdf",
      },
    ],
  },
  {
    id: "loisir",
    titre: "Loisir",
    description: "Dépliant de garanties pour véhicules de loisir.",
    accent: "orange",
    documents: [
      {
        titre: "Dépliant Loisir",
        statut: "PDF disponible",
        url: "/Dépliant PDF/Dépliant-Loisir.pdf",
      },
    ],
  },
  {
    id: "vr-motorise",
    titre: "VR et motorisé",
    description: "Dépliant de garanties pour VR et motorisés.",
    accent: "vert",
    documents: [
      {
        titre: "Dépliant VR",
        statut: "PDF disponible",
        url: "/Dépliant PDF/Dépliant VR.pdf",
      },
    ],
  },
  {
    id: "tracteur",
    titre: "Tracteur",
    description: "Dépliant de garanties pour tracteurs et pelles mécaniques.",
    accent: "bleu",
    documents: [
      {
        titre: "Dépliant Tracteur",
        statut: "PDF disponible",
        url: "/Dépliant PDF/Dépliant Tracteur-Pelle Mecanique.pdf",
      },
    ],
  },
  {
    id: "camion-lourd",
    titre: "Camion lourd",
    description: "Emplacement réservé aux garanties de camions lourds.",
    accent: "violet",
    documents: [],
  },
  {
    id: "hasard-routier",
    titre: "Hasard routier",
    description: "Dépliant de protection Hasard routier.",
    accent: "rouge",
    documents: [
      {
        titre: "Dépliant Hasard routier",
        statut: "PDF disponible",
        url: "/Dépliant PDF/Dépliant-Hazard Routhier.pdf",
      },
    ],
  },
];

function IconDocument() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  );
}

function IconCamionLourd() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 17V7a1 1 0 011-1h12v11" />
      <path d="M14 9h4l3 4v4h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </svg>
  );
}

function IconAuto() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13l1.6-4.2A3 3 0 018.4 7h7.2a3 3 0 012.8 1.8L20 13" />
      <path d="M3 13h18v5a1 1 0 01-1 1h-1.2a2 2 0 01-3.6 0H8.8a2 2 0 01-3.6 0H4a1 1 0 01-1-1v-5z" />
      <path d="M6.5 13h11" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}

function IconMoto() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M9 17h3.2l2.3-5H17" />
      <path d="M11 12l-2 5" />
      <path d="M13 9h3l2 3" />
      <path d="M7.5 10h3.5l2 2" />
      <path d="M17 9h2" />
    </svg>
  );
}

function IconRoulotte() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a3 3 0 013-3h9a3 3 0 013 3v7H4V8z" />
      <path d="M19 15h2" />
      <path d="M7 9h4" />
      <path d="M14 9h2" />
      <path d="M8 15v-3h3v3" />
      <circle cx="14.5" cy="17" r="2" />
      <path d="M4 15v2h8.5" />
    </svg>
  );
}

function IconTracteur() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="17" r="4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M10.5 17H15l1.2-5H12l-1.5-4H8" />
      <path d="M12 8h4.5l1.2 4" />
      <path d="M4 13h4" />
      <path d="M16 12h3" />
      <path d="M7 17h.01" />
    </svg>
  );
}

function IconHasardRoutier() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.4-2.7 8.4-7 10-4.3-1.6-7-5.6-7-10V6l7-3z" />
      <path d="M12 7v4l-2 2" />
      <path d="M12 11l2 2" />
      <circle cx="12" cy="15.5" r="2.2" />
      <path d="M8.2 8.8l7.6 7.6" />
    </svg>
  );
}

function iconeCategorie(id) {
  switch (id) {
    case "automobile":
      return <IconAuto />;
    case "loisir":
      return <IconMoto />;
    case "vr-motorise":
      return <IconRoulotte />;
    case "tracteur":
      return <IconTracteur />;
    case "camion-lourd":
      return <IconCamionLourd />;
    case "hasard-routier":
      return <IconHasardRoutier />;
    default:
      return <IconDocument />;
  }
}

function PDFGaranties() {
  const [categorieActive, setCategorieActive] = useState(categories[0]);
  const totalDepliants = categories.reduce((acc, c) => acc + c.documents.length, 0);

  return (
    <div className="pdf-page">
      {/* HERO compact — tout sur une ligne sur grand écran pour gagner
          de la hauteur et garder les dépliants visibles sans scroll. */}
      <section className="pdf-hero">
        <div className="pdf-hero-content">
          <span className="pdf-eyebrow">Bibliothèque PDF</span>
          <h1>PDF des garanties</h1>
          <p>Sélectionnez une famille pour ouvrir les dépliants.</p>
        </div>
        <div className="pdf-hero-stats" aria-hidden="true">
          <div className="pdf-hero-stat">
            <strong>{categories.length}</strong>
            <span>Catégories</span>
          </div>
          <div className="pdf-hero-stat">
            <strong>{totalDepliants}</strong>
            <span>Dépliants</span>
          </div>
        </div>
      </section>

      <section className="pdf-section">
        <div className="pdf-section-header">
          <h2>Catégories principales</h2>
          <span>{categories.length} cartes · {totalDepliants} PDFs</span>
        </div>

        <div className="pdf-category-grid">
          {categories.map((categorie) => {
            const actif = categorieActive.id === categorie.id;
            const nb = categorie.documents.length;
            return (
              <button
                key={categorie.id}
                type="button"
                className={`pdf-category-card pdf-${categorie.accent}${actif ? " is-active" : ""}`}
                onClick={() => setCategorieActive(categorie)}
                aria-pressed={actif}
              >
                <div className="pdf-card-media" aria-hidden="true">
                  <span className="pdf-card-icon">
                    {iconeCategorie(categorie.id)}
                  </span>
                  <span className="pdf-card-badge-count">
                    {nb ? `${nb} PDF${nb > 1 ? "s" : ""}` : "À venir"}
                  </span>
                </div>

                <div className="pdf-card-body">
                  <span className="pdf-card-title">{categorie.titre}</span>
                  <span className="pdf-card-action">
                    Voir les PDF
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* DÉPLIANTS — retour au format compact d'origine : icône à gauche,
          titre + statut + badge « Ouvrir ». Ligne unique,
          gain de hauteur, plus rapide à scanner. */}
      <section className={`pdf-section pdf-${categorieActive.accent}-section`}>
        <div className="pdf-section-header">
          <div className="pdf-section-titre-wrap">
            <h2>{categorieActive.titre}</h2>
            <p>
              {categorieActive.documents.length
                ? "Cliquez sur un dépliant pour l'ouvrir."
                : "Aucun PDF n'est encore intégré pour cette catégorie."}
            </p>
          </div>
          {categorieActive.documents.length > 0 && (
            <span>
              {categorieActive.documents.length}{" "}
              dépliant{categorieActive.documents.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {categorieActive.documents.length ? (
          <div className="pdf-document-grid">
            {categorieActive.documents.map((document) => (
              <a
                key={document.titre}
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className={`pdf-document-card pdf-${categorieActive.accent}`}
              >
                <div className="pdf-document-vignette" aria-hidden="true">
                  <IconDocument />
                </div>
                <div className="pdf-document-body">
                  <h3>{document.titre}</h3>
                  <p>{document.statut}</p>
                </div>
                <span className="pdf-document-badge">Ouvrir</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="pdf-empty-state">
            <IconDocument />
            <p>Cette carte est prête. Il restera seulement à ajouter le fichier PDF correspondant.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default PDFGaranties;
