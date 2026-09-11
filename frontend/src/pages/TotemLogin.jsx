import { useState, useEffect } from 'react';
import { verifierMatricule } from '../services/api';
import Header from '../components/Header';
import FormulaireSignalement from './FormulaireSignalement';
import MesSignalements from './MesSignalements';
import logoRiva from '../assets/logo-riva.png';
import logoSam from '../assets/logo-sam.png';
import iconePlan from '../assets/icone-plan.png';
import iconeNumeros from '../assets/icone-numeros.png';
import planSite from '../assets/plan-site.jpg';
import numerosUtiles from '../assets/numeros-utiles.jpg';
import './TotemLogin.css';
import { motion, AnimatePresence } from 'framer-motion';
import iconeTravaux from '../assets/icone-travaux.png';

const LONGUEUR_MAX = 5;
const MATRICULES_AUTORISES = ['05102', '04575', '04227', '03933'];

export default function TotemLogin() {
  const [matricule, setMatricule] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [employe, setEmploye] = useState(null);
  const [vue, setVue] = useState('connexion');
  const [imageAffichee, setImageAffichee] = useState(null);
  const [secondesRestantes, setSecondesRestantes] = useState(120);

  const employeConnecte = vue !== 'connexion';

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
        const matriculeNormalise = matricule.padStart(LONGUEUR_MAX, '0');
        if (!MATRICULES_AUTORISES.includes(matriculeNormalise)) {
          setErreur('Application en cours de développement — accès restreint pour le moment');
          setMatricule('');
          setChargement(false);
          return;
        }
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

  useEffect(() => {
    if (!employeConnecte) return;
    setSecondesRestantes(120);

    const remettreAZero = () => setSecondesRestantes(120);
    window.addEventListener('click', remettreAZero);

    const intervalle = setInterval(() => {
      setSecondesRestantes((s) => {
        if (s <= 1) {
          reset();
          return 120;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener('click', remettreAZero);
      clearInterval(intervalle);
    };
  }, [employeConnecte]);

  return (
    <div className={employeConnecte ? 'totem-page' : 'totem-page-connexion'}>
      {employeConnecte && (
        <Header utilisateur={employe} onDeconnexion={reset} secondesRestantes={secondesRestantes} />
      )}
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

        {vue === 'historique' && (
          <motion.div key="historique" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <MesSignalements employe={employe} onRetour={() => setVue('accueil')} />
          </motion.div>
        )}

        {vue === 'confirmation' && (
          <motion.div key="confirmation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <main className="totem-accueil">
              <div className="totem-confirmation">
                <span className="totem-confirmation-icone">✅</span>
                <h2>Demande d'intervention enregistrée</h2>
                <p>Merci {employe.Nome}, votre signalement a bien été transmis.</p>
                <button className="totem-confirmation-bouton" onClick={() => setVue('accueil')}>
                  Retour à l'accueil
                </button>
              </div>
            </main>
          </motion.div>
        )}

        {vue === 'accueil' && (
          <motion.div key="accueil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <main className="totem-accueil">
                            <button className="carte-action-principale" onClick={() => setVue('signalement')}>
                <img src={iconeTravaux} alt="" className="carte-action-icone-img" />
                <div className="carte-action-texte">
                  <h2>Signaler un problème</h2>
                 
                </div>
                <div className="carte-action-fleche">→</div>
              </button>
              <button className="totem-bouton-historique" onClick={() => setVue('historique')}>
                📋 Mes demandes
              </button>
            </main>
          </motion.div>
        )}

        {vue === 'connexion' && (
          <motion.div key="connexion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <main className="totem-connexion">
              <div className="totem-bandeau-dev">
                <span className="totem-bandeau-dev-icone">🚧</span>
                <div className="totem-bandeau-dev-texte">
                  <span className="totem-bandeau-dev-titre">Application en cours de développement</span>
                  <span className="totem-bandeau-dev-sous">Accès temporairement restreint</span>
                </div>
              </div>
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
                    <img src={iconePlan} alt="" className="totem-raccourci-icone-img" />
                    Plan du site
                  </button>
                  <button className="totem-touche totem-touche-zero" onClick={() => ajouterChiffre('0')}>0</button>
                  <button className="totem-raccourci-bas" onClick={() => setImageAffichee('numeros')}>
                    <img src={iconeNumeros} alt="" className="totem-raccourci-icone-img" />
                    Numéros utiles
                  </button>
                </div>
                <button className="totem-bouton-valider" onClick={valider} disabled={chargement}>
                  {chargement ? 'Vérification...' : 'VALIDER'}
                </button>
                <button className="totem-bouton-effacer" onClick={reset}>SUPPRIMER</button>
                {erreur && <p className="totem-erreur">{erreur}</p>}
              </div>
              <footer className="totem-footer-connexion">
                Système automatique de signalement des pannes (douches, casiers, etc.)
              </footer>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {imageAffichee && (
        <div className="totem-modale-fond" onClick={() => setImageAffichee(null)}>
          <div className="totem-modale-contenu" onClick={(e) => e.stopPropagation()}>
            <button className="totem-modale-fermer" onClick={() => setImageAffichee(null)}>✕</button>
            <img src={imageAffichee === 'plan' ? planSite : numerosUtiles} alt="" />
          </div>
        </div>
      )}
    </div>
  );
}