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

    /* Paiements pour CHAQUE terme, à la fréquence active.
       C'est le cœur du nouveau visuel : 8 cartes rouges montrant
       le paiement réel pour 12, 24, 36, 48, 60, 72, 84, 96 mois. */
    const paiementsParTerme = TERMES.map((termeMois) => {
      const nbPeriodes = Math.round((termeMois * periodesAn) / 12);
      const paiement = calculerPaiement(totalAvecTaxes, tauxAnnuel, nbPeriodes, periodesAn);
      const totalRembourse = paiement * nbPeriodes;
      const interetsTotaux = Math.max(0, totalRembourse - totalAvecTaxes);
      return {
        termeMois,
        nbPeriodes,
        paiement,
        totalRembourse,
        interetsTotaux,
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
    setAfficherStats(false);
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

        <div className="cpi-resultats">
          {/* Grille 4×2 de cartes rouges : une par terme.
              Le client compare visuellement le paiement pour 12 → 96 mois
              à la fréquence active. La carte sélectionnée est mise en
              avant (contour blanc) et alimente le tableau d'amortissement. */}
          <div className="cpi-termes-cartes" role="radiogroup" aria-label="Choisir un terme">
            {calculs.paiementsParTerme.map((p) => {
              const actif = saisie.termeSelectionne === p.termeMois;
              return (
                <button
                  key={p.termeMois}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  className={"cpi-terme-card" + (actif ? " cpi-terme-card-active" : "")}
                  onClick={() => handleSelectTerme(p.termeMois)}
                  disabled={!calculs.valide}
                >
                  <span className="cpi-terme-card-label">{p.termeMois} mois</span>
                  <span className="cpi-terme-card-montant">
                    {calculs.valide ? formatMontant(p.paiement) : "—"}
                  </span>
                  <span className="cpi-terme-card-freq">
                    / {calculs.frequence.id === "mensuel" ? "mois" : calculs.frequence.id === "bihebdo" ? "2 sem." : "sem."}
                  </span>
                  <span className="cpi-terme-card-meta">
                    {calculs.valide ? `${p.nbPeriodes} versements` : "—"}
                  </span>
                  <span className="cpi-terme-card-taxes">✓ Taxes incl.</span>
                </button>
              );
            })}
          </div>

          {/* Mini résumé du terme sélectionné — toujours visible pour le conseiller,
              compact pour ne pas voler la vedette aux cartes. */}
          {calculs.valide && calculs.termeActif && (
            <div className="cpi-resume-terme">
              <button
                type="button"
                className="cpi-btn-info cpi-btn-info-inline"
                onClick={() => setAfficherStats((v) => !v)}
                aria-expanded={afficherStats}
                aria-controls="cpi-stats-detail"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                {afficherStats ? "Masquer le détail" : "Détail du terme sélectionné"}
              </button>
              <span className="cpi-resume-cle">
                Terme actif : <strong>{calculs.termeActif.termeMois} mois</strong>
                {" "}· {calculs.termeActif.nbPeriodes} versements
              </span>
            </div>
          )}

          {afficherStats && calculs.valide && calculs.termeActif && (
            <div className="cpi-resultat-grille" id="cpi-stats-detail">
              <StatResultat
                titre="Capital"
                valeur={formatMontant(calculs.totalAvecTaxes)}
                mention="Avec taxes QC"
              />
              <StatResultat
                titre="Intérêts"
                valeur={formatMontant(calculs.termeActif.interetsTotaux)}
                mention={`Sur ${calculs.termeActif.termeMois} mois`}
              />
              <StatResultat
                titre="Coût total"
                valeur={formatMontant(calculs.termeActif.totalRembourse)}
                mention="Capital + intérêts"
              />
              <StatResultat
                titre="Taux effectif"
                valeur={formatPourcent(calculs.tauxEffectifAnnuel)}
                mention="Annuel équivalent"
              />
            </div>
          )}

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
