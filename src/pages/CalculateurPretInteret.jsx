import { useEffect, useMemo, useRef, useState } from "react";
import "./CalculateurPretInteret.css";

/* ═══════════════════════════════════════════════════════════════════
   CALCULATEUR DE PRÊT AUTOMOBILE — QUÉBEC
   Conforme aux pratiques des prêteurs auto (méthode nominale périodique).
   Taxes : TPS (5 %) + TVQ (9,975 %) cumulées = facteur 1,14975.
   ═══════════════════════════════════════════════════════════════════ */

/* Anciennes clés localStorage. Conservées uniquement pour les NETTOYER
   au montage : les versions précédentes du calculateur persistaient les
   valeurs entre les visites, ce qui pouvait laisser de vieilles données
   sur la page (montants, taux d'un autre client) et induire en erreur le
   conseiller. La nouvelle règle métier : repartir d'un état vierge à
   chaque ouverture de l'onglet « Calculateur Prêt et Intérêt ». */
const STORAGE_KEY = "outil-avantage.calc-pret.v1";
const LEGACY_STORAGE_KEY = "service-avantage.calc-pret.v1";
const FACTEUR_TAXES_QC = 1.14975;

/* Fréquences de paiement supportées (nombre de périodes par an) */
const FREQUENCES = [
  { id: "mensuel", label: "Mensuel", periodesAn: 12 },
  { id: "bihebdo", label: "Aux 2 semaines", periodesAn: 26 },
  { id: "hebdo", label: "Hebdomadaire", periodesAn: 52 },
];

/* Termes en mois affichés en grille — l'utilisateur voit le paiement
   correspondant à CHAQUE terme directement, pour comparaison visuelle. */
const TERMES = [12, 24, 36, 48, 60, 72, 84, 96];

const VALEURS_INITIALES = {
  montantAvantTaxes: "",
  protection: "",
  accessoires: "",
  /* Mode de saisie du capital financé :
     - "detaille" : avant taxes + protections + accessoires → taxes calculées
     - "rapide"   : on saisit DIRECTEMENT le total financé (taxes déjà incluses)
       → utile pour faire un calcul ultra rapide « 45 000 $ à 8,99 % ça donne quoi ? »
       sans se soucier des taxes ni de la ventilation. */
  modeCapital: "detaille",
  totalFinanceManuel: "",
  tauxAnnuel: "8.99",
  /* Terme « mis en avant » : alimente le tableau d'amortissement
     et le mini résumé. Toutes les cartes restent visibles ; celle-ci
     est juste celle qui est légèrement surlignée. */
  termeSelectionne: 60,
  frequence: "mensuel",
  /* Date de livraison / date du premier versement. Quand renseignée,
     elle alimente la colonne « Date » du tableau d'amortissement. */
  dateLivraison: "",
};

const PROFILS_TERMES = {
  12: { badge: "Court terme", promesse: "Remboursement accéléré" },
  24: { badge: "Rapide", promesse: "Moins d'intérêts" },
  36: { badge: "Solide", promesse: "Durée contrôlée" },
  48: { badge: "Équilibré", promesse: "Bon compromis" },
  60: { badge: "Populaire", promesse: "Choix fréquent" },
  72: { badge: "Recommandé", promesse: "Meilleur équilibre" },
  84: { badge: "Confort", promesse: "Paiement réduit" },
  96: { badge: "Accessible", promesse: "Paiement minimal" },
};

function profilTerme(mois) {
  return PROFILS_TERMES[mois] || { badge: "Option", promesse: "À présenter" };
}

/* ───────── Utilitaires de parsing/formatage québécois ───────── */

/** Convertit une saisie utilisateur en nombre (accepte « 20 000,00 » et « 20000.00 »). */
function parseNombre(valeur) {
  if (typeof valeur === "number") return valeur;
  if (!valeur && valeur !== 0) return 0;
  const nettoye = String(valeur)
    .replace(/\s/g, "")
    .replace(/\u00A0/g, "")
    .replace(",", ".");
  const n = parseFloat(nettoye);
  return Number.isFinite(n) ? n : 0;
}

const formatteurMontant = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMontant(n) {
  if (!Number.isFinite(n)) return "—";
  return formatteurMontant.format(n);
}

