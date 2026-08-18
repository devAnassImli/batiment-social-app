import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import './FormulaireSignalement.css';
import { envoyerSignalement } from '../services/api';

const ZONES = ['Infirmerie', 'Casiers', 'Douches', 'Poste de garde', 'Bascule CSE'];
const CATEGORIES = ['Plomberie', 'Électricité', 'Serrurerie', 'Propreté', 'Autre'];

const PROBLEMES_PAR_ZONE = {
  'Infirmerie': ['Porte qui ferme mal', 'Éclairage défectueux', 'Matériel endommagé', 'Manque de fournitures'],
  'Casiers': ['Casier bloqué', 'Serrure cassée', 'Casier endommagé'],
  'Douches': ["Fuite d'eau", "Panne d'eau chaude", 'Carrelage cassé', 'Moisissure / odeur'],
  'Poste de garde': ['Porte automatique en panne', 'Chauffage en panne', 'Éclairage défectueux'],
  'Bascule CSE': ["Panne d'affichage", 'Problème mécanique', 'Écran illisible'],
};

export default function FormulaireSignalement({ employe, onAnnuler, onEnvoye }) {
  const [etape, setEtape] = useState(1);
  const [zone, setZone] = useState(null);
  const [problemeChoisi, setProblemeChoisi] = useState(null);
  const [autreTexte, setAutreTexte] = useState('');
  const [afficherAutre, setAfficherAutre] = useState(false);
  const [categorie, setCategorie] = useState(null);
  const [urgence, setUrgence] = useState(null);
  const [description, setDescription] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const etapeSuivante = () => setEtape((e) => e + 1);
  const etapePrecedente = () => setEtape((e) => Math.max(1, e - 1));

  const choisirProbleme = (texte) => {
    setProblemeChoisi(texte);
    setDescription(texte);
    etapeSuivante();
  };

  const validerAutre = () => {
    if (autreTexte.trim().length === 0) return;
    setProblemeChoisi(autreTexte);
    setDescription(autreTexte);
    etapeSuivante();
  };

  const envoyer = async () => {
    setEnvoiEnCours(true);
    try {
      const { ok, resultat } = await envoyerSignalement({
        matricule: employe.Matricola?.trim(),
        nomDemandeur: `${employe.Nome} ${employe.Cognome}`,
        zone,
        categorie,
        urgence,
        description,
      });
      if (ok && resultat.succes) {
        onEnvoye({ zone, categorie, urgence, description, id: resultat.idSignalement });
      } else {
        alert("Erreur lors de l'envoi, réessayez.");
      }
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const variantes = {
    entree: { opacity: 0, x: 30 },
    centre: { opacity: 1, x: 0 },
    sortie: { opacity: 0, x: -30 },
  };

  return (
    <div className="totem-page">
      <Header utilisateur={employe} />
      <main className="signalement-main">
        <div className="signalement-carte">

          <div className="signalement-progression">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={`signalement-point ${etape >= n ? 'actif' : ''}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">

            {etape === 1 && !zone && (
              <motion.div key="zones" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
                <h2>Quelle zone est concernée ?</h2>
                <div className="signalement-grille">
                  {ZONES.map((z) => (
                    <button key={z} className="signalement-choix" onClick={() => setZone(z)}>
                      {z}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {etape === 1 && zone && (
              <motion.div key="problemes" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
                <h2>{zone} — quel est le problème ?</h2>
                <div className="signalement-liste-problemes">
                  {PROBLEMES_PAR_ZONE[zone].map((p) => (
                    <button key={p} className="signalement-probleme" onClick={() => choisirProbleme(p)}>
                      {p}
                    </button>
                  ))}
                  <button
                    className="signalement-probleme signalement-probleme-autre"
                    onClick={() => setAfficherAutre(true)}
                  >
                    Autre (préciser)
                  </button>
                </div>

                {afficherAutre && (
                  <div className="signalement-autre-zone">
                    <textarea
                      className="signalement-description"
                      placeholder="Décrivez le problème..."
                      value={autreTexte}
                      onChange={(e) => setAutreTexte(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <button
                      className="signalement-envoyer"
                      onClick={validerAutre}
                      disabled={autreTexte.trim().length === 0}
                    >
                      Continuer
                    </button>
                  </div>
                )}

                <button className="signalement-retour" onClick={() => { setZone(null); setAfficherAutre(false); }}>
                  ← Changer de zone
                </button>
              </motion.div>
            )}

            {etape === 2 && (
              <motion.div key="categorie" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
                <h2>Quel type de problème ?</h2>
                <div className="signalement-grille">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      className={`signalement-choix ${categorie === c ? 'selectionne' : ''}`}
                      onClick={() => { setCategorie(c); etapeSuivante(); }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <button className="signalement-retour" onClick={etapePrecedente}>← Retour</button>
              </motion.div>
            )}

            {etape === 3 && (
              <motion.div key="urgence" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
                <h2>Le problème est-il urgent ?</h2>
                <div className="signalement-grille signalement-grille-urgence">
                  <button
                    className={`signalement-choix signalement-normal ${urgence === 'Normal' ? 'selectionne' : ''}`}
                    onClick={() => { setUrgence('Normal'); etapeSuivante(); }}
                  >
                    Normal
                  </button>
                  <button
                    className={`signalement-choix signalement-urgent ${urgence === 'Urgent' ? 'selectionne' : ''}`}
                    onClick={() => { setUrgence('Urgent'); etapeSuivante(); }}
                  >
                    ⚠ Urgent
                  </button>
                </div>
                <button className="signalement-retour" onClick={etapePrecedente}>← Retour</button>
              </motion.div>
            )}

            {etape === 4 && (
              <motion.div key="recap" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
                <h2>Vérifiez votre signalement</h2>
                <div className="signalement-recap">
                  <span className="signalement-tag">{zone}</span>
                  <span className="signalement-tag">{categorie}</span>
                  <span className={`signalement-tag ${urgence === 'Urgent' ? 'tag-urgent' : ''}`}>{urgence}</span>
                </div>
                <textarea
                  className="signalement-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                <div className="signalement-boutons-finaux">
                  <button className="signalement-retour" onClick={etapePrecedente}>← Retour</button>
                  <button
                    className="signalement-envoyer"
                    onClick={envoyer}
                    disabled={description.trim().length === 0 || envoiEnCours}
                  >
                    {envoiEnCours ? 'Envoi...' : 'Envoyer le signalement'}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <button className="signalement-annuler-global" onClick={onAnnuler}>
          Annuler et revenir à l'accueil
        </button>
      </main>
    </div>
  );
}