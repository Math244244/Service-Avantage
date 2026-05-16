import { useEffect, useMemo, useState } from "react";
import "./TextePersonnaliseMarketplace.css";

const STORAGE_KEY = "outil-avantage.marketplace.v4";
/* Ancienne clé conservée pour migration douce des sauvegardes existantes
   après le renommage Service-Avantage → Outil-Avantage. */
const LEGACY_STORAGE_KEY = "service-avantage.marketplace.v4";

const MODELES = [
  {
    id: "prequalification",
    titre: "Préqualification",
    description: "Réponse axée préqualification de crédit",
    couleur: "vert",
    template: `Bonjour 👋

🌟 **Validez si vous êtes éligible à nos meilleures offres de financement :** faites votre **préqualification** en quelques clics, **sans impact sur votre crédit** et sans engagement — un parcours simple pour découvrir à l'avance ce à quoi vous avez droit.

Oui, le véhicule est disponible chez **{NOM_CONCESSIONNAIRE}** 🚗

Quand seriez-vous disponible pour venir le voir?

Préqualification gratuite ici 👇
{URL}

✅ Sans impact sur votre crédit
✅ Réponse en temps réel 24h / 7 jours
✅ Aucune obligation après la préqualification

📩 Une fois la préqualification terminée, je pourrai prendre votre dossier en main rapidement.`,
  },
  {
    id: "preapprobation",
    titre: "Préapprobation",
    description: "Réponse axée préapprobation rapide en ligne",
    couleur: "vert",
    template: `Bonjour 👋

🌟 **Validez si vous êtes éligible à nos meilleures offres de financement :** obtenez une **préapprobation** rapide en ligne et découvrez à l'avance le paiement qui vous convient — sans surprise, sans pression, et 100 % adapté à votre réalité.

Oui, le véhicule est disponible chez **{NOM_CONCESSIONNAIRE}** 🚗

Quand seriez-vous disponible pour venir le voir?

Préapprobation rapide en ligne ici 👇
{URL}

✅ Rapide et sans frais
✅ Avec approbation
✅ Simple à compléter

📩 Une fois la demande terminée, je pourrai prendre votre dossier en main rapidement.`,
  },
  {
    id: "rappel",
    titre: "Demande de Rappel",
    description: "Réponse axée demande de renseignements et rappel",
    couleur: "vert",
    template: `Bonjour 👋

🌟 **Validez si vous êtes éligible à nos meilleures offres de financement :** faites une **demande de renseignements** et un conseiller vous accompagne pour bâtir la solution qui vous ressemble — à votre rythme, sans engagement, et avec toutes les réponses à vos questions.

Oui, le véhicule est disponible chez **{NOM_CONCESSIONNAIRE}** 🚗

Quand seriez-vous disponible pour venir le voir?

Vous pouvez aussi faire une **demande de renseignements** ici 👇
{URL}

✅ Rapide et sans frais
✅ Simple à compléter
✅ Un conseiller pourra vous rappeler rapidement

📩 Une fois la demande envoyée, je pourrai prendre votre dossier en main rapidement.`,
  },
];

const VALEURS_PAR_DEFAUT = {
  nomConcessionnaire: "Concessionnaire X1234",
  url: "https://tinyurl.com/precal-concessionnaire-x1234",
  nomRepresentant: "",
  emailRepresentant: "",
};

