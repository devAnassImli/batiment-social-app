import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { envoyerSignalement } from '../services/api';
import iconeInfirmerie from '../assets/zones/infirmerie.png';
import iconeCasiers from '../assets/zones/casiers.png';
import iconeDouches from '../assets/zones/douches.png';
import iconePosteGarde from '../assets/zones/poste-garde.png';
import iconeBasculeCse from '../assets/zones/bascule-cse.png';
import './FormulaireSignalement.css';

const ZONES = [
  { nom: 'Infirmerie', icone: iconeInfirmerie, secours: '➕' },
  { nom: 'Casiers', icone: iconeCasiers, secours: '🗄️' },
  { nom: 'Douches', icone: iconeDouches, secours: '🚿' },
  { nom: 'Poste de garde', icone: iconePosteGarde, secours: '🛡️' },
  { nom: 'CSE', icone: iconeBasculeCse, secours: '⚖️' },
];

const PROBLEMES_PAR_ZONE = {
  'Infirmerie': [
    { texte: 'Manque de matériel', categorie: 'Autre' },
    { texte: 'Fuite / plomberie', categorie: 'Plomberie' },
    { texte: 'Électricité / éclairage', categorie: 'Électricité' },
    { texte: 'Frigo médical / conservation', categorie: 'Autre' },
    { texte: 'Hygiène / infestation', categorie: 'Propreté' },
  ],
  'Casiers': [
    { texte: 'Serrure / cadenas', categorie: 'Serrurerie' },
    { texte: 'Casier endommagé', categorie: 'Autre' },
    { texte: 'Humidité / infiltration', categorie: 'Plomberie' },
    { texte: 'Manque de casiers', categorie: 'Autre' },
    { texte: 'Hygiène / odeurs', categorie: 'Propreté' },
  ],
  'Douches': [
    { texte: 'Fuite / plomberie', categorie: 'Plomberie' },
    { texte: 'Eau chaude / chauffe-eau', categorie: 'Plomberie' },
    { texte: 'Hygiène / moisissure', categorie: 'Propreté' },
    { texte: 'Drain / évacuation', categorie: 'Plomberie' },
    { texte: "Manque d'équipement", categorie: 'Autre' },
  ],
  'Poste de garde': [
    { texte: "Contrôle d'accès / badges", categorie: 'Serrurerie' },
    { texte: 'Caméras / vidéosurveillance', categorie: 'Électricité' },
    { texte: 'Communication (radio / téléphone)', categorie: 'Autre' },
    { texte: 'Fuite / humidité', categorie: 'Plomberie' },
  ],
  'CSE': [
    { texte: 'Manque de fournitures', categorie: 'Autre' },
    { texte: 'Panne informatique', categorie: 'Électricité' },
    { texte: "Problème d'accès / serrure", categorie: 'Serrurerie' },
    { texte: 'Fuite / humidité', categorie: 'Plomberie' },
    { texte: 'Affichage obligatoire', categorie: 'Autre' },
  ],
};

export default function FormulaireSignalement({ employe, onAnnuler, onEnvoye }) {
  const [etape, setEtape] = useState(1);
  const [zone, setZone] = useState(null);
  const [categorie, setCategorie] = useState(null);
  const [description, setDescription] = useState('');
  const [autreTexte, setAutreTexte] = useState('');
  const [afficherAutre, setAfficherAutre] = useState(false);
  const [urgence, setUrgence] = useState(null);
  const [afficherConfirmation, setAfficherConfirmation] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const etapeSuivante = () => setEtape((e) => e + 1);
  const etapePrecedente = () => setEtape((e) => Math.max(1, e - 1));

  const choisirProbleme = (probleme) => {
    setCategorie(probleme.categorie);
    setDescription(probleme.texte);
    etapeSuivante();
  };

  const validerAutre = () => {
    if (autreTexte.trim().length === 0) return;
    setCategorie('Autre');
    setDescription(autreTexte);
    etapeSuivante();
  };

  const confirmerEnvoi = async () => {
    setEnvoiEnCours(true);
    try {
      const { ok, resultat } = await envoyerSignalement({
        matricule: employe.Matricola?.trim(),
        nomDemandeur: `${employe.Nome} ${employe.Cognome}`,
        zone, categorie, urgence, description,
      });
      if (ok && resultat.succes) {
        onEnvoye({ zone, categorie, urgence, description, id: resultat.idSignalement });
      } else {
        alert("Erreur lors de l'envoi, réessayez.");
        setAfficherConfirmation(false);
      }
    } catch {
      alert('Impossible de contacter le serveur.');
      setAfficherConfirmation(false);
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
    <main className="signalement-main">
      <div className="signalement-carte">

        <div className="signalement-progression">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`signalement-point ${etape >= n ? 'actif' : ''}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">

          {etape === 1 && !zone && (
            <motion.div key="zones" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
              <h2>Quelle zone est concernée ?</h2>
              <div className="signalement-grille-zones">
                {ZONES.map((z) => (
                  <button key={z.nom} className="signalement-zone-carte" onClick={() => setZone(z.nom)}>
                    <img
                      src={z.icone}
                      alt={z.nom}
                      className="signalement-zone-icone"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                    />
                    <span className="signalement-zone-secours">{z.secours}</span>
                    <span className="signalement-zone-nom">{z.nom}</span>
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
                  <button key={p.texte} className="signalement-probleme" onClick={() => choisirProbleme(p)}>
                    {p.texte}
                  </button>
                ))}
                <button className="signalement-probleme signalement-probleme-autre" onClick={() => setAfficherAutre(true)}>
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
                  <button className="signalement-envoyer" onClick={validerAutre} disabled={autreTexte.trim().length === 0}>
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

          {etape === 3 && (
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
                  onClick={() => setAfficherConfirmation(true)}
                  disabled={description.trim().length === 0}
                >
                  Valider
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <button className="signalement-annuler-global" onClick={onAnnuler}>
        Annuler et revenir à l'accueil
      </button>

      {afficherConfirmation && (
        <div className="signalement-confirmation-fond">
          <div className="signalement-confirmation-boite">
            <h3>Confirmer l'envoi</h3>
            <p>Vous validez l'intervention pour <strong>{zone}</strong> — {description} ?</p>
            <div className="signalement-confirmation-boutons">
              <button className="signalement-confirmation-non" onClick={() => setAfficherConfirmation(false)} disabled={envoiEnCours}>
                Non, revenir
              </button>
              <button className="signalement-confirmation-oui" onClick={confirmerEnvoi} disabled={envoiEnCours}>
                {envoiEnCours ? 'Envoi...' : 'Oui, envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}