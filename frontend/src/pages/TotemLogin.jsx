import { useState, useEffect } from 'react';
import './TotemLogin.css';

const TOUCHES = ['7','8','9','4','5','6','1','2','3','0'];
const LONGUEUR_MAX = 10; // correspond au nchar(10) de la procédure stockée

export default function TotemLogin() {
  const [matricule, setMatricule] = useState('');
  const [erreur, setErreur] = useState('');

  const ajouterChiffre = (chiffre) => {
    if (matricule.length < LONGUEUR_MAX) {
      setMatricule((prev) => prev + chiffre);
      setErreur('');
    }
  };

  const reset = () => {
    setMatricule('');
    setErreur('');
  };

  const valider = () => {
    if (matricule.length === 0) return;
    // Pour l'instant on affiche juste ce qui a été saisi.
    // Étape suivante : appel API vers le backend (procédure stockée)
    console.log('Matricule saisi :', matricule);
  };

  // Écoute clavier globale : couvre le pavé tactile ET un futur lecteur badge
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

        <button className="totem-bouton-valider" onClick={valider}>
          VALIDER
        </button>

        {erreur && <p className="totem-erreur">{erreur}</p>}
      </div>
    </div>
  );
}