import { useState } from 'react';
import Header from '../components/Header';
import './FormulaireSignalement.css';

const ZONES = ['Infirmerie', 'Casiers', 'Douches', 'Poste de garde', 'Bascule CSE'];
const CATEGORIES = ['Plomberie', 'Électricité', 'Serrurerie', 'Propreté', 'Autre'];

export default function FormulaireSignalement({ employe, onAnnuler, onEnvoye }) {
  const [etape, setEtape] = useState(1);
  const [zone, setZone] = useState(null);
  const [categorie, setCategorie] = useState(null);
  const [urgence, setUrgence] = useState(null);
  const [description, setDescription] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const etapeSuivante = () => setEtape((e) => e + 1);
  const etapePrecedente = () => setEtape((e) => Math.max(1, e - 1));

  const envoyer = async () => {
    setEnvoiEnCours(true);
    // Etape suivante du projet: appel API pour sauvegarder en base
    // Pour l'instant on simule l'envoi
    setTimeout(() => {
      setEnvoiEnCours(false);
      onEnvoye({ zone, categorie, urgence, description });
    }, 600);
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

          {etape === 1 && (
            <>
              <h2>Quelle zone est concernée ?</h2>
              <div className="signalement-grille">
                {ZONES.map((z) => (
                  <button
                    key={z}
                    className={`signalement-choix ${zone === z ? 'selectionne' : ''}`}
                    onClick={() => { setZone(z); etapeSuivante(); }}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </>
          )}

          {etape === 2 && (
            <>
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
            </>
          )}

          {etape === 3 && (
            <>
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
            </>
          )}

          {etape === 4 && (
            <>
              <h2>Décrivez le problème</h2>
              <div className="signalement-recap">
                <span className="signalement-tag">{zone}</span>
                <span className="signalement-tag">{categorie}</span>
                <span className={`signalement-tag ${urgence === 'Urgent' ? 'tag-urgent' : ''}`}>{urgence}</span>
              </div>
              <textarea
                className="signalement-description"
                placeholder="Ex : robinet du lavabo qui fuit en continu..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                autoFocus
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
            </>
          )}

        </div>

        <button className="signalement-annuler-global" onClick={onAnnuler}>
          Annuler et revenir à l'accueil
        </button>
      </main>
    </div>
  );
}