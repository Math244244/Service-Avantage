import { useState } from "react";
import "./PDFGaranties.css";

/* Visuels par catégorie / dépliant — placés dans /public/images.
   Le style général des cartes est inspiré du visuel « Autoshield » :
   photo immersive, overlay sombre, glow coloré, badge premium. */
const categories = [
  {
    id: "automobile",
    titre: "Automobile",
    description: "Dépliants de garanties pour véhicules automobiles.",
    accent: "rouge",
    image: "/images/photo-auto.jpg",
    documents: [
      {
        titre: "Dépliant AT-ATPlus",
        statut: "PDF disponible",
        image: "/images/photo-auto.jpg",
        url: "/Dépliant PDF/Dépliant-Auto-AT-ATplus.pdf",
      },
      {
        titre: "Dépliant AVE",
        statut: "PDF disponible",
        image: "/images/Tesla-Roadster.png",
        url: "/Dépliant PDF/Dépliant-Auto-AVE.pdf",
      },
      {
        titre: "Dépliant AVEX",
        statut: "PDF disponible",
        image: "/images/photo-avex.jpg",
        url: "/Dépliant PDF/Dépliant-Auto- AVEX.pdf",
      },
    ],
  },
  {
    id: "loisir",
    titre: "Loisir",
    description: "Dépliant de garanties pour véhicules de loisir.",
    accent: "orange",
    image: "/images/photo-loisir.jpg",
    documents: [
      {
        titre: "Dépliant Loisir",
        statut: "PDF disponible",
        image: "/images/photo-loisir.jpg",
        url: "/Dépliant PDF/Dépliant-Loisir.pdf",
      },
    ],
  },
  {
    id: "vr-motorise",
    titre: "VR et motorisé",
    description: "Dépliant de garanties pour VR et motorisés.",
    accent: "vert",
    image: "/images/photo-vr.jpg",
    documents: [
      {
        titre: "Dépliant VR",
        statut: "PDF disponible",
        image: "/images/photo-vr.jpg",
        url: "/Dépliant PDF/Dépliant VR.pdf",
      },
    ],
  },
  {
    id: "tracteur",
    titre: "Tracteur",
    description: "Dépliant de garanties pour tracteurs et pelles mécaniques.",
    accent: "bleu",
    image: "/images/photo-atc.jpg",
    documents: [
      {
        titre: "Dépliant Tracteur",
        statut: "PDF disponible",
        image: "/images/photo-atc.jpg",
        url: "/Dépliant PDF/Dépliant Tracteur-Pelle Mecanique.pdf",
      },
    ],
  },
  {
    id: "camion-lourd",
    titre: "Camion lourd",
    description: "Emplacement réservé aux garanties de camions lourds.",
    accent: "violet",
    image: null,
    documents: [],
  },
  {
    id: "hasard-routier",
    titre: "Hasard routier",
    description: "Dépliant de protection Hasard routier.",
    accent: "rouge",
    image: "/images/Autoshield.png",
    documents: [
      {
        titre: "Dépliant Hasard routier",
        statut: "PDF disponible",
        image: "/images/Autoshield.png",
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
                  {categorie.image ? (
                    <img
                      src={categorie.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="pdf-card-media-fallback">
                      <IconCamionLourd />
                    </div>
                  )}
                  <span className="pdf-card-media-shade" />
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

      {/* DÉPLIANTS — retour au format compact d'origine : mini vignette
          photo à gauche + titre + statut + badge « Ouvrir ». Ligne unique,
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
                  {document.image ? (
                    <img
                      src={document.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <IconDocument />
                  )}
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
