import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const IconAccueil = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V9.5z" />
  </svg>
);

const IconCalcul = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="10" y2="11" />
    <line x1="13" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="10" y2="15" />
    <line x1="13" y1="15" x2="16" y2="15" />
    <line x1="8" y1="19" x2="10" y2="19" />
    <line x1="13" y1="19" x2="16" y2="19" />
  </svg>
);

const IconFormulaire = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="14" y2="17" />
  </svg>
);

const IconTransfert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);

const IconMarketplace = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1-5h16l1 5" />
    <path d="M5 9v11a1 1 0 001 1h12a1 1 0 001-1V9" />
    <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);

const IconCalcPret = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9h6M9 12h6M9 15h4" />
    <path d="M16 6l-4 4M14 18l2-2" />
  </svg>
);

const menuItems = [
  { to: "/", label: "Accueil", icon: <IconAccueil />, end: true },
  { to: "/calculateur-vitrine-voiture", label: "Calculateur Vitrine Voiture", icon: <IconCalcul /> },
  { to: "/calculateur-pret-interet", label: "Calculateur Prêt et Intérêt", icon: <IconCalcPret /> },
  { to: "/formulaire-accueil-client", label: "Formulaire Accueil Client", icon: <IconFormulaire /> },
  { to: "/formulaire-transfert-fi", label: "Formulaire Transfert F&I", icon: <IconTransfert /> },
  { to: "/texte-personnalise-marketplace", label: "Texte personnalisé Marketplace", icon: <IconMarketplace /> },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">OA</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">Outil-Avantage</span>
          <span className="sidebar-brand-subtitle">Centre d'outils</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">NAVIGATION</div>
        <ul>
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  "sidebar-link" + (isActive ? " sidebar-link-active" : "")
                }
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="sidebar-status-dot" />
          En ligne
        </div>
        <div className="sidebar-version">v0.1.0</div>
      </div>
    </aside>
  );
}

export default Sidebar;
