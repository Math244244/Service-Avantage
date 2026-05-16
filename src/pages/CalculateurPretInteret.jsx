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

/* Termes en mois — modes "année pleine" et "demi-année" */
const TERMES_ANNEE_PLEINE = [12, 24, 36, 48, 60, 72, 84, 96];
const TERMES_DEMI_ANNEE = [18, 30, 42, 54, 66, 78, 90];

const VALEURS_INITIALES = {
  montantAvantTaxes: "",
  protection: "",
  accessoires: "",
  tauxAnnuel: "",
  termeMois: 60,
  modeDemiAnnee: false,
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
 * @param {number} capital  Capital initial du prêt (incluant taxes).
 * @param {number} tauxAnnuel  Taux annuel en pourcentage (ex: 8.99).
 * @param {number} nbPeriodes  Nombre total de versements.
 * @param {number} periodesAn  Fréquence (12, 26, 52).
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

/**
 * Construit le tableau d'amortissement complet.
 * Le dernier versement absorbe l'arrondi pour garantir un solde final = 0,00 $.
 */
function genererAmortissement(capital, tauxAnnuel, nbPeriodes, periodesAn, paiement) {
  const tableau = [];
  if (!capital || !nbPeriodes || !paiement) return tableau;
  const tauxPeriodique = tauxAnnuel / 100 / periodesAn;
  let solde = capital;

  for (let k = 1; k <= nbPeriodes; k++) {
    const interet = solde * tauxPeriodique;
    let capitalRembourse = paiement - interet;
    let paiementActuel = paiement;

    /* Dernier paiement : ajuste pour solde final exact à zéro */
    if (k === nbPeriodes) {
      capitalRembourse = solde;
      paiementActuel = solde + interet;
    }

    const soldeFin = Math.max(0, solde - capitalRembourse);

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
  /* Mode client par défaut : on cache les chiffres "détails" (intérêts totaux,
     coût total, etc.) pour ne montrer que le paiement périodique. Le conseiller
     les révèle au besoin via le bouton « Information complémentaire ». */
  const [afficherStats, setAfficherStats] = useState(false);

  /* Persistance localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saisie));
    } catch (_e) {
      /* stockage indisponible */
    }
  }, [saisie]);

  /* Si on change de mode (demi-année / année pleine), s'assurer que le terme
     sélectionné est encore dans la liste — sinon, choisir un terme par défaut. */
  useEffect(() => {
    const termesValides = saisie.modeDemiAnnee ? TERMES_DEMI_ANNEE : TERMES_ANNEE_PLEINE;
    if (!termesValides.includes(saisie.termeMois)) {
      setSaisie((prev) => ({
        ...prev,
        termeMois: saisie.modeDemiAnnee ? 60 - 6 : 60 /* 54 ou 60 */,
      }));
    }
  }, [saisie.modeDemiAnnee, saisie.termeMois]);

  /* Calculs dérivés via useMemo (recalculés à chaque modification) */
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
    const nbPeriodes = Math.round((saisie.termeMois * periodesAn) / 12);

    const paiement = calculerPaiement(totalAvecTaxes, tauxAnnuel, nbPeriodes, periodesAn);
    const totalRembourse = paiement * nbPeriodes;
    const interetsTotaux = Math.max(0, totalRembourse - totalAvecTaxes);

    /* Taux périodique appliqué et taux effectif annuel équivalent */
    const tauxPeriodique = tauxAnnuel / 100 / periodesAn;
    const tauxEffectifAnnuel = Math.pow(1 + tauxPeriodique, periodesAn) - 1;

    const valide =
      sousTotalAvantTaxes > 0 &&
      tauxAnnuel >= 0 &&
      tauxAnnuel <= 100 &&
      nbPeriodes > 0;

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
      nbPeriodes,
      paiement,
      totalRembourse,
      interetsTotaux,
      frequence: freq,
      valide,
    };
  }, [saisie]);

  /* Tableau d'amortissement (uniquement quand affiché, pour économiser le rendu) */
  const tableauAmortissement = useMemo(() => {
    if (!afficherAmortissement || !calculs.valide) return [];
    return genererAmortissement(
      calculs.totalAvecTaxes,
      calculs.tauxAnnuel,
      calculs.nbPeriodes,
      calculs.periodesAn,
      calculs.paiement
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
    setSaisie((prev) => ({ ...prev, termeMois: mois }));
  };
  const handleToggleDemiAnnee = (e) => {
    setSaisie((prev) => ({ ...prev, modeDemiAnnee: e.target.checked }));
  };
  const handleSelectFrequence = (id) => {
    setSaisie((prev) => ({ ...prev, frequence: id }));
  };
  const handleReinitialiser = () => {
    setSaisie(VALEURS_INITIALES);
    setAfficherAmortissement(false);
    setAfficherStats(false);
  };
  const handleImprimer = () => {
    window.print();
  };

  const termesAffiches = saisie.modeDemiAnnee ? TERMES_DEMI_ANNEE : TERMES_ANNEE_PLEINE;

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

      {/* ═══════ Carte 2 : Paramètres du prêt ═══════ */}
      <section className="cpi-carte">
        <div className="cpi-carte-entete cpi-entete-compact">
          <span className="cpi-etape">Étape 2</span>
          <h2>Paramètres du prêt</h2>
          <p className="cpi-soustitre">Taux, durée et fréquence de paiement.</p>
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

          <div className="cpi-param-bloc cpi-param-bloc-duree">
            <div className="cpi-param-label-row">
              <span className="cpi-param-label">
                Durée
                <span className="cpi-param-aide-inline">
                  · {Math.round((saisie.termeMois / 12) * 100) / 100} ans
                </span>
              </span>
              <label className="cpi-toggle">
                <input
                  type="checkbox"
                  checked={saisie.modeDemiAnnee}
                  onChange={handleToggleDemiAnnee}
                />
                <span className="cpi-toggle-slider" />
                <span className="cpi-toggle-text">Demi-année</span>
              </label>
            </div>
            <div className="cpi-termes-grille">
              {termesAffiches.map((mois) => (
                <button
                  key={mois}
                  type="button"
                  className={
                    "cpi-terme-btn" +
                    (saisie.termeMois === mois ? " cpi-terme-actif" : "")
                  }
                  onClick={() => handleSelectTerme(mois)}
                >
                  {mois}
                </button>
              ))}
            </div>
          </div>

          <div className="cpi-param-bloc">
            <span className="cpi-param-label">Fréquence de paiement</span>
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
        </div>
      </section>

      {/* ═══════ Carte 3 : Résultats ═══════ */}
      <section className="cpi-carte cpi-carte-resultats">
        <div className="cpi-carte-entete cpi-entete-compact">
          <span className="cpi-etape">Résultat</span>
          <h2>Votre paiement</h2>
        </div>

        <div className="cpi-resultats">
          {/* Mode client (compact) : paiement seul, mis en avant.
              Mode détaillé : split horizontal paiement + grille de stats. */}
          <div
            className={
              "cpi-resultats-haut" +
              (afficherStats ? " cpi-resultats-haut-detaille" : " cpi-resultats-haut-compact")
            }
          >
            <div className="cpi-resultat-principal">
              <span className="cpi-resultat-label">
                Paiement {calculs.frequence.label.toLowerCase()}
              </span>
              <span className="cpi-resultat-montant">
                {calculs.valide ? formatMontant(calculs.paiement) : "—"}
              </span>
              <span className="cpi-resultat-mention">
                {calculs.valide
                  ? `${calculs.nbPeriodes} versements`
                  : "Saisissez un montant et un taux"}
              </span>

              {/* Bouton de bascule : intégré au bas de la carte rouge pour
                  rester discret tout en restant accessible au conseiller. */}
              <button
                type="button"
                className="cpi-btn-info"
                onClick={() => setAfficherStats((v) => !v)}
                disabled={!calculs.valide}
                aria-expanded={afficherStats}
                aria-controls="cpi-stats-detail"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {afficherStats ? "Masquer l'information" : "Information complémentaire"}
              </button>
            </div>

            {afficherStats && (
              <div className="cpi-resultat-grille" id="cpi-stats-detail">
                <StatResultat
                  titre="Capital"
                  valeur={formatMontant(calculs.totalAvecTaxes)}
                  mention="Avec taxes QC"
                />
                <StatResultat
                  titre="Intérêts"
                  valeur={calculs.valide ? formatMontant(calculs.interetsTotaux) : "—"}
                  mention="Total payé"
                />
                <StatResultat
                  titre="Coût total"
                  valeur={calculs.valide ? formatMontant(calculs.totalRembourse) : "—"}
                  mention="Capital + intérêts"
                />
                <StatResultat
                  titre="Taux effectif"
                  valeur={calculs.valide ? formatPourcent(calculs.tauxEffectifAnnuel) : "—"}
                  mention="Annuel équivalent"
                />
              </div>
            )}
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
      {afficherAmortissement && calculs.valide && (
        <section className="cpi-carte cpi-carte-amortissement">
          <div className="cpi-carte-entete">
            <h2>Tableau d'amortissement</h2>
            <p className="cpi-soustitre">
              {calculs.nbPeriodes} versements {calculs.frequence.label.toLowerCase()}s — taux périodique
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
                  <td>{formatMontant(calculs.totalRembourse)}</td>
                  <td>{formatMontant(calculs.interetsTotaux)}</td>
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
