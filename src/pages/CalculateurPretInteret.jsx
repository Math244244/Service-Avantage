import { useEffect, useMemo, useState } from "react";
import "./CalculateurPretInteret.css";

/* ═══════════════════════════════════════════════════════════════════
   CALCULATEUR DE PRÊT AUTOMOBILE — QUÉBEC
   Conforme aux pratiques des prêteurs auto (méthode nominale périodique).
   Taxes : TPS (5 %) + TVQ (9,975 %) cumulées = facteur 1,14975.
   ═══════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "outil-avantage.calc-pret.v1";
/* Ancienne clé conservée pour migration douce après le renommage. */
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
  tauxAnnuel: "",
  /* Terme « mis en avant » : alimente le tableau d'amortissement
     et le mini résumé. Toutes les cartes restent visibles ; celle-ci
     est juste celle qui est légèrement surlignée. */
  termeSelectionne: 60,
  frequence: "mensuel",
};

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
function genererAmortissement(capital, tauxAnnuel, nbPeriodes, periodesAn, paiement) {
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
  let totalInterets = 0;
  let dernierPaiement = paiementArrondi;

  for (let k = 1; k <= nbPeriodes; k++) {
    const interet = arrondirCent(solde * tauxPeriodique);
    totalInterets += interet;
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

function chargerSauvegarde() {
  try {
    let brut = localStorage.getItem(STORAGE_KEY);
    if (!brut) {
      /* Migration douce des anciennes sauvegardes Service-Avantage. */
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        brut = legacy;
        try {
          localStorage.setItem(STORAGE_KEY, legacy);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (_e) {
          /* ignore */
        }
      }
    }
    if (!brut) return null;
    const data = JSON.parse(brut);
    if (data && typeof data === "object") return data;
  } catch (_e) {
    /* ignore */
  }
  return null;
}

function CalculateurPretInteret() {
  const [saisie, setSaisie] = useState(() => {
    const sauv = chargerSauvegarde();
    return { ...VALEURS_INITIALES, ...(sauv || {}) };
  });
  const [afficherAmortissement, setAfficherAmortissement] = useState(false);
  /* Un seul terme peut avoir son panneau « Détail » ouvert à la fois.
     Quand le conseiller clique sur le bouton info d'une autre carte, le
     précédent se ferme automatiquement et le nouveau s'ouvre — la barre
     de détail se positionne dans la grille juste après la rangée de
     cartes contenant le terme cliqué (grid-column: 1 / -1). */
  const [termeInfoOuvert, setTermeInfoOuvert] = useState(null);

  /* Persistance localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saisie));
    } catch (_e) {
      /* stockage indisponible */
    }
  }, [saisie]);

  /* Calculs dérivés via useMemo (recalculés à chaque modification).
     Le calculateur produit maintenant un PAIEMENT PAR TERME : pour le capital
     financé et le taux choisi, on calcule le paiement de chaque terme de la
     liste (12 → 96 mois) à la fréquence active. Le client voit donc 8 cartes
     interactives et choisit visuellement le terme qui lui convient. */
  const calculs = useMemo(() => {
    const montantAvantTaxes = parseNombre(saisie.montantAvantTaxes);
    const protection = parseNombre(saisie.protection);
    const accessoires = parseNombre(saisie.accessoires);
    const tauxAnnuel = parseNombre(saisie.tauxAnnuel);

    const sousTotalAvantTaxes = montantAvantTaxes + protection + accessoires;
    const totalAvecTaxes = sousTotalAvantTaxes * FACTEUR_TAXES_QC;
    const taxesQc = totalAvecTaxes - sousTotalAvantTaxes;

    const freq = FREQUENCES.find((f) => f.id === saisie.frequence) || FREQUENCES[0];
    const periodesAn = freq.periodesAn;
    const tauxPeriodique = tauxAnnuel / 100 / periodesAn;
    const tauxEffectifAnnuel = Math.pow(1 + tauxPeriodique, periodesAn) - 1;

    const valide =
      sousTotalAvantTaxes > 0 && tauxAnnuel >= 0 && tauxAnnuel <= 100;
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

  /* Tableau d'amortissement du terme actif (uniquement quand affiché). */
  const tableauAmortissement = useMemo(() => {
    if (!afficherAmortissement || !calculs.valide || !calculs.termeActif) return [];
    return genererAmortissement(
      calculs.totalAvecTaxes,
      calculs.tauxAnnuel,
      calculs.termeActif.nbPeriodes,
      calculs.periodesAn,
      calculs.termeActif.paiement
    );
  }, [afficherAmortissement, calculs]);

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
  const handleReinitialiser = () => {
    setSaisie(VALEURS_INITIALES);
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

  return (
    <div className="cpi-page">
      {/* ═══════ Bandeau en-tête ═══════ */}
      <div className="cpi-bandeau">
        <img src="/images/petit%20bandeau.jpg" alt="Avantage Plus" />
      </div>

      {/* ═══════ Carte 1 : Montants ═══════ */}
      <section className="cpi-carte">
        <div className="cpi-carte-entete cpi-entete-compact">
          <span className="cpi-etape">Étape 1</span>
          <h2>Montants à financer</h2>
          <p className="cpi-soustitre">Taxes Québec (14,975 %) calculées automatiquement.</p>
        </div>

        <div className="cpi-bulles">
          <BulleMontant
            id="montant-avant"
            label="1. Montant à financer (avant taxes)"
            valeur={saisie.montantAvantTaxes}
            onChange={handleChangeMontant("montantAvantTaxes")}
            placeholder="Ex. 20 000,00"
            principal
          />
          <BulleMontant
            id="protection"
            label="2. Protection additionnelle"
            valeur={saisie.protection}
            onChange={handleChangeMontant("protection")}
            placeholder="0,00"
          />
          <BulleMontant
            id="accessoires"
            label="3. Accessoires"
            valeur={saisie.accessoires}
            onChange={handleChangeMontant("accessoires")}
            placeholder="0,00"
          />

          <div className="cpi-bulle cpi-bulle-calcule">
            <span className="cpi-bulle-label">4. Sous-total financé (avant taxes)</span>
            <span className="cpi-bulle-valeur">{formatMontant(calculs.sousTotalAvantTaxes)}</span>
          </div>

          <div className="cpi-bulle cpi-bulle-calcule cpi-bulle-taxes">
            <div className="cpi-bulle-haut">
              <span className="cpi-bulle-label">5. Total financé (avec taxes Québec)</span>
              <span className="cpi-bulle-mention">+ {formatMontant(calculs.taxesQc)} de taxes</span>
            </div>
            <span className="cpi-bulle-valeur cpi-bulle-valeur-grand">
              {formatMontant(calculs.totalAvecTaxes)}
            </span>
          </div>
        </div>
      </section>

      {/* ═══════ Carte 2 : Paramètres du prêt (taux + fréquence) ═══════ */}
      <section className="cpi-carte">
        <div className="cpi-carte-entete cpi-entete-compact">
          <span className="cpi-etape">Étape 2</span>
          <h2>Paramètres du prêt</h2>
          <p className="cpi-soustitre">
            Choisissez le taux et la fréquence — le paiement pour chaque terme s'affiche en bas.
          </p>
        </div>

        <div className="cpi-parametres cpi-parametres-2col">
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
              Fréquence de paiement
              <span className="cpi-param-aide-inline">· taxes incluses</span>
            </span>
            <div className="cpi-freq-grille cpi-freq-grille-horizontale">
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
        </div>
      </section>

      {/* ═══════ Carte 3 : Résultats — grille de cartes par terme ═══════ */}
      <section className="cpi-carte cpi-carte-resultats">
        <div className="cpi-carte-entete cpi-entete-compact">
          <span className="cpi-etape">Résultat</span>
          <h2>Paiement {calculs.frequence.label.toLowerCase()} par terme</h2>
          <span className="cpi-resultat-badge-taxes" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Taxes du Québec incluses
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
              Taux annuel <strong>{formatPourcent(calculs.tauxAnnuel / 100)}</strong> — supérieur aux taux typiques du financement automobile au Québec (≤ 29,99 %). Vérifiez la saisie.
            </span>
          </div>
        )}

        <div className="cpi-resultats">
          {/* Grille de cartes rouges : une par terme.
              Chaque carte expose un petit bouton « ℹ » qui ouvre une barre
              de détail PLEINE LARGEUR placée dans la même grille via
              grid-column: 1 / -1 — donc CSS Grid l'insère automatiquement
              juste après la rangée de la carte cliquée. Un seul détail
              ouvert à la fois (toggle exclusif via setTermeInfoOuvert). */}
          <div className="cpi-termes-cartes" role="radiogroup" aria-label="Choisir un terme">
            {calculs.paiementsParTerme.map((p, idx) => {
              const actif = saisie.termeSelectionne === p.termeMois;
              const infoOuvert = termeInfoOuvert === p.termeMois;
              const freqSuffix =
                calculs.frequence.id === "mensuel" ? "mois"
                : calculs.frequence.id === "bihebdo" ? "2 sem."
                : "sem.";
              const onActiverCarte = () => {
                if (calculs.valide) handleSelectTerme(p.termeMois);
              };
              const cartes = [
                <div
                  key={"card-" + p.termeMois}
                  role="radio"
                  aria-checked={actif}
                  aria-disabled={!calculs.valide}
                  tabIndex={calculs.valide ? 0 : -1}
                  className={"cpi-terme-card" + (actif ? " cpi-terme-card-active" : "") + (infoOuvert ? " cpi-terme-card-info-ouvert" : "") + (!calculs.valide ? " cpi-terme-card-disabled" : "")}
                  onClick={onActiverCarte}
                  onKeyDown={(e) => {
                    if (!calculs.valide) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onActiverCarte();
                    }
                  }}
                >
                  <span className="cpi-terme-card-label">{p.termeMois} mois</span>
                  <span className="cpi-terme-card-montant">
                    {calculs.valide ? formatMontant(p.paiement) : "—"}
                  </span>
                  <span className="cpi-terme-card-freq">/ {freqSuffix}</span>
                  <span className="cpi-terme-card-meta">
                    {calculs.valide ? `${p.nbPeriodes} versements` : "—"}
                  </span>
                  <span className="cpi-terme-card-taxes">✓ Taxes incl.</span>
                  {/* Bouton « Info / Fermer » : toggle exclusif du panneau de détail */}
                  <button
                    type="button"
                    className={"cpi-terme-card-info-btn" + (infoOuvert ? " est-ouvert" : "")}
                    aria-label={(infoOuvert ? "Masquer" : "Voir") + " le détail pour " + p.termeMois + " mois"}
                    aria-expanded={infoOuvert}
                    onClick={handleToggleInfo(p.termeMois)}
                    disabled={!calculs.valide}
                  >
                    {infoOuvert ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    )}
                    <span>{infoOuvert ? "Fermer" : "Info"}</span>
                  </button>
                </div>,
              ];
              /* Insertion du panneau de détail après la 4e carte (rangée 1)
                 ou après la 8e carte (rangée 2). CSS Grid place le panneau
                 (grid-column: 1/-1) sous la rangée correspondante. */
              const finDeRangee = idx === 3 || idx === 7;
              if (finDeRangee && termeInfoOuvert !== null && calculs.valide) {
                const indexTermeOuvert = calculs.paiementsParTerme.findIndex((x) => x.termeMois === termeInfoOuvert);
                const dansRangee =
                  indexTermeOuvert >= 0 &&
                  ((idx === 3 && indexTermeOuvert <= 3) || (idx === 7 && indexTermeOuvert >= 4 && indexTermeOuvert <= 7));
                if (dansRangee) {
                  const pOuvert = calculs.paiementsParTerme[indexTermeOuvert];
                  cartes.push(
                    <div
                      key={"detail-" + termeInfoOuvert}
                      className="cpi-terme-detail"
                      role="region"
                      aria-label={`Détail pour ${termeInfoOuvert} mois`}
                    >
                      <div className="cpi-terme-detail-entete">
                        <span className="cpi-terme-detail-titre">
                          Détail · <strong>{termeInfoOuvert} mois</strong>
                        </span>
                        <span className="cpi-terme-detail-meta">
                          {pOuvert.nbPeriodes} versements {calculs.frequence.label.toLowerCase()}s · taux périodique {formatPourcent(calculs.tauxPeriodique)}
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
                          mention="Avec taxes Québec"
                        />
                        <StatResultat
                          titre="Intérêts totaux"
                          valeur={formatMontant(pOuvert.interetsTotaux)}
                          mention={`Sur ${termeInfoOuvert} mois`}
                        />
                        <StatResultat
                          titre="Coût total"
                          valeur={formatMontant(pOuvert.totalRembourse)}
                          mention="Capital + intérêts"
                        />
                        <StatResultat
                          titre="Taux effectif"
                          valeur={formatPourcent(calculs.tauxEffectifAnnuel)}
                          mention="Annuel équivalent (TAEG)"
                        />
                        <StatResultat
                          titre="Paiement"
                          valeur={formatMontant(pOuvert.paiement)}
                          mention={calculs.frequence.label}
                        />
                        <StatResultat
                          titre="Dernier versement"
                          valeur={formatMontant(pOuvert.dernierPaiement)}
                          mention="Ajusté à l'arrondi"
                        />
                      </div>
                    </div>
                  );
                }
              }
              return cartes;
            })}
          </div>

          <div className="cpi-actions">
            <button
              type="button"
              className="cpi-btn cpi-btn-ghost"
              onClick={handleReinitialiser}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              Réinitialiser
            </button>
            <button
              type="button"
              className="cpi-btn cpi-btn-secondaire"
              onClick={handleImprimer}
              disabled={!calculs.valide}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Imprimer
            </button>
            <button
              type="button"
              className={"cpi-btn cpi-btn-primaire" + (afficherAmortissement ? " cpi-btn-actif" : "")}
              onClick={() => setAfficherAmortissement((v) => !v)}
              disabled={!calculs.valide}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              Tableau d'amortissement
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ Carte 4 : Tableau d'amortissement (conditionnel) ═══════ */}
      {afficherAmortissement && calculs.valide && calculs.termeActif && (
        <section className="cpi-carte cpi-carte-amortissement">
          <div className="cpi-carte-entete">
            <h2>Tableau d'amortissement — {calculs.termeActif.termeMois} mois</h2>
            <p className="cpi-soustitre">
              {calculs.termeActif.nbPeriodes} versements {calculs.frequence.label.toLowerCase()}s — taux périodique
              appliqué : {formatPourcent(calculs.tauxPeriodique)}
            </p>
          </div>

          <div className="cpi-tableau-wrap">
            <table className="cpi-tableau">
              <thead>
                <tr>
                  <th>#</th>
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
                  <td>{formatMontant(calculs.termeActif.totalRembourse)}</td>
                  <td>{formatMontant(calculs.termeActif.interetsTotaux)}</td>
                  <td>{formatMontant(calculs.totalAvecTaxes)}</td>
                  <td>0,00 $</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
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
