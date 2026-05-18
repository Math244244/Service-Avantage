import OutilFrame from "../components/OutilFrame";

const ICONE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);

function FormulaireTransfertFI() {
  return (
    <OutilFrame
      titre="Fiche Transfert FNI"
      sousTitre="Transfert vers le directeur financier — Avantage Plus"
      url="/outils/formulaire-transfert-fni.html"
      couleur="violet"
      icone={ICONE}
    />
  );
}

export default FormulaireTransfertFI;
