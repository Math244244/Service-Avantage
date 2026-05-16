import "./OutilFrame.css";

/* L'en-tête (icône colorée + titre + sous-titre) a été retiré : le titre
   de l'outil est déjà affiché dans le header global de l'application,
   ce qui rendait le bandeau redondant. Les props titre/sousTitre/couleur/
   icone restent acceptées pour compatibilité (le titre est utilisé
   comme attribut d'accessibilité sur l'iframe). */
function OutilFrame({ titre, url }) {
  return (
    <div className="of-page">
      <div className="of-iframe-wrap">
        <iframe
          src={url}
          title={titre}
          className="of-iframe"
          loading="eager"
        />
      </div>
    </div>
  );
}

export default OutilFrame;
