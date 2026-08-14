import { useState, useEffect } from 'react';
import { verifierMatricule } from '../services/api';
import './TotemLogin.css';

const TOUCHES = ['7','8','9','4','5','6','1','2','3','0'];
const LONGUEUR_MAX = 5; // correspond au nchar(5) de la procédure stockée

export default function TotemLogin() {
  const [matricule, setMatricule] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [employe, setEmploye] = useState(null);

  const ajouterChiffre = (chiffre) => {
    if (matricule.length < LONGUEUR_MAX) {
      setMatricule((prev) => prev + chiffre);
      setErreur('');
    }
  };

  const reset = () => {
    setMatricule('');
    setErreur('');
    setEmploye(null);
  };

  const valider = async () => {
    if (matricule.length === 0 || chargement) return;
    setChargement(true);
    setErreur('');

    try {
      const { ok, donnees } = await verifierMatricule(matricule);
      if (ok && donnees.trouve) {
        setEmploye(donnees.employe);
      } else {
        setErreur('Matricule non reconnu');
        setMatricule('');
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    const gererTouche = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        ajouterChiffre(e.key);
      } else if (e.key === 'Enter') {
        valider();
      } else if (e.key === 'Backspace') {
        setMatricule((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', gererTouche);
    return () => window.removeEventListener('keydown', gererTouche);
  });

  // Écran affiché une fois le salarié reconnu
  if (employe) {
    return (
      <div className="totem-fond">
        <div className="totem-entete">
          <div className="totem-logos">
            <span className="totem-logo-riva">RIVA</span>
            <span className="totem-logo-sam">SAM MONTEREAU</span>
          </div>
          <h1>BÂTIMENT SOCIAL</h1>
          <span className="totem-version">v0.1</span>
        </div>
        <div className="totem-carte">
          <p style={{ fontSize: '1.5rem', textAlign: 'center', margin: '20px 0' }}>
            Bonjour {employe.Nome} {employe.Cognome} 👋
          </p>
          <button className="totem-bouton-valider" onClick={reset}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="totem-fond">
      <div className="totem-entete">
        <div className="totem-logos">
          <span className="totem-logo-riva">RIVA</span>
          <span className="totem-logo-sam">SAM MONTEREAU</span>
        </div>
        <h1>BÂTIMENT SOCIAL</h1>
        <span className="totem-version">v0.1</span>
      </div>

      <div className="totem-carte">
        <div className="totem-affichage-ligne">
          <input
            className="totem-affichage"
            value={matricule}
            readOnly
            placeholder="Matricule"
          />
          <button className="totem-bouton-reset" onClick={reset}>
            RESET
          </button>
        </div>

        <div className="totem-pave">
          {TOUCHES.map((touche) => (
            <button
              key={touche}
              className="totem-touche"
              onClick={() => ajouterChiffre(touche)}
            >
              {touche}
            </button>
          ))}
        </div>

        <button className="totem-bouton-valider" onClick={valider} disabled={chargement}>
          {chargement ? 'Vérification...' : 'VALIDER'}
        </button>

        {erreur && <p className="totem-erreur">{erreur}</p>}
      </div>
    </div>
  );
}