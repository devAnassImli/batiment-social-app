import { useState, useEffect } from 'react';
import { verifierMatricule } from '../services/api';
import Header from '../components/Header';
import FormulaireSignalement from './FormulaireSignalement';
import './TotemLogin.css';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Ecoute clavier globale : pave tactile ET futur lecteur badge (emulation clavier)
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

  return (
    <AnimatePresence mode="wait">
      {vue === 'signalement' && (
        <motion.div
          key="signalement"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <FormulaireSignalement
            employe={employe}
            onAnnuler={() => setVue('accueil')}
            onEnvoye={() => setVue('confirmation')}
          />
        </motion.div>
      )}

      {vue === 'confirmation' && (
        <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <div className="totem-page">
            <Header utilisateur={employe} />
            <main className="totem-accueil">
              <div className="totem-confirmation">
                <span className="totem-confirmation-icone">✅</span>
                <h2>Signalement envoyé</h2>
                <p>Merci {employe.Nome}, votre signalement a bien été transmis.</p>
              </div>
              <button className="totem-action-secondaire" onClick={reset}>Terminer</button>
            </main>
          </div>
        </motion.div>
      )}

      {vue === 'accueil' && (
        <motion.div key="accueil" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          <div className="totem-page">
            <Header utilisateur={employe} />
            <main className="totem-accueil">
              <button className="carte-action-principale" onClick={() => setVue('signalement')}>
                <div className="carte-action-icone">⚠️</div>
                <div className="carte-action-texte">
                  <h2>Signaler un problème</h2>
                  <p>Décrivez-le en quelques secondes</p>
                </div>
                <div className="carte-action-fleche">→</div>
              </button>
              <button className="totem-action-secondaire" onClick={reset}>Se déconnecter</button>
            </main>
          </div>
        </motion.div>
      )}

      {vue === 'connexion' && (
        <motion.div key="connexion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.3 }}>
          <div className="totem-page">
            <Header utilisateur={null} />
            <main className="totem-connexion">
              <div className="totem-connexion-layout">
                <div className="totem-carte">
                  <p className="totem-bienvenue">Bienvenue</p>
                  <input className="totem-affichage" value={matricule} readOnly placeholder="Matricule" />
                  <div className="totem-pave">
                    {TOUCHES.map((touche) => (
                      <button key={touche} className="totem-touche" onClick={() => ajouterChiffre(touche)}>{touche}</button>
                    ))}
                  </div>
                  <button className="totem-bouton-valider" onClick={valider} disabled={chargement}>
                    {chargement ? 'Vérification...' : 'VALIDER'}
                  </button>
                  <button className="totem-bouton-effacer" onClick={reset}>Effacer</button>
                  {erreur && <p className="totem-erreur">{erreur}</p>}
                </div>
                <div className="totem-raccourcis">
                  <div className="totem-raccourci"><span className="totem-raccourci-icone">🚨</span><span>Urgence sécurité</span></div>
                  <div className="totem-raccourci"><span className="totem-raccourci-icone">☎️</span><span>Numéros utiles</span></div>
                </div>
              </div>
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}