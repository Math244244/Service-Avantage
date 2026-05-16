import OutilFrame from "../components/OutilFrame";

const ICONE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="10" y2="11" />
    <line x1="13" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="10" y2="15" />
    <line x1="13" y1="15" x2="16" y2="15" />
  </svg>
);

function CalculateurVitrineVoiture() {
  return (
    <OutilFrame
      titre="Calculateur Vitrine Voiture"
      sousTitre="Calculateur paiements auto — Avantage Plus"
      url="/outils/calculateur-vitrine-voiture.html"
      couleur="vert"
      icone={ICONE}
    />
  );
}

export default CalculateurVitrineVoiture;
