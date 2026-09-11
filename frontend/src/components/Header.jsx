import { useState, useEffect } from 'react';
import logoRiva from '../assets/logo-riva.png';
import logoSam from '../assets/logo-sam.png';
import './Header.css';
import iconeTimer from '../assets/icone-timer.png';

export default function Header({ utilisateur, onDeconnexion, secondesRestantes }) {
  const [heure, setHeure] = useState(new Date());

  useEffect(() => {
    const intervalle = setInterval(() => setHeure(new Date()), 1000);
    return () => clearInterval(intervalle);
  }, []);

  const dateFormatee = heure.toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const heureFormatee = heure.toLocaleTimeString('fr-FR');
  const alerte = secondesRestantes != null && secondesRestantes <= 20;

  return (
    <header className="app-header">
               <div className="app-header-gauche">
        <div className="app-header-ligne-date">
          <span className="app-header-date">{dateFormatee}</span>
          <span className="app-header-heure">{heureFormatee}</span>
          {secondesRestantes != null && (
            <div className={`app-header-timer ${alerte ? 'app-header-timer-alerte' : ''}`}>
              <img src={iconeTimer} alt="" className="app-header-timer-icone" />
              <span>{secondesRestantes}s</span>
            </div>
          )}
        </div>
      </div>
      <div className="app-header-centre">
        <img src={logoRiva} alt="RIVA" className="logo-img" />
        <img src={logoSam} alt="SAM Montereau" className="logo-img logo-sam-img" />
        <div className="app-header-titre">
          <h1>BÂTIMENT SOCIAL</h1>
          <span className="app-header-soustitre">Signalement des problèmes</span>
        </div>
      </div>

      <div className="app-header-droite">
        {utilisateur && (
          <>
            <span className="app-header-utilisateur">{utilisateur.Nome} {utilisateur.Cognome}</span>
            <button className="app-header-deconnexion" onClick={onDeconnexion}>Déconnexion</button>
          </>
        )}
      </div>
    </header>
  );
}