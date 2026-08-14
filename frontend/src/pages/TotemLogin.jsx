import { useState, useEffect } from 'react';
import { verifierMatricule } from '../services/api';
import Header from '../components/Header';
import FormulaireSignalement from './FormulaireSignalement';
import './TotemLogin.css';

const TOUCHES = ['7','8','9','4','5','6','1','2','3','0'];
const LONGUEUR_MAX = 5;

export default function TotemLogin() {
  const [matricule, setMatricule] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [employe, setEmploye] = useState(null);
  const [vue, setVue] = useState('connexion'); // connexion | accueil | signalement | confirmation

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
    setVue('connexion');
  };

  const valider = async () => {
    if (matricule.length === 0 || chargement) return;
    setChargement(true);
    setErreur('');
    try {
      const { ok, donnees } = await verifierMatricule(matricule);
      if (ok && donnees.trouve) {
        setEmploye(donnees.employe);
        setVue('accueil');
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
      if (vue !== 'connexion') return;
      if (e.key >= '0' && e.key <= '9') ajouterChiffre(e.key);
      else if (e.key === 'Enter') valider();
      else if (e.key === 'Backspace') setMatricule((prev) => prev.slice(0, -1));
    };
    window.addEventListener('keydown', gererTouche);
    return () => window.removeEventListener('keydown', gererTouche);
  });

  if (vue === 'signalement') {
    return (
      <FormulaireSignalement
        employe={employe}
        onAnnuler={() => setVue('accueil')}
        onEnvoye={() => setVue('confirmation')}
      />
    );
  }

  if (vue === 'confirmation') {
    return (
      <div className="totem-page">
        <Header utilisateur={employe} />
        <main className="totem-accueil">
          <div className="totem-confirmation">
            <span className="totem-confirmation-icone">✅</span>
            <h2>Signalement envoyé</h2>
            <p>Merci {employe.Nome}, votre signalement a bien été transmis.</p>
          </div>
          <button className="totem-action-secondaire" onClick={reset}>
            Terminer
          </button>
        </main>
      </div>
    );
  }

  if (vue === 'accueil') {
    return (
      <div className="totem-page">
        <Header utilisateur={employe} />
        <main className="totem-accueil">
          <button className="totem-action-principale" onClick={() => setVue('signalement')}>
            <span className="totem-action-icone">⚠️</span>
            <span>Signaler un problème</span>
          </button>
          <button className="totem-action-secondaire" onClick={reset}>
            Se déconnecter
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="totem-page">
      <Header utilisateur={null} />
      <main className="totem-connexion">
        <div className="totem-carte">
          <div className="totem-affichage-ligne">
            <input className="totem-affichage" value={matricule} readOnly placeholder="Matricule" />
            <button className="totem-bouton-reset" onClick={reset}>EFFACER</button>
          </div>
          <div className="totem-pave">
            {TOUCHES.map((touche) => (
              <button key={touche} className="totem-touche" onClick={() => ajouterChiffre(touche)}>
                {touche}
              </button>
            ))}
          </div>
          <button className="totem-bouton-valider" onClick={valider} disabled={chargement}>
            {chargement ? 'Vérification...' : 'VALIDER'}
          </button>
          {erreur && <p className="totem-erreur">{erreur}</p>}
        </div>
      </main>
    </div>
  );
}