import { useState, useEffect } from 'react';
import './Header.css';

export default function Header({ utilisateur }) {
  const [heure, setHeure] = useState(new Date());

  useEffect(() => {
    const intervalle = setInterval(() => setHeure(new Date()), 1000);
    return () => clearInterval(intervalle);
  }, []);

  const dateFormatee = heure.toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const heureFormatee = heure.toLocaleTimeString('fr-FR');

  return (
    <header className="app-header">
      <div className="app-header-logos">
        <span className="logo-riva">RIVA</span>
        <span className="logo-sam">SAM MONTEREAU</span>
      </div>
      <div className="app-header-titre">
        <h1>BÂTIMENT SOCIAL</h1>
        <span className="app-header-soustitre">Signalement des problèmes</span>
      </div>
      <div className="app-header-droite">
        {utilisateur && (
          <span className="app-header-utilisateur">
            {utilisateur.Nome} {utilisateur.Cognome}
          </span>
        )}
        <span className="app-header-date">{dateFormatee}</span>
        <span className="app-header-heure">{heureFormatee}</span>
      </div>
    </header>
  );
}