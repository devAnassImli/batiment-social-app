import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ClavierVirtuel from '../components/ClavierVirtuel';
import { envoyerSignalement } from '../services/api';
import iconeInfirmerie from '../assets/zones/infirmerie.png';
import iconeCasiers from '../assets/zones/casiers.png';
import iconeDouches from '../assets/zones/douches.png';
import iconePosteGarde from '../assets/zones/poste-garde.png';
import iconeBasculeCse from '../assets/zones/bascule-cse.png';
import iconeAutre from '../assets/zones/autre.png';
import './FormulaireSignalement.css';

const ZONES = [
  { nom: 'Infirmerie', icone: iconeInfirmerie },
  { nom: 'Casiers', icone: iconeCasiers },
  { nom: 'Douches', icone: iconeDouches },
  { nom: 'Poste de garde', icone: iconePosteGarde },
  { nom: 'Bascule CSE', icone: iconeBasculeCse },
  { nom: 'Autre', icone: iconeAutre },
];

const COULEURS_CATEGORIE = {
  Plomberie: '#2563eb',
  Électricité: '#d97706',
  Serrurerie: '#7c3aed',
  Propreté: '#16a34a',
  Autre: '#64748b',
};

const PROBLEMES_PAR_ZONE = {
  Infirmerie: [
    { texte: 'Manque de matériel', categorie: 'Autre' },
    { texte: 'Fuite / plomberie', categorie: 'Plomberie' },
    { texte: 'Électricité / éclairage', categorie: 'Électricité' },
    { texte: 'Frigo médical / conservation', categorie: 'Autre' },
    { texte: 'Hygiène / infestation', categorie: 'Propreté' },
  ],
  Casiers: [
    { texte: 'Serrure / cadenas', categorie: 'Serrurerie' },
    { texte: 'Casier endommagé', categorie: 'Autre' },
    { texte: 'Humidité / infiltration', categorie: 'Plomberie' },
    { texte: 'Manque de casiers', categorie: 'Autre' },
    { texte: 'Hygiène / odeurs', categorie: 'Propreté' },
  ],
  Douches: [
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
  'Bascule CSE': [
    { texte: 'Manque de fournitures', categorie: 'Autre' },
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
  const [commentaire, setCommentaire] = useState('');
  const [urgence, setUrgence] = useState(null);
  const [afficherConfirmation, setAfficherConfirmation] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [clavierPour, setClavierPour] = useState(null);

  const etapeSuivante = () => setEtape((e) => e + 1);
  const etapePrecedente = () => setEtape((e) => Math.max(1, e - 1));

  const etapeAffichee = () => {
    if (etape === 1 && !zone) return 1;
    if (etape === 1 && zone) return 2;
    if (etape === 2) return 3;
    return 4;
  };

  function choisirZone(nom) {
    setZone(nom);
    if (nom === 'Autre') {
      setCategorie('Autre');
      setClavierPour('zoneAutre');
    }
  }

  function choisirProbleme(probleme) {
    setCategorie(probleme.categorie);
    setDescription(probleme.texte);
    etapeSuivante();
  }

  function fermerClavier() {
    if (clavierPour === 'zoneAutre' && !description) {
      setZone(null);
    }
    setClavierPour(null);
  }

  function validerClavier(texte) {
    if (clavierPour === 'zoneAutre') {
      setDescription(texte);
      setEtape(2);
    } else if (clavierPour === 'problemeAutre') {
      setCategorie('Autre');
      setDescription(texte);
      etapeSuivante();
    } else {
      setCommentaire(texte);
    }
    setClavierPour(null);
  }

  async function confirmerEnvoi() {
    setEnvoiEnCours(true);
    try {
      const descriptionFinale = commentaire.trim()
        ? `${description} — Commentaire : ${commentaire.trim()}`
        : description;
      const { ok, resultat } = await envoyerSignalement({
        matricule: employe.Matricola?.trim(),
        nomDemandeur: `${employe.Nome} ${employe.Cognome}`,
        zone,
        categorie,
        urgence,
        description: descriptionFinale,
      });
      if (ok && resultat.succes) {
       onEnvoye({ zone, categorie, urgence, description: descriptionFinale, id: resultat.idSignalement, numero: resultat.numero });
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
  }

  const variantes = {
    entree: { opacity: 0, x: 30 },
    centre: { opacity: 1, x: 0 },
    sortie: { opacity: 0, x: -30 },
  };

  const couleurCategorie = categorie ? COULEURS_CATEGORIE[categorie] || '#64748b' : '#64748b';

  return (
    <main className="signalement-main">
      <div className="signalement-carte">
        <div className="signalement-progression">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`signalement-point ${etapeAffichee() >= n ? 'actif' : ''}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {etape === 1 && !zone && (
            <motion.div key="zones" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
              <h2>Quelle zone est concernée ?</h2>
              <div className="signalement-grille-zones">
                {ZONES.map((z) => (
                  <button key={z.nom} type="button" className="signalement-zone-carte" onClick={() => choisirZone(z.nom)}>
                    <img src={z.icone} alt={z.nom} className="signalement-zone-icone" />
                    <span className="signalement-zone-nom">{z.nom}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {etape === 1 && zone && zone !== 'Autre' && (
            <motion.div key="problemes" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
              <h2>{zone} — quel est le problème ?</h2>
              <div className="signalement-liste-problemes">
                {(PROBLEMES_PAR_ZONE[zone] || []).map((p) => (
                  <button key={p.texte} type="button" className="signalement-probleme" onClick={() => choisirProbleme(p)}>
                    {p.texte}
                  </button>
                ))}
                <button type="button" className="signalement-probleme signalement-probleme-autre" onClick={() => setClavierPour('problemeAutre')}>
                  <img src={iconeAutre} alt="" className="signalement-probleme-icone" />
                  Autre (préciser)
                </button>
              </div>
              <button type="button" className="signalement-retour" onClick={() => setZone(null)}>← Changer de zone</button>
            </motion.div>
          )}

          {etape === 2 && (
            <motion.div key="urgence" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
              <h2>Le problème est-il urgent ?</h2>
              <div className="signalement-grille signalement-grille-urgence">
                <button type="button" className={`signalement-choix signalement-normal ${urgence === 'Normal' ? 'selectionne' : ''}`} onClick={() => { setUrgence('Normal'); etapeSuivante(); }}>
                  Normal
                </button>
                <button type="button" className={`signalement-choix signalement-urgent ${urgence === 'Urgent' ? 'selectionne' : ''}`} onClick={() => { setUrgence('Urgent'); etapeSuivante(); }}>
                  ⚠ Urgent
                </button>
              </div>
              <button type="button" className="signalement-retour" onClick={etapePrecedente}>← Retour</button>
            </motion.div>
          )}

          {etape === 3 && (
            <motion.div key="recap" variants={variantes} initial="entree" animate="centre" exit="sortie" transition={{ duration: 0.25 }}>
              <h2>Vérifiez votre signalement</h2>

              <div className="signalement-recap">
                <span className="signalement-tag signalement-tag-zone">{zone}</span>
                <span className="signalement-tag" style={{ background: `${couleurCategorie}22`, color: couleurCategorie }}>{categorie}</span>
                <span className={`signalement-tag ${urgence === 'Urgent' ? 'tag-urgent' : 'tag-normal'}`}>{urgence}</span>
                <span className="signalement-tag signalement-tag-probleme">{description}</span>
              </div>

              <label className="signalement-label-commentaire">Commentaire (facultatif)</label>
              <textarea
                className="signalement-description"
                placeholder="Touchez pour ajouter un commentaire..."
                value={commentaire}
                readOnly
                onClick={() => setClavierPour('commentaire')}
                rows={3}
              />

              <div className="signalement-boutons-finaux">
                <button type="button" className="signalement-retour" onClick={etapePrecedente}>← Retour</button>
                <button type="button" className="signalement-envoyer" onClick={() => setAfficherConfirmation(true)}>Valider</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button type="button" className="signalement-annuler-global" onClick={onAnnuler}>
        Annuler et revenir à l'accueil
      </button>

      {clavierPour && (
        <ClavierVirtuel
          valeurInitiale={clavierPour === 'commentaire' ? commentaire : ''}
          obligatoire={clavierPour !== 'commentaire'}
          onFermer={fermerClavier}
          onValider={validerClavier}
        />
      )}

      {afficherConfirmation && (
        <div className="signalement-confirmation-fond">
          <div className="signalement-confirmation-boite">
            <div className="signalement-confirmation-icone">📤</div>
            <h3>Confirmer l'envoi</h3>
            <div className="signalement-confirmation-recap">
              <span className="signalement-tag signalement-tag-zone">{zone}</span>
              <span className="signalement-tag" style={{ background: `${couleurCategorie}22`, color: couleurCategorie }}>{categorie}</span>
              <span className={`signalement-tag ${urgence === 'Urgent' ? 'tag-urgent' : 'tag-normal'}`}>{urgence}</span>
            </div>
            <p className="signalement-confirmation-texte">{description}</p>
            <div className="signalement-confirmation-boutons">
              <button type="button" className="signalement-confirmation-non" onClick={() => setAfficherConfirmation(false)} disabled={envoiEnCours}>
                Non, revenir
              </button>
              <button type="button" className="signalement-confirmation-oui" onClick={confirmerEnvoi} disabled={envoiEnCours}>
                {envoiEnCours ? 'Envoi...' : 'Oui, envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}