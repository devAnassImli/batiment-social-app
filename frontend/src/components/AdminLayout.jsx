import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logoRiva from '../assets/logo-riva.png';
import logoSam from '../assets/logo-sam.png';
import './AdminLayout.css';

export default function AdminLayout({ titrePage, children }) {
  const navigate = useNavigate();
  const [heure, setHeure] = useState(new Date());
  const [menuOuvert, setMenuOuvert] = useState(null);

  const utilisateur = JSON.parse(
    sessionStorage.getItem('admin_utilisateur') || '{}'
  );

  useEffect(() => {
    const i = setInterval(() => setHeure(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const seDeconnecter = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_utilisateur');
    navigate('/admin');
  };

  return (
    <div className="al3-shell">
      <header className="al3-header">
        <div className="al3-header-gauche">
          {heure.toLocaleDateString('fr-FR')} {heure.toLocaleTimeString('fr-FR')}
        </div>

        <div className="al3-header-centre">
          <span className="al3-header-sous">SAM MONTEREAU</span>
          <h1>BÂTIMENT SOCIAL</h1>
        </div>

        <div className="al3-header-droite">
          <div className="al3-header-user">
            <span className="al3-user-nom">{utilisateur.nomComplet}</span>
            <span className="al3-user-badge">ADMINISTRATEUR</span>
            <span className="al3-user-email">{utilisateur.email}</span>
          </div>

          <button
            className="al3-deconnexion"
            onClick={seDeconnecter}
          >
            🔒 Déconnexion
          </button>
        </div>
      </header>

      <nav
        className="al3-nav"
        onMouseLeave={() => setMenuOuvert(null)}
      >
        <div
          className="al3-nav-item"
          onMouseEnter={() => setMenuOuvert('param')}
        >
          PARAMÉTRISATION

          {menuOuvert === 'param' && (
            <div className="al3-sous-menu">
              <NavLink to="/admin/referentiels">
                Zones / catégories / intervenants
              </NavLink>
            </div>
          )}
        </div>

        <div
          className="al3-nav-item"
          onMouseEnter={() => setMenuOuvert('demandes')}
        >
          DEMANDES

          {menuOuvert === 'demandes' && (
            <div className="al3-sous-menu">
              <NavLink to="/admin/dashboard">
                Suivi global
              </NavLink>

              <NavLink to="/admin/nouvelle-demande">
                Nouvelle demande
              </NavLink>
            </div>
          )}
        </div>

        <div
          className="al3-nav-item"
          onMouseEnter={() => setMenuOuvert('historique')}
        >
          HISTORIQUE

          {menuOuvert === 'historique' && (
            <div className="al3-sous-menu">
              <NavLink to="/admin/historique">
                Travaux réalisés
              </NavLink>
            </div>
          )}
        </div>

        <div
          className="al3-nav-item"
          onMouseEnter={() => setMenuOuvert('stats')}
        >
          STATISTIQUES

          {menuOuvert === 'stats' && (
            <div className="al3-sous-menu">
              <NavLink to="/admin/statistiques">
                Tableau de bord
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      {titrePage && (
        <div className="al3-banniere-titre">
          {titrePage}
        </div>
      )}

      <main className="al3-contenu">
        {children}
      </main>

      <footer className="al3-pied">
        Mentions légales et protection des données (RGPD)
      </footer>
    </div>
  );
}
``