const formatteurPourcent = new Intl.NumberFormat("fr-CA", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function formatPourcent(decimal) {
  if (!Number.isFinite(decimal)) return "—";
  return formatteurPourcent.format(decimal);
}

/* ───────── Utilitaires de date ─────────
   On manipule les dates en local pour éviter les décalages UTC fâcheux
   (un input type=date renvoie « 2026-06-01 », interprété UTC par défaut). */

/**
 * Renvoie la date du jour au format ISO local YYYY-MM-DD, prête à être
 * binée à un <input type="date">. On reste en heure locale pour éviter
 * qu'un utilisateur sur la côte Est tard le soir voie la date du lendemain
 * UTC dans le champ.
 */
function dateAujourdhuiISO() {
  const d = new Date();
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

/**
 * Construit un état initial frais à chaque appel. La date de livraison
 * est toujours initialisée à la date d'aujourd'hui (le conseiller peut
 * la modifier ensuite si besoin), conformément à la demande métier.
 */
function valeursInitialesFraiches() {
  return { ...VALEURS_INITIALES, dateLivraison: dateAujourdhuiISO() };
}

function parseDateLocale(iso) {
  if (!iso || typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const annee = Number(m[1]);
  const mois = Number(m[2]) - 1;
  const jour = Number(m[3]);
  const d = new Date(annee, mois, jour);
  return Number.isFinite(d.getTime()) ? d : null;
}

const formatteurDate = new Intl.DateTimeFormat("fr-CA", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(date) {
  if (!date) return "—";
  return formatteurDate.format(date);
}

/**
 * Ajoute n mois à une date en plafonnant le jour à la fin du mois cible
 * (ex. 31 janv. + 1 mois = 28/29 févr., et non 3 mars comme le ferait
 * un setMonth naïf de JavaScript).
 */
function ajouterMois(date, n) {
  const annee = date.getFullYear();
  const mois = date.getMonth() + n;
  const jour = date.getDate();
  const cible = new Date(annee, mois, 1);
  const jourMax = new Date(cible.getFullYear(), cible.getMonth() + 1, 0).getDate();
  return new Date(cible.getFullYear(), cible.getMonth(), Math.min(jour, jourMax));
}

function ajouterJours(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Calcule la date du k-ième versement à partir de la date de livraison
 * et de la fréquence. Le 1er versement (k=1) tombe pile sur la date de
 * livraison ; le suivant est espacé d'une période.
 */
function dateVersement(dateDebut, k, frequenceId) {
  if (!dateDebut) return null;
  const offset = k - 1;
  if (frequenceId === "mensuel") return ajouterMois(dateDebut, offset);
  if (frequenceId === "bihebdo") return ajouterJours(dateDebut, offset * 14);
  if (frequenceId === "hebdo") return ajouterJours(dateDebut, offset * 7);
  return ajouterMois(dateDebut, offset);
}

/* ───────── Moteur de calcul financier ───────── */

/**
 * Calcule un paiement périodique d'amortissement standard.
 * Méthode actuarielle conforme à la Loi sur la protection du consommateur (Qc),
 * article 73 et règlement sur les frais de crédit : méthode nominale périodique,
 * i = TAN / nb_périodes_an. C'est aussi la méthode utilisée par tous les grands
 * prêteurs auto canadiens (RBC, BMO, GM Financial, Ford Credit, etc.).
 *
 * Formule :  M = C × i × (1+i)^n / ((1+i)^n − 1)
 *
 * @param {number} capital     Capital initial (incluant taxes Québec).
 * @param {number} tauxAnnuel  Taux annuel nominal (ex: 8.99 pour 8,99 %).
 * @param {number} nbPeriodes  Nombre total de versements.
 * @param {number} periodesAn  Périodes par an (12, 26, 52).
 * @returns {number} Paiement périodique théorique non arrondi.
 */
function calculerPaiement(capital, tauxAnnuel, nbPeriodes, periodesAn) {
  if (!capital || !nbPeriodes || !periodesAn) return 0;
  if (capital <= 0 || nbPeriodes <= 0) return 0;
  const tauxPeriodique = tauxAnnuel / 100 / periodesAn;
  if (tauxPeriodique === 0) {
    return capital / nbPeriodes;
  }
  const facteur = Math.pow(1 + tauxPeriodique, nbPeriodes);
  return (capital * tauxPeriodique * facteur) / (facteur - 1);
}

/** Arrondit un montant au cent (pratique des contrats canadiens). */
function arrondirCent(montant) {
  return Math.round(montant * 100) / 100;
}

/**
 * Construit le tableau d'amortissement complet.
 *
 * Méthode CONFORME aux contrats réels :
 * 1. Le paiement périodique est ARRONDI AU CENT (comme sur le contrat).
 * 2. À chaque période : intérêt = solde × i (calculé sur le solde au début),
 *    capital remboursé = paiement_arrondi − intérêt.
 * 3. Le DERNIER versement absorbe les écarts d'arrondi pour ramener le
 *    solde exactement à 0,00 $.
 *
 * Conforme à la pratique des prêteurs au Québec et au Canada.
 */
function genererAmortissement(
  capital,
  tauxAnnuel,
  nbPeriodes,
  periodesAn,
  paiement,
  dateDebut = null,
  frequenceId = "mensuel"
) {
  const tableau = [];
  if (!capital || !nbPeriodes || !paiement) return tableau;
  const tauxPeriodique = tauxAnnuel / 100 / periodesAn;
  const paiementArrondi = arrondirCent(paiement);
  let solde = capital;

  for (let k = 1; k <= nbPeriodes; k++) {
    const interet = arrondirCent(solde * tauxPeriodique);
    let capitalRembourse = arrondirCent(paiementArrondi - interet);
    let paiementActuel = paiementArrondi;

    /* Dernier paiement : absorbe l'écart d'arrondi pour solder à 0,00 $ exact. */
    if (k === nbPeriodes) {
      capitalRembourse = arrondirCent(solde);
      paiementActuel = arrondirCent(solde + interet);
    }

    const soldeFin = Math.max(0, arrondirCent(solde - capitalRembourse));

    tableau.push({
      numero: k,
      date: dateVersement(dateDebut, k, frequenceId),
      paiement: paiementActuel,
      interet,
      capital: capitalRembourse,
      soldeRestant: soldeFin,
    });

    solde = soldeFin;
  }

  return tableau;
}

/**
 * Calcule les vrais totaux d'un prêt en simulant l'amortissement réel
 * (paiement arrondi au cent, dernier versement ajusté). Permet d'afficher
 * un intérêt total qui correspond EXACTEMENT à la somme des lignes du
 * tableau d'amortissement présenté au client.
 */
function totauxReelsPret(capital, tauxAnnuel, nbPeriodes, periodesAn, paiement) {
  if (!capital || !nbPeriodes || !paiement) {
    return { totalRembourse: 0, interetsTotaux: 0, paiementArrondi: 0, dernierPaiement: 0 };
  }
  const tauxPeriodique = tauxAnnuel / 100 / periodesAn;
  const paiementArrondi = arrondirCent(paiement);
  let solde = capital;
  let dernierPaiement = paiementArrondi;

  for (let k = 1; k <= nbPeriodes; k++) {
    const interet = arrondirCent(solde * tauxPeriodique);
    if (k === nbPeriodes) {
      dernierPaiement = arrondirCent(solde + interet);
      solde = 0;
    } else {
      solde = arrondirCent(solde - (paiementArrondi - interet));
    }
  }

  const totalRembourse = arrondirCent(paiementArrondi * (nbPeriodes - 1) + dernierPaiement);
  return {
    totalRembourse,
    interetsTotaux: arrondirCent(totalRembourse - capital),
    paiementArrondi,
    dernierPaiement,
  };
}

/* ───────── Composant principal ───────── */

/**
 * Purge toute trace d'une session précédente du calculateur dans le
 * localStorage. Appelé au montage ET au démontage du composant pour
 * garantir qu'aucune donnée d'un autre client ne traîne lorsqu'on
 * revient sur l'onglet.
 */
function purgerSauvegardesPretInteret() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* localStorage indisponible (mode privé Safari, etc.) — sans gravité. */
  }
}

function CalculateurPretInteret() {
  /* État initial TOUJOURS frais (date du jour, taux par défaut, aucun
     montant) : on n'hydrate plus depuis le localStorage pour ne pas
     conserver les chiffres d'un client précédent. */
  const [saisie, setSaisie] = useState(valeursInitialesFraiches);
  const [afficherAmortissement, setAfficherAmortissement] = useState(false);
  /* Un seul terme peut avoir son panneau « Détail » ouvert à la fois.
     Quand le conseiller clique sur le bouton info d'une autre carte, le
     précédent se ferme automatiquement et le nouveau s'ouvre — la barre
     de détail se positionne dans la grille juste après la rangée de
     cartes contenant le terme cliqué (grid-column: 1 / -1). */
  const [termeInfoOuvert, setTermeInfoOuvert] = useState(null);
  const amortissementRef = useRef(null);

  /* Quand on ouvre le tableau d'amortissement, on scroll en douceur jusqu'à
     lui pour que le conseiller le voie tout de suite (évite le saut visuel
     « où est passé le tableau ? » sur les petits écrans). */
  useEffect(() => {
    if (afficherAmortissement && amortissementRef.current) {
      const id = window.setTimeout(() => {
        amortissementRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
      return () => window.clearTimeout(id);
    }
  }, [afficherAmortissement]);

  /* Réinitialisation automatique à chaque entrée et sortie de la page.
     - Au MONTAGE : on purge tout reliquat localStorage (sécurité contre
       les anciennes versions du calculateur qui persistaient).
     - Au DÉMONTAGE : on purge à nouveau pour que la prochaine ouverture
       reparte d'un état totalement vierge.
     Combiné avec `useState(valeursInitialesFraiches)`, cela garantit
     qu'aucune donnée d'un client précédent ne réapparaisse quand on
     change d'onglet puis qu'on revient sur le calculateur. */
  useEffect(() => {
    purgerSauvegardesPretInteret();
    return () => {
      purgerSauvegardesPretInteret();
    };
  }, []);

  /* Calculs dérivés via useMemo (recalculés à chaque modification).
     Le calculateur produit maintenant un PAIEMENT PAR TERME : pour le capital
     financé et le taux choisi, on calcule le paiement de chaque terme de la
     liste (12 → 96 mois) à la fréquence active. Le client voit donc 8 cartes
     interactives et choisit visuellement le terme qui lui convient. */
  const calculs = useMemo(() => {
    const montantAvantTaxes = parseNombre(saisie.montantAvantTaxes);
    const protection = parseNombre(saisie.protection);
    const accessoires = parseNombre(saisie.accessoires);
    const totalFinanceManuel = parseNombre(saisie.totalFinanceManuel);
    const tauxAnnuel = parseNombre(saisie.tauxAnnuel);
    const modeRapide = saisie.modeCapital === "rapide";

    /* En mode RAPIDE, le total financé est saisi directement (taxes déjà
       incluses dans le chiffre du conseiller). On NE recalcule PAS les
       taxes : le sous-total avant taxes et la portion taxes ne sont pas
       affichés, et le capital amorti est exactement le montant saisi. */
    const sousTotalAvantTaxes = modeRapide
      ? 0
      : montantAvantTaxes + protection + accessoires;
    const totalAvecTaxes = modeRapide
      ? totalFinanceManuel
      : sousTotalAvantTaxes * FACTEUR_TAXES_QC;
    const taxesQc = modeRapide ? 0 : totalAvecTaxes - sousTotalAvantTaxes;

    const freq = FREQUENCES.find((f) => f.id === saisie.frequence) || FREQUENCES[0];
    const periodesAn = freq.periodesAn;
    const tauxPeriodique = tauxAnnuel / 100 / periodesAn;
    const tauxEffectifAnnuel = Math.pow(1 + tauxPeriodique, periodesAn) - 1;

    const valide =
      totalAvecTaxes > 0 && tauxAnnuel >= 0 && tauxAnnuel <= 100;
    /* Au Québec, le taux d'usure du Code criminel canadien (art. 347) est
       fixé à 60 % effectif annuel ; les prêts auto sérieux sont rarement
       au-dessus de 29,99 %. Au-delà, on alerte le conseiller. */
    const tauxAnormal = tauxAnnuel > 30 && tauxAnnuel <= 100;

    /* Paiements pour CHAQUE terme, à la fréquence active.
       Les totaux (intérêts, coût total) sont calculés via la simulation
       d'amortissement RÉEL (paiement arrondi au cent, dernier versement
       ajusté) — chiffres strictement identiques au tableau présenté au
       client, conformément à la Loi sur la protection du consommateur. */
    const paiementsParTerme = TERMES.map((termeMois) => {
      const nbPeriodes = Math.round((termeMois * periodesAn) / 12);
      const paiement = calculerPaiement(totalAvecTaxes, tauxAnnuel, nbPeriodes, periodesAn);
      const totaux = totauxReelsPret(totalAvecTaxes, tauxAnnuel, nbPeriodes, periodesAn, paiement);
      return {
        termeMois,
        nbPeriodes,
        paiement: totaux.paiementArrondi || paiement,
        dernierPaiement: totaux.dernierPaiement,
        totalRembourse: totaux.totalRembourse,
        interetsTotaux: totaux.interetsTotaux,
      };
    });

    /* Terme « mis en avant » → alimente le mini résumé et le tableau d'amortissement. */
    const termeActif =
      paiementsParTerme.find((p) => p.termeMois === saisie.termeSelectionne) ||
      paiementsParTerme.find((p) => p.termeMois === 60) ||
      paiementsParTerme[0];

    return {
      montantAvantTaxes,
      protection,
      accessoires,
      sousTotalAvantTaxes,
      taxesQc,
      totalAvecTaxes,
      totalFinanceManuel,
      modeRapide,
      tauxAnnuel,
      tauxPeriodique,
      tauxEffectifAnnuel,
      periodesAn,
      frequence: freq,
      paiementsParTerme,
      termeActif,
      valide,
      tauxAnormal,
    };
  }, [saisie]);

  const dateLivraisonParsed = useMemo(
    () => parseDateLocale(saisie.dateLivraison),
    [saisie.dateLivraison]
  );

  /* Tableau d'amortissement du terme actif (uniquement quand affiché). */
  const tableauAmortissement = useMemo(() => {
    if (!afficherAmortissement || !calculs.valide || !calculs.termeActif) return [];
    return genererAmortissement(
      calculs.totalAvecTaxes,
      calculs.tauxAnnuel,
      calculs.termeActif.nbPeriodes,
      calculs.periodesAn,
      calculs.termeActif.paiement,
      dateLivraisonParsed,
      calculs.frequence.id
    );
  }, [afficherAmortissement, calculs, dateLivraisonParsed]);

  /* Handlers */
  const handleChangeMontant = (champ) => (e) => {
    setSaisie((prev) => ({ ...prev, [champ]: e.target.value }));
  };
  const handleChangeTaux = (e) => {
    setSaisie((prev) => ({ ...prev, tauxAnnuel: e.target.value }));
  };
  const handleSelectTerme = (mois) => {
    setSaisie((prev) => ({ ...prev, termeSelectionne: mois }));
  };
  const handleSelectFrequence = (id) => {
    setSaisie((prev) => ({ ...prev, frequence: id }));
  };
  const handleSelectModeCapital = (mode) => {
    setSaisie((prev) => ({ ...prev, modeCapital: mode }));
  };
  const handleReinitialiser = () => {
    setSaisie(valeursInitialesFraiches());
    setAfficherAmortissement(false);
    setTermeInfoOuvert(null);
  };
  /* Toggle exclusif : clic sur un autre terme ferme le précédent
     et ouvre le nouveau ; re-clic sur le même ferme. */
  const handleToggleInfo = (mois) => (e) => {
    e.stopPropagation();
    setTermeInfoOuvert((prev) => (prev === mois ? null : mois));
  };
  const handleImprimer = () => {
    window.print();
  };

  const termeActif = calculs.termeActif;
  const detailTerme =
    termeInfoOuvert !== null
      ? calculs.paiementsParTerme.find((p) => p.termeMois === termeInfoOuvert)
      : null;
  const profilActif = profilTerme(termeActif?.termeMois);
  const freqSuffix =
    calculs.frequence.id === "mensuel"
      ? "mois"
      : calculs.frequence.id === "bihebdo"
        ? "2 sem."
        : "sem.";

  const dateImpression = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("fr-CA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  }, []);

  return (
    <div className="cpi-page">
      {/* En-tête réservé à l'impression : remplace le bandeau visuel par
          une bannière claire (marque + titre + date d'impression) plus
          adaptée au papier qu'une grande photo qui mangerait l'espace. */}
      <header className="cpi-print-only cpi-print-header" aria-hidden="true">
        <div className="cpi-print-header-marque">
          <span className="cpi-print-header-logo">AP+</span>
          <div className="cpi-print-header-titres">
            <strong>Produits Avantage Plus</strong>
            <span>Calcul de paiements automobiles — Québec</span>
          </div>
        </div>
        <div className="cpi-print-header-meta">
          <span className="cpi-print-header-meta-label">Date d'impression</span>
          <strong>{dateImpression}</strong>
        </div>
      </header>

      <section className="cpi-bandeau cpi-no-print" aria-hidden="true">
        <img
          src="/images/petit%20bandeau.jpg"
          alt="Avantage Plus"
          width="7391"
          height="609"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </section>

      {/* Encadré de synthèse imprimable : reprend les chiffres clés de la
          barre résumé d'écran, mais avec une typographie et un layout
          pensés pour le papier (lecture rapide par le client). */}
      <section
        className="cpi-print-only cpi-print-synthese"
        aria-hidden="true"
      >
        <h3>Synthèse du financement proposé</h3>
        <dl>
          <div>
            <dt>Capital financé</dt>
            <dd>{formatMontant(calculs.totalAvecTaxes)}</dd>
            <span>taxes incluses</span>
          </div>
          <div>
            <dt>Paiement {calculs.frequence.label.toLowerCase()}</dt>
            <dd>{termeActif ? formatMontant(termeActif.paiement) : "—"}</dd>
            <span>
              sur {termeActif?.termeMois || "—"} mois
              {termeActif ? ` · ${termeActif.nbPeriodes} versements` : ""}
            </span>
          </div>
          <div>
            <dt>Taux annuel</dt>
            <dd>{formatPourcent(calculs.tauxAnnuel / 100)}</dd>
            <span>
              {calculs.frequence.label.toLowerCase()} ·{" "}
              {dateLivraisonParsed
                ? `1er versement ${formatDate(dateLivraisonParsed)}`
                : "date à confirmer"}
            </span>
          </div>
          <div>
            <dt>Coût total</dt>
            <dd>
              {termeActif ? formatMontant(termeActif.totalRembourse) : "—"}
            </dd>
            <span>
              dont {termeActif ? formatMontant(termeActif.interetsTotaux) : "—"} d'intérêts
            </span>
          </div>
        </dl>
      </section>

      <section
        className="cpi-resume-barre cpi-no-print"
        aria-label="Résumé du financement"
      >
        <div className="cpi-resume-stats">
          <span>
            <small>Financé taxes incluses</small>
            <strong>{formatMontant(calculs.totalAvecTaxes)}</strong>
          </span>
          <span>
            <small>Paiement /{freqSuffix}</small>
            <strong className="cpi-resume-stats-fort">
              {termeActif ? formatMontant(termeActif.paiement) : "—"}
            </strong>
          </span>
          <span>
            <small>Terme sélectionné</small>
            <strong>{termeActif ? `${termeActif.termeMois} mois` : "—"}</strong>
          </span>
          <span>
            <small>Taux annuel</small>
            <strong>{formatPourcent(calculs.tauxAnnuel / 100)}</strong>
          </span>
          <span>
            <small>Fréquence</small>
            <strong>{calculs.frequence.label}</strong>
          </span>
        </div>
        <button
          type="button"
          className="cpi-resume-reset"
          onClick={handleReinitialiser}
          aria-label="Réinitialiser toutes les valeurs"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
          Réinitialiser
        </button>
      </section>

      <div className="cpi-dashboard">
        <aside className="cpi-colonne-saisie" aria-label="Paramètres de financement">
          <section className="cpi-carte cpi-carte-saisie">
            <div className="cpi-carte-entete cpi-entete-compact">
              <span className="cpi-etape">Étape 1</span>
              <h2>Montants</h2>
              <p className="cpi-soustitre">
                {calculs.modeRapide
                  ? "Capital saisi directement, taxes déjà incluses."
                  : "Taxes Québec calculées automatiquement."}
              </p>
            </div>

            <div
              className="cpi-mode-switch"
              role="tablist"
              aria-label="Mode de saisie du capital financé"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!calculs.modeRapide}
                className={
                  "cpi-mode-btn" +
                  (!calculs.modeRapide ? " cpi-mode-btn-actif" : "")
                }
                onClick={() => handleSelectModeCapital("detaille")}
              >
                <span className="cpi-mode-btn-titre">Détaillé</span>
                <span className="cpi-mode-btn-aide">Prix + protections + taxes</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={calculs.modeRapide}
                className={
                  "cpi-mode-btn" +
                  (calculs.modeRapide ? " cpi-mode-btn-actif" : "")
                }
                onClick={() => handleSelectModeCapital("rapide")}
              >
                <span className="cpi-mode-btn-titre">Rapide</span>
                <span className="cpi-mode-btn-aide">Total financé direct</span>
              </button>
            </div>

            {calculs.modeRapide ? (
              <div className="cpi-bulles cpi-bulles-rapide">
                <BulleMontant
                  id="total-finance-manuel"
                  label="Montant total financé (taxes incluses)"
                  valeur={saisie.totalFinanceManuel}
                  onChange={handleChangeMontant("totalFinanceManuel")}
                  placeholder="Ex. 45 000,00"
                  principal
                />

                <div className="cpi-bulle cpi-bulle-calcule cpi-bulle-taxes">
                  <div className="cpi-bulle-haut">
                    <span className="cpi-bulle-label">Capital amorti</span>
                    <span className="cpi-bulle-mention cpi-bulle-mention-info">
                      Taxes incluses
                    </span>
                  </div>
                  <span className="cpi-bulle-valeur cpi-bulle-valeur-grand">
                    {formatMontant(calculs.totalAvecTaxes)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="cpi-bulles">
                <BulleMontant
                  id="montant-avant"
                  label="Montant avant taxes"
                  valeur={saisie.montantAvantTaxes}
                  onChange={handleChangeMontant("montantAvantTaxes")}
                  placeholder="Ex. 20 000,00"
                  principal
                />
                <BulleMontant
                  id="protection"
                  label="Protections"
                  valeur={saisie.protection}
                  onChange={handleChangeMontant("protection")}
                  placeholder="0,00"
                />
                <BulleMontant
                  id="accessoires"
                  label="Accessoires"
                  valeur={saisie.accessoires}
                  onChange={handleChangeMontant("accessoires")}
                  placeholder="0,00"
                />

                <div className="cpi-bulle cpi-bulle-calcule">
                  <span className="cpi-bulle-label">Sous-total avant taxes</span>
                  <span className="cpi-bulle-valeur">{formatMontant(calculs.sousTotalAvantTaxes)}</span>
                </div>

                <div className="cpi-bulle cpi-bulle-calcule cpi-bulle-taxes">
                  <div className="cpi-bulle-haut">
                    <span className="cpi-bulle-label">Total financé</span>
                    <span className="cpi-bulle-mention">+ {formatMontant(calculs.taxesQc)}</span>
                  </div>
                  <span className="cpi-bulle-valeur cpi-bulle-valeur-grand">
                    {formatMontant(calculs.totalAvecTaxes)}
                  </span>
                </div>
              </div>
            )}
          </section>

          <section className="cpi-carte cpi-carte-parametres">
            <div className="cpi-carte-entete cpi-entete-compact">
              <span className="cpi-etape">Étape 2</span>
              <h2>Paramètres</h2>
            </div>

            <div className="cpi-parametres">
              <div className="cpi-param-bloc">
                <label htmlFor="cpi-taux" className="cpi-param-label">
                  Taux d'intérêt annuel
                </label>
                <div className="cpi-taux-wrap">
                  <input
                    id="cpi-taux"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex. 8,99"
                    value={saisie.tauxAnnuel}
                    onChange={handleChangeTaux}
                    className="cpi-taux-input"
                  />
                  <span className="cpi-taux-suffix">% / an</span>
                </div>
              </div>

              <div className="cpi-param-bloc">
                <span className="cpi-param-label">
                  Fréquence
                  <span className="cpi-param-aide-inline">· taxes incluses</span>
                </span>
                <div className="cpi-freq-grille">
                  {FREQUENCES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={
                        "cpi-freq-btn" +
                        (saisie.frequence === f.id ? " cpi-freq-actif" : "")
                      }
                      onClick={() => handleSelectFrequence(f.id)}
                    >
                      <span className="cpi-freq-titre">{f.label}</span>
                      <span className="cpi-freq-mention">{f.periodesAn} / an</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cpi-param-bloc">
                <label htmlFor="cpi-date-livraison" className="cpi-param-label">
                  Date de livraison
                  <span className="cpi-param-aide-inline">· 1er versement</span>
                </label>
                <div className="cpi-date-wrap">
                  <input
                    id="cpi-date-livraison"
                    type="date"
                    className="cpi-date-input"
                    value={saisie.dateLivraison}
                    onChange={handleChangeMontant("dateLivraison")}
                  />
                  {dateLivraisonParsed && (
                    <span className="cpi-date-apercu">
                      {formatDate(dateLivraisonParsed)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

        </aside>

        <main
          className={`cpi-zone-decision${
            afficherAmortissement && calculs.valide && termeActif
              ? " cpi-zone-decision--amorti"
              : ""
          }`}
        >
          <section className="cpi-carte cpi-carte-resultats">
            <div className="cpi-carte-entete cpi-entete-compact">
              <span className="cpi-etape">Résultat</span>
              <h2>Paiement {calculs.frequence.label.toLowerCase()} par terme</h2>
              <span className="cpi-resultat-badge-taxes" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Taxes incluses
              </span>
            </div>

            {calculs.tauxAnormal && (
              <div className="cpi-avis-taux" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>
                  Taux annuel <strong>{formatPourcent(calculs.tauxAnnuel / 100)}</strong> — vérifiez la saisie.
                </span>
              </div>
            )}

            <div className="cpi-resultats">
              <article className="cpi-recommandation" aria-label="Option sélectionnée">
                <div className="cpi-reco-contenu">
                  <span className="cpi-reco-badge">{profilActif.badge}</span>
                  <div>
                    <span className="cpi-reco-label">{profilActif.promesse}</span>
                    <h3>{termeActif?.termeMois || "—"} mois</h3>
                  </div>
                  <strong>{termeActif ? formatMontant(termeActif.paiement) : "—"}</strong>
                  <small>/{freqSuffix} · {termeActif?.nbPeriodes || 0} versements</small>
                </div>
                <div className="cpi-reco-stats">
                  <StatResultat
                    titre="Capital"
                    valeur={formatMontant(calculs.totalAvecTaxes)}
                    mention={calculs.modeRapide ? "Saisi · taxes incluses" : "Avec taxes Québec"}
                  />
                  <StatResultat titre="Intérêts" valeur={formatMontant(termeActif?.interetsTotaux || 0)} mention={`Sur ${termeActif?.termeMois || 0} mois`} />
                  <StatResultat titre="Coût total" valeur={formatMontant(termeActif?.totalRembourse || 0)} mention="Capital + intérêts" />
                </div>
              </article>

              <div className="cpi-notice-terme" role="note">
                <span className="cpi-notice-terme-icone" aria-hidden="true">!</span>
                <span>
                  <strong>Important :</strong> le terme disponible dépend de l'année du véhicule.
                </span>
              </div>

              <div className="cpi-termes-cartes" role="radiogroup" aria-label="Choisir un terme">
                {calculs.paiementsParTerme.map((p) => {
                  const actif = saisie.termeSelectionne === p.termeMois;
                  const infoOuvert = termeInfoOuvert === p.termeMois;
                  const profil = profilTerme(p.termeMois);
                  const onActiverCarte = () => {
                    handleSelectTerme(p.termeMois);
                  };

                  return (
                    <div
                      key={p.termeMois}
                      role="radio"
                      aria-checked={actif}
                      tabIndex={0}
                      className={"cpi-terme-card" + (actif ? " cpi-terme-card-active" : "") + (infoOuvert ? " cpi-terme-card-info-ouvert" : "")}
                      onClick={onActiverCarte}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onActiverCarte();
                        }
                      }}
                    >
                      <header className="cpi-terme-card-bandeau">
                        <span className="cpi-terme-card-titre">{p.termeMois} mois</span>
                      </header>
                      <div className="cpi-terme-card-corps">
                        <span className="cpi-terme-card-montant">
                          {formatMontant(p.paiement)}
                        </span>
                        <span className="cpi-terme-card-freq">/ {freqSuffix}</span>
                        <span className="cpi-terme-card-meta">{profil.promesse}</span>
                      </div>
                      <button
                        type="button"
                        className={"cpi-terme-card-info-btn" + (infoOuvert ? " est-ouvert" : "")}
                        aria-label={(infoOuvert ? "Masquer" : "Voir") + " le détail pour " + p.termeMois + " mois"}
                        aria-expanded={infoOuvert}
                        onClick={handleToggleInfo(p.termeMois)}
                        disabled={!calculs.valide}
                      >
                        <span>{infoOuvert ? "Fermer" : "Détail"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {detailTerme && calculs.valide && (
                <div
                  className="cpi-terme-detail"
                  role="region"
                  aria-label={`Détail pour ${detailTerme.termeMois} mois`}
                >
                  <div className="cpi-terme-detail-entete">
                    <span className="cpi-terme-detail-titre">
                      Détail · <strong>{detailTerme.termeMois} mois</strong>
                    </span>
                    <span className="cpi-terme-detail-meta">
                      {detailTerme.nbPeriodes} versements {calculs.frequence.label.toLowerCase()}s · taux périodique {formatPourcent(calculs.tauxPeriodique)}
                    </span>
                    <button
                      type="button"
                      className="cpi-terme-detail-fermer"
                      onClick={() => setTermeInfoOuvert(null)}
                      aria-label="Fermer le détail"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="cpi-terme-detail-grille">
                    <StatResultat
                      titre="Capital financé"
                      valeur={formatMontant(calculs.totalAvecTaxes)}
                      mention={calculs.modeRapide ? "Saisi · taxes incluses" : "Avec taxes Québec"}
                    />
                    <StatResultat titre="Intérêts totaux" valeur={formatMontant(detailTerme.interetsTotaux)} mention={`Sur ${detailTerme.termeMois} mois`} />
                    <StatResultat titre="Coût total" valeur={formatMontant(detailTerme.totalRembourse)} mention="Capital + intérêts" />
                    <StatResultat titre="Taux effectif" valeur={formatPourcent(calculs.tauxEffectifAnnuel)} mention="Annuel équivalent" />
                  </div>
                </div>
              )}

              <div className="cpi-actions">
                <button type="button" className="cpi-btn cpi-btn-secondaire" onClick={handleImprimer} disabled={!calculs.valide}>
                  Imprimer
                </button>
                <button
                  type="button"
                  className={"cpi-btn cpi-btn-primaire" + (afficherAmortissement ? " cpi-btn-actif" : "")}
                  onClick={() => setAfficherAmortissement((v) => !v)}
                  disabled={!calculs.valide}
                >
                  Tableau d'amortissement
                </button>
              </div>
            </div>
          </section>

          {afficherAmortissement && calculs.valide && termeActif && (
            <section
              ref={amortissementRef}
              className="cpi-carte cpi-carte-amortissement"
            >
              <div className="cpi-carte-entete cpi-entete-compact">
                <span className="cpi-etape">Tableau</span>
                <h2>Amortissement — {termeActif.termeMois} mois</h2>
                <p className="cpi-soustitre">
                  {termeActif.nbPeriodes} versements · taux périodique {formatPourcent(calculs.tauxPeriodique)}
                  {dateLivraisonParsed && (
                    <>
                      {" · 1"}
                      <sup>er</sup>
                      {" versement le "}
                      <strong>{formatDate(dateLivraisonParsed)}</strong>
                    </>
                  )}
                </p>
              </div>

              <div className="cpi-tableau-wrap">
                <table className="cpi-tableau">
                  <thead>
                    <tr>
                      <th>#</th>
                      {dateLivraisonParsed && <th>Date</th>}
                      <th>Paiement</th>
                      <th>Intérêts</th>
                      <th>Capital remboursé</th>
                      <th>Solde restant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableauAmortissement.map((ligne) => (
                      <tr key={ligne.numero}>
                        <td className="cpi-num">{ligne.numero}</td>
                        {dateLivraisonParsed && (
                          <td className="cpi-date-cell">{formatDate(ligne.date)}</td>
                        )}
                        <td>{formatMontant(ligne.paiement)}</td>
                        <td className="cpi-interet">{formatMontant(ligne.interet)}</td>
                        <td className="cpi-capital">{formatMontant(ligne.capital)}</td>
                        <td className="cpi-solde">{formatMontant(ligne.soldeRestant)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      {dateLivraisonParsed && <td></td>}
                      <td>{formatMontant(termeActif.totalRembourse)}</td>
                      <td>{formatMontant(termeActif.interetsTotaux)}</td>
                      <td>{formatMontant(calculs.totalAvecTaxes)}</td>
                      <td>0,00 $</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Pied de page d'impression : rappel légal + signature de marque.
          Caché à l'écran, visible uniquement sur le document imprimé. */}
      <footer className="cpi-print-only cpi-print-footer" aria-hidden="true">
        <div className="cpi-print-footer-bloc">
          <strong>Produits Avantage Plus</strong>
          <span>Calcul à titre indicatif — Ne constitue pas une offre de crédit.</span>
        </div>
        <div className="cpi-print-footer-bloc cpi-print-footer-bloc-droite">
          <span>Document généré le {dateImpression}</span>
          <span>
            Méthode : amortissement nominal périodique (Loi sur la protection du consommateur, art. 73).
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ───────── Sous-composants ───────── */

function BulleMontant({ id, label, valeur, onChange, placeholder, principal }) {
  return (
    <div className={"cpi-bulle cpi-bulle-saisie" + (principal ? " cpi-bulle-principale" : "")}>
      <label htmlFor={id} className="cpi-bulle-label">
        {label}
      </label>
      <div className="cpi-bulle-input-wrap">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={valeur}
          onChange={onChange}
          className="cpi-bulle-input"
          autoComplete="off"
        />
        <span className="cpi-bulle-devise">$</span>
      </div>
    </div>
  );
}

function StatResultat({ titre, valeur, mention }) {
  return (
    <div className="cpi-stat">
      <span className="cpi-stat-titre">{titre}</span>
      <span className="cpi-stat-valeur">{valeur}</span>
      <span className="cpi-stat-mention">{mention}</span>
    </div>
  );
}

export default CalculateurPretInteret;
