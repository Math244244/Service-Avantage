import "./FormulaireAvantagePlus.css";

const formulaires = [
  {
    titre: "Résiliation perte totale - vol",
    description:
      "Demande de résiliation de garantie à utiliser lors d'une perte totale ou d'un vol du véhicule.",
    statut: "PDF disponible",
    url: "/Formulaire/Formulaire%20de%20R%C3%A9siliation%20Perte%20Totale%20-%20Vol.pdf",
    accent: "rouge",
  },
  {
    titre: "Transfert de garantie",
    description:
      "Formulaire de demande de transfert de garantie à soumettre lors d'un changement de propriétaire.",
    statut: "PDF disponible",
    url: "/Formulaire/Formulaire_Transfert_Garantie_FR%202025%20%281%29%20%281%29.pdf",
    accent: "violet",
  },
  {
    titre: "Réclamation - procédure",
    description:
      "Guide des étapes, documents requis et suivis pour traiter une demande de réclamation.",
    statut: "PDF disponible",
    url: "/Formulaire/R%C3%A9clamation%20Proc%C3%A9dure%20.pdf",
    accent: "bleu",
  },
];

function IconFormulaire() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 12l2 2 4-4" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function FormulaireAvantagePlus() {
  return (
    <div className="form-ap-page">
      <section className="form-ap-hero">
        <div>
          <span className="form-ap-eyebrow">Bibliothèque de formulaires</span>
          <h1>Formulaire Avantage Plus</h1>
          <p>
            Retrouvez au même endroit les formulaires administratifs liés à
            Avantage Plus. Chaque carte ouvre le PDF dans un nouvel onglet pour
            faciliter la consultation, le téléchargement ou l'impression.
          </p>
        </div>
      </section>

      <section className="form-ap-section">
        <div className="form-ap-section-header">
          <div>
            <h2>Formulaires disponibles</h2>
            <p>
              Formulaires liés aux demandes de résiliation, aux transferts de
              garantie et aux procédures de réclamation.
            </p>
          </div>
          <span>{formulaires.length} cartes</span>
        </div>

        <div className="form-ap-grid">
          {formulaires.map((formulaire) => (
            <a
              key={formulaire.url}
              href={formulaire.url}
              target="_blank"
              rel="noreferrer"
              className={`form-ap-card form-ap-${formulaire.accent}`}
            >
              <span className="form-ap-card-icon"><IconFormulaire /></span>
              <span className="form-ap-card-title">{formulaire.titre}</span>
              <span className="form-ap-card-description">{formulaire.description}</span>
              <span className="form-ap-card-footer">
                <span>{formulaire.statut}</span>
                <strong>Ouvrir</strong>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FormulaireAvantagePlus;
