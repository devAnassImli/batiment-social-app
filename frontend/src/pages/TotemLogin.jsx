import { useState, useEffect } from 'react';
import { verifierMatricule } from '../services/api';
import Header from '../components/Header';
import FormulaireSignalement from './FormulaireSignalement';
import logoRiva from '../assets/logo-riva.png';
import logoSam from '../assets/logo-sam.png';
import planSite from '../assets/plan-site.jpg';
import numerosUtiles from '../assets/numeros-utiles.jpg';
import './TotemLogin.css';
import { motion, AnimatePresence } from 'framer-motion';

const LONGUEUR_MAX = 5;

export default function TotemLogin() {
  const [matricule, setMatricule] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [employe, setEmploye] = useState(null);
  const [vue, setVue] = useState('connexion'); // connexion | accueil | signalement | confirmation
  const [imageAffichee, setImageAffichee] = useState(null); // null | 'plan' | 'numeros'

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

  const employeConnecte = vue !== 'connexion';

  return (
    <div className={employeConnecte ? 'totem-page' : 'totem-page-connexion'}>
      {employeConnecte && <Header utilisateur={employe} onDeconnexion={reset} />}
      {!employeConnecte && (
        <div className="totem-logos-connexion">
          <img src={logoRiva} alt="RIVA" className="logo-img" />
          <img src={logoSam} alt="SAM Montereau" className="logo-img logo-sam-img" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {vue === 'signalement' && (
          <motion.div key="signalement" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <FormulaireSignalement
              employe={employe}
              onAnnuler={() => setVue('accueil')}
              onEnvoye={() => setVue('confirmation')}
            />
          </motion.div>
        )}

        {vue === 'confirmation' && (
          <motion.div key="confirmation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <main className="totem-accueil">
              <div className="totem-confirmation">
                <span className="totem-confirmation-icone">✅</span>
                <h2>Signalement envoyé</h2>
                <p>Merci {employe.Nome}, votre signalement a bien été transmis.</p>
              </div>
            </main>
          </motion.div>
        )}

        {vue === 'accueil' && (
          <motion.div key="accueil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <main className="totem-accueil">
              <button className="carte-action-principale" onClick={() => setVue('signalement')}>
                <div className="carte-action-icone">⚠️</div>
                <div className="carte-action-texte">
                  <h2>Signaler un problème</h2>
                  <p>Décrivez-le en quelques secondes</p>
                </div>
                <div className="carte-action-fleche">→</div>
              </button>
            </main>
          </motion.div>
        )}

        {vue === 'connexion' && (
          <motion.div key="connexion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <main className="totem-connexion">
              <div className="totem-carte">
                <p className="totem-bienvenue">Bienvenue — saisissez votre matricule</p>
                <input className="totem-affichage" value={matricule} readOnly placeholder="•••••" />
                <div className="totem-pave-3x3">
                  {['1','2','3','4','5','6','7','8','9'].map((touche) => (
                    <button key={touche} className="totem-touche" onClick={() => ajouterChiffre(touche)}>{touche}</button>
                  ))}
                </div>
                <div className="totem-barre-basse">
                  <button className="totem-raccourci-bas" onClick={() => setImageAffichee('plan')}>
                    <span className="totem-raccourci-bas-icone">🗺️</span>
                    Plan du site
                  </button>
                  <button className="totem-touche totem-touche-zero" onClick={() => ajouterChiffre('0')}>0</button>
                  <button className="totem-raccourci-bas" onClick={() => setImageAffichee('numeros')}>
                    <span className="totem-raccourci-bas-icone">☎️</span>
                    Numéros utiles
                  </button>
                </div>
                <button className="totem-bouton-valider" onClick={valider} disabled={chargement}>
                  {chargement ? 'Vérification...' : 'VALIDER'}
                </button>
                <button className="totem-bouton-effacer" onClick={reset}>Effacer</button>
                {erreur && <p className="totem-erreur">{erreur}</p>}
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {imageAffichee && (
        <div className="totem-modale-fond" onClick={() => setImageAffichee(null)}>
          <div className="totem-modale-contenu" onClick={(e) => e.stopPropagation()}>
            <button className="totem-modale-fermer" onClick={() => setImageAffichee(null)}>✕</button>
            <img
              src={imageAffichee === 'plan' ? planSite : numerosUtiles}
              alt={imageAffichee === 'plan' ? 'Plan du site' : 'Numéros utiles'}
            />
          </div>
        </div>
      )}
    </div>
  );
}