function chargerSauvegarde() {
  try {
    let brut = localStorage.getItem(STORAGE_KEY);
    if (!brut) {
      /* Migration douce : on récupère l'ancienne sauvegarde si présente. */
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

/* Construit le bloc de signature conseiller ajouté en bas du message.
   Objectif psychologie de vente : créer un pont direct client → conseiller
   pour garantir l'attribution du lead. La phrase n'est enrichie QUE si au
   moins un des 2 champs (nom ou email du représentant) est rempli ; sinon
   la phrase d'origine du modèle est conservée telle quelle. */
function construireBlocConseiller(valeurs) {
  const nom = (valeurs.nomRepresentant || "").trim();
  const email = (valeurs.emailRepresentant || "").trim();
  const concession = (valeurs.nomConcessionnaire || "").trim();

  if (!nom && !email) return "";

  const lignes = [];
  if (nom) {
    const suffixe = concession ? ` chez ${concession}` : "";
    lignes.push(`🤝 — ${nom}, votre conseiller attitré${suffixe}`);
  }
  if (email) {
    lignes.push(`✉️ Pour me joindre directement : ${email}`);
  }
  return "\n\n" + lignes.join("\n");
}

function genererMessage(template, valeurs) {
  const base = template
    .replaceAll("{NOM_CONCESSIONNAIRE}", valeurs.nomConcessionnaire || "[Nom du concessionnaire]")
    .replaceAll("{URL}", valeurs.url || "[Votre URL ici]");
  return base + construireBlocConseiller(valeurs);
}

function TextePersonnaliseMarketplace() {
  const [saisie, setSaisie] = useState(() => {
    const sauvegarde = chargerSauvegarde();
    return {
      nomConcessionnaire: sauvegarde?.nomConcessionnaire ?? "",
      url: sauvegarde?.url ?? "",
      nomRepresentant: sauvegarde?.nomRepresentant ?? "",
      emailRepresentant: sauvegarde?.emailRepresentant ?? "",
    };
  });

  const [valeursVisualisees, setValeursVisualisees] = useState(() => {
    const sauvegarde = chargerSauvegarde();
    if (sauvegarde?.visualise) return sauvegarde.visualise;
    return null;
  });

  const [copieId, setCopieId] = useState(null);

  /* Mode édition : id du message actuellement éditable (ou null) */
  const [modeEditionId, setModeEditionId] = useState(null);

  /* Messages personnalisés par l'utilisateur. Clé = id du modèle, valeur = texte modifié.
     Un message édité a priorité sur le message généré automatiquement.

     IMPORTANT : on NE persiste PAS ces modifications.
     À chaque fois que l'utilisateur change de page et revient, on repart
     systématiquement du texte d'origine — comportement explicitement demandé
     pour que personne ne tombe sur les modifications d'un autre conseiller. */
  const [messagesEdites, setMessagesEdites] = useState({});

  /* Messages générés depuis les templates (toujours à jour avec les valeurs visualisées) */
  const messagesGeneres = useMemo(() => {
    const valeurs = valeursVisualisees ?? VALEURS_PAR_DEFAUT;
    return MODELES.map((m) => ({
      ...m,
      contenu: genererMessage(m.template, valeurs),
    }));
  }, [valeursVisualisees]);

  /* Messages affichés : édité si présent, sinon généré */
  const messages = useMemo(() => {
    return messagesGeneres.map((m) => ({
      ...m,
      contenu: messagesEdites[m.id] ?? m.contenu,
      estEdite: Object.prototype.hasOwnProperty.call(messagesEdites, m.id),
    }));
  }, [messagesGeneres, messagesEdites]);

  /* On persiste les valeurs de saisie (nom, URL, conseiller) + les valeurs
     visualisées, MAIS PAS messagesEdites — voir explication ci-dessus. */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          nomConcessionnaire: saisie.nomConcessionnaire,
          url: saisie.url,
          nomRepresentant: saisie.nomRepresentant,
          emailRepresentant: saisie.emailRepresentant,
          visualise: valeursVisualisees,
        })
      );
    } catch (_e) {
      /* stockage non disponible */
    }
  }, [saisie, valeursVisualisees]);

  const handleChangeChamp = (champ) => (e) => {
    setSaisie((prev) => ({ ...prev, [champ]: e.target.value }));
  };

  const handleVisualiser = (e) => {
    e.preventDefault();
    setValeursVisualisees({
      nomConcessionnaire: saisie.nomConcessionnaire.trim(),
      url: saisie.url.trim(),
      nomRepresentant: saisie.nomRepresentant.trim(),
      emailRepresentant: saisie.emailRepresentant.trim(),
    });
    /* Régénérer écrase les modifications personnalisées pour partir
       sur une base propre avec les nouvelles valeurs. */
    setMessagesEdites({});
    setModeEditionId(null);
  };

  const handleReinitialiser = () => {
    setSaisie({
      nomConcessionnaire: "",
      url: "",
      nomRepresentant: "",
      emailRepresentant: "",
    });
    setValeursVisualisees(null);
    setMessagesEdites({});
    setModeEditionId(null);
  };

  /* Bascule le mode édition pour un message donné.
     Si on clique sur "Modifier" alors qu'on est déjà en édition → sort du mode. */
  const handleToggleEdition = (id) => {
    setModeEditionId((prev) => (prev === id ? null : id));
  };

  /* Met à jour le contenu d'un message édité. */
  const handleChangeMessageEdite = (id, contenu) => {
    setMessagesEdites((prev) => ({ ...prev, [id]: contenu }));
  };

  /* Annule la personnalisation d'un message (revient à la version générée). */
  const handleAnnulerEdition = (id) => {
    setMessagesEdites((prev) => {
      const suite = { ...prev };
      delete suite[id];
      return suite;
    });
    if (modeEditionId === id) setModeEditionId(null);
  };

  const handleCopier = async (id, contenu) => {
    try {
      await navigator.clipboard.writeText(contenu);
      setCopieId(id);
      setTimeout(() => setCopieId(null), 2000);
    } catch (_e) {
      const zone = document.createElement("textarea");
      zone.value = contenu;
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      try {
        document.execCommand("copy");
        setCopieId(id);
        setTimeout(() => setCopieId(null), 2000);
      } catch (_err) {
        /* échec silencieux */
      }
      document.body.removeChild(zone);
    }
  };

  const aDesValeursVisualisees = valeursVisualisees !== null;
  const peutVisualiser =
    saisie.nomConcessionnaire.trim().length > 0 && saisie.url.trim().length > 0;
  /* Le bouton Réinitialiser est désactivé UNIQUEMENT quand la page est
     déjà vierge (rien saisi, rien visualisé, aucune édition en cours). */
  const aQuelqueChoseAReinitialiser =
    saisie.nomConcessionnaire.length > 0 ||
    saisie.url.length > 0 ||
    saisie.nomRepresentant.length > 0 ||
    saisie.emailRepresentant.length > 0 ||
    aDesValeursVisualisees ||
    Object.keys(messagesEdites).length > 0 ||
    modeEditionId !== null;

  return (
    <div className="tpm-page">
      <section className="tpm-intro">
        <div className="tpm-intro-icone">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l1-5h16l1 5" />
            <path d="M5 9v11a1 1 0 001 1h12a1 1 0 001-1V9" />
            <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        </div>
        <div className="tpm-intro-texte">
          <h1>Créez votre message de réponse Marketplace</h1>
          <p>
            Remplissez les champs, cliquez <strong>Visualiser</strong>, puis copiez en un clic le message
            (préqualification, préapprobation ou demande de rappel). Ajoutez votre nom et courriel pour vous attribuer le lead.
          </p>
        </div>
      </section>

      <section className="tpm-config">
        <div className="tpm-config-entete">
          <span className="tpm-step">Étape 1</span>
          <h2>Configurez votre message</h2>
        </div>

        <form className="tpm-form" onSubmit={handleVisualiser}>
          <div className="tpm-champ">
            <label htmlFor="tpm-nom">Nom du concessionnaire</label>
            <input
              id="tpm-nom"
              type="text"
              placeholder="Ex. Concessionnaire X1234"
              value={saisie.nomConcessionnaire}
              onChange={handleChangeChamp("nomConcessionnaire")}
              autoComplete="organization"
            />
          </div>

          <div className="tpm-champ">
            <label htmlFor="tpm-url">
              URL de votre financement ou préqualification
            </label>
            <input
              id="tpm-url"
              type="url"
              placeholder="https://tinyurl.com/votre-lien"
              value={saisie.url}
              onChange={handleChangeChamp("url")}
              autoComplete="url"
              inputMode="url"
            />
          </div>

          <div className="tpm-champ">
            <label htmlFor="tpm-nom-rep">
              Nom du représentant <span className="tpm-optionnel">(optionnel)</span>
            </label>
            <input
              id="tpm-nom-rep"
              type="text"
              placeholder="Ex. Jean Tremblay"
              value={saisie.nomRepresentant}
              onChange={handleChangeChamp("nomRepresentant")}
              autoComplete="name"
            />
          </div>

          <div className="tpm-champ">
            <label htmlFor="tpm-email-rep">
              Courriel du représentant <span className="tpm-optionnel">(optionnel)</span>
            </label>
            <input
              id="tpm-email-rep"
              type="email"
              placeholder="prenom.nom@concession.com"
              value={saisie.emailRepresentant}
              onChange={handleChangeChamp("emailRepresentant")}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="tpm-form-actions">
            <button
              type="button"
              className="tpm-btn tpm-btn-ghost"
              onClick={handleReinitialiser}
              disabled={!aQuelqueChoseAReinitialiser}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              Réinitialiser
            </button>
            <button
              type="submit"
              className="tpm-btn tpm-btn-primary"
              disabled={!peutVisualiser}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Visualiser
            </button>
          </div>
        </form>
      </section>

      <section className="tpm-messages">
        <div className="tpm-messages-entete">
          <span className="tpm-step">Étape 2</span>
          <h2>Choisissez et copiez votre message</h2>
          {!aDesValeursVisualisees && (
            <span className="tpm-apercu-badge">Aperçu avec valeurs par défaut</span>
          )}
        </div>

        <div className="tpm-grille">
          {messages.map((m, idx) => {
            const enEdition = modeEditionId === m.id;
            return (
              <article key={m.id} className={"tpm-carte" + (enEdition ? " tpm-carte-edition" : "")}>
                <header className="tpm-carte-entete">
                  <div className="tpm-carte-numero">{idx + 1}</div>
                  <div className="tpm-carte-info">
                    <h3>{m.titre}</h3>
                    <span>{m.description}</span>
                  </div>
                  {m.estEdite && !enEdition && (
                    <button
                      type="button"
                      className="tpm-badge-edite"
                      onClick={() => handleAnnulerEdition(m.id)}
                      title="Cliquez pour revenir au texte original"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                      Personnalisé
                    </button>
                  )}
                </header>

                {enEdition ? (
                  <textarea
                    className="tpm-message tpm-message-edit"
                    value={m.contenu}
                    onChange={(e) => handleChangeMessageEdite(m.id, e.target.value)}
                    spellCheck="true"
                    autoFocus
                  />
                ) : (
                  <pre className="tpm-message">{m.contenu}</pre>
                )}

                <div className="tpm-carte-actions">
                  <button
                    type="button"
                    className={"tpm-btn-modifier" + (enEdition ? " tpm-btn-modifier-actif" : "")}
                    onClick={() => handleToggleEdition(m.id)}
                  >
                    {enEdition ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Terminer
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                        Modifier
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className={"tpm-btn-action" + (copieId === m.id ? " tpm-btn-action-copie" : "")}
                    onClick={() => handleCopier(m.id, m.contenu)}
                  >
                    {copieId === m.id ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copié !
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Copier
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="tpm-astuce">
        <div className="tpm-astuce-entete">
          <div className="tpm-astuce-icone">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className="tpm-astuce-titre-wrap">
            <span className="tpm-astuce-badge">Astuce pratique</span>
            <h2 className="tpm-astuce-titre">Lien trop long ? Raccourcissez-le gratuitement</h2>
            <p className="tpm-astuce-soustitre">
              Un lien court au nom de votre concession = plus professionnel, plus de clics.
            </p>
          </div>
        </div>

        <div className="tpm-astuce-etapes">
          <div className="tpm-astuce-etape">
            <div className="tpm-astuce-numero">1</div>
            <div className="tpm-astuce-texte">
              <strong>Allez sur <a href="https://tinyurl.com/" target="_blank" rel="noopener noreferrer" className="tpm-astuce-lien-fort">tinyurl.com</a></strong>
              <span>Collez votre long URL dans le champ <em>« Long URL »</em>.</span>
            </div>
          </div>

          <div className="tpm-astuce-fleche" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          <div className="tpm-astuce-etape">
            <div className="tpm-astuce-numero">2</div>
            <div className="tpm-astuce-texte">
              <strong>Personnalisez l'alias</strong>
              <span>
                Dans le champ <em>« Alias (optional) »</em>, écrivez un nom
                professionnel — idéalement <code>prequal-</code> suivi du nom de
                votre concession.
              </span>
            </div>
          </div>

          <div className="tpm-astuce-fleche" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          <div className="tpm-astuce-etape">
            <div className="tpm-astuce-numero">3</div>
            <div className="tpm-astuce-texte">
              <strong>Cliquez sur « Shorten Link »</strong>
              <span>Copiez le lien raccourci, puis collez-le dans le champ
              <em>« URL »</em> ci-dessus.</span>
            </div>
          </div>
        </div>

        <div className="tpm-astuce-exemple">
          <span className="tpm-astuce-exemple-label">Exemple de lien professionnel obtenu</span>
          <code className="tpm-astuce-exemple-url">https://tinyurl.com/prequal-nomconcession</code>
        </div>

        <div className="tpm-astuce-actions">
          <a
            href="https://tinyurl.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="tpm-astuce-cta"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Ouvrir tinyurl.com
          </a>
          <span className="tpm-astuce-mention">
            Aucune inscription requise — gratuit et instantané
          </span>
        </div>
      </section>
    </div>
  );
}

export default TextePersonnaliseMarketplace;
