/* ═══════════════════════════════════════════════════════════════════
   SCALING COMMUN — Agrandissement adaptatif des feuilles à l'écran
   Partagé par les 3 outils :
     - calculateur-vitrine-voiture.html
     - formulaire-accueil-client.html
     - formulaire-transfert-fni.html

   Principe :
   - La .sheet a une largeur intrinsèque de 8.5in (≈ 816 px à 96 dpi),
     ce qui paraît petit sur les grands écrans.
   - Ce script applique un `zoom` CSS au <html> calculé en fonction de la
     largeur du viewport, pour remplir l'espace disponible sans déborder.
   - PROTECTION IMPRIMÉE :
       1. Une règle CSS @media print remet `html.zoom` à 1.
       2. Un listener `beforeprint` en phase capture remet à zéro la valeur
          inline avant que le code interne du formulaire n'exécute son
          propre `fitSheetToOnePage()`.
       3. `afterprint` restaure le zoom écran.
   - PROTECTION PDF (html2canvas) :
       html2canvas est appelé avec `windowWidth: 816`, il rend la .sheet
       dans son propre viewport virtuel, donc le zoom du <html> n'a aucun
       effet sur le rendu PDF. Aucune action supplémentaire requise.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  /* Largeur naturelle de la feuille = 8.5in × 96 dpi */
  var SHEET_PX = 816;
  /* Marge minimale autour de la feuille à l'écran (en px) */
  var MARGIN = 32;
  /* Bornes du zoom :
     - MIN = 1 : on ne réduit jamais (le CSS gère déjà les petits écrans
       via @media max-width: 900px qui passe .sheet à width:100%).
     - MAX = 1.35 : on agrandit modérément. Au-delà, les champs sont
       trop massifs et on perd la vue d'ensemble du formulaire ce qui
       nuit à la saisie (feedback utilisateur). 1.35 garde une lisibilité
       confortable tout en montrant ~75 % du formulaire d'un coup d'œil
       sur un écran 1080p, et la totalité sur un 1440p. */
  var MIN = 1;
  var MAX = 1.35;

  /* 1. Injecte la règle CSS pour annuler le zoom à l'impression.
        Posée en premier dans <head> pour qu'elle soit prioritaire. */
  try {
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-scaling-commun', 'print-reset');
    styleEl.textContent = '@media print { html { zoom: 1 !important; } }';
    (document.head || document.documentElement).appendChild(styleEl);
  } catch (e) { /* noop */ }

  function compute() {
    var vw = (document.documentElement && document.documentElement.clientWidth) || window.innerWidth || 0;
    if (!vw) return;
    var target = vw - MARGIN;
    var z = target / SHEET_PX;
    if (z < MIN) z = MIN;
    if (z > MAX) z = MAX;
    /* Arrondi à 3 décimales pour éviter les recalculs en cascade */
    z = Math.round(z * 1000) / 1000;
    document.documentElement.style.zoom = z;
  }

  function reset() {
    /* Vide explicitement la propriété inline (style.zoom = '' supprime la déclaration) */
    document.documentElement.style.zoom = '';
  }

  /* 2. Reset avant impression (phase capture pour passer avant les autres handlers
        comme `prepareSheetForExport`/`fitSheetToOnePage` enregistrés par les formulaires). */
  window.addEventListener('beforeprint', reset, true);
  window.addEventListener('afterprint', function () {
    /* On laisse le formulaire finir son nettoyage (clearFitSheet) puis on restaure. */
    setTimeout(compute, 0);
  }, true);

  /* 3. Resize : recalcul throttlé pour éviter le spam d'événements
        (zoom CSS provoque un relayout, on veut le minimiser pendant un drag). */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(compute, 100);
  });

  /* 4. Initialisation */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', compute);
  } else {
    compute();
  }
})();
