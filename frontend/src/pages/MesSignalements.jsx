import { useState, useEffect } from 'react';
import { recupererMesSignalements, supprimerSignalement, modifierSignalement, validerSignalement } from '../services/api';
import ClavierVirtuel from '../components/ClavierVirtuel';
import './MesSignalements.css';
const COULEURS_STATUT = {
  A_VALIDER: { label: 'En attente', couleur: '#d97706', fond: '#fef3e2' },
  VALIDE: { label: 'Validé', couleur: '#2563eb', fond: '#eaf1fd' },
  REFUSE: { label: 'Refusé', couleur: '#c0392b', fond: '#fdecea' },
  ANNULE: { label: 'Annulé', couleur: '#6b7280', fond: '#f1f2f3' },
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

export default function MesSignalements({ employe, onRetour }) {
  const [liste, setListe] = useState([]);
  const [estAdmin, setEstAdmin] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [selectionne, setSelectionne] = useState(null);
  const [dateDebut, setDateDebut] = useState(dateAujourdhui());
  const [dateFin, setDateFin] = useState(dateAujourdhui());
  const [modeEdition, setModeEdition] = useState(false);
  const [clavierOuvert, setClavierOuvert] = useState(false);
  const [texteEdition, setTexteEdition] = useState('');
    const [confirmerSuppression, setConfirmerSuppression] = useState(false);

  const charger = () => {
    setChargement(true);
    recupererMesSignalements(employe.Matricola?.trim(), dateDebut, dateFin).then((d) => {
      setListe(d.signalements || []);
      setEstAdmin(!!d.estAdmin);
      setChargement(false);
    });
  };

  useEffect(() => { charger(); }, [dateDebut, dateFin]);

  const voirToutesLesDates = () => {
    setDateDebut('');
    setDateFin('');
  };

  const supprimer = async () => {
    await supprimerSignalement(selectionne.IdSignalement, employe.Matricola?.trim());
    setConfirmerSuppression(false);
    setSelectionne(null);
    charger();
  };
  const valider = async () => {
    await validerSignalement(selectionne.IdSignalement, employe.Matricola?.trim());
    setSelectionne(null);
    charger();
  };
  const ouvrirEdition = () => {
    setTexteEdition(selectionne.DescriptionComplete?.replace(/^\[Matricule: \d+\]\s*/, '') || '');
    setModeEdition(true);
    setClavierOuvert(true);
  };

  const validerEdition = async (texte) => {
    await modifierSignalement(selectionne.IdSignalement, employe.Matricola?.trim(), texte);
    setClavierOuvert(false);
    setModeEdition(false);
    setSelectionne(null);
    charger();
  };

  return (
    <main className="mes-page">
      <div className="mes-carte">
        <div className="mes-entete">
          <h2>{estAdmin ? 'Toutes les demandes' : 'Mes demandes'}</h2>
          {estAdmin && <span className="mes-badge-admin">Vue administrateur</span>}
        </div>

        <div className="mes-filtres">
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          <span>à</span>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          <button onClick={voirToutesLesDates}>Toutes les dates</button>
        </div>

        {chargement && <p className="mes-vide">Chargement...</p>}
        {!chargement && liste.length === 0 && <p className="mes-vide">Aucune demande sur cette période.</p>}

        {!chargement && liste.length > 0 && (
          <div className="mes-liste">
            {liste.map((s) => {
              const info = COULEURS_STATUT[s.Statut] || COULEURS_STATUT.A_VALIDER;
              return (
                <div key={s.IdSignalement} className="mes-carte-demande">
                  <button className="mes-sel" onClick={() => setSelectionne(s)}>SEL</button>
                  <div className="mes-carte-contenu">
                    <div className="mes-carte-ligne1">
                      <span className="mes-carte-numero">#{s.IdSignalement}</span>
                      <span className="mes-badge-statut" style={{ color: info.couleur, background: info.fond }}>
                        {info.label}
                      </span>
                    </div>
                    <p className="mes-carte-objet">{s.Description}</p>
                    <div className="mes-carte-ligne3">
                      <span>{new Date(s.DateCreation).toLocaleDateString('fr-FR')}</span>
                      {estAdmin && <span className="mes-carte-demandeur">{s.NomDemandeur}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className="mes-retour" onClick={onRetour}>
          <span className="mes-retour-fleche">←</span> Retour à l'accueil
        </button>
      </div>

      {selectionne && !modeEdition && (
        <div className="mes-detail-fond" onClick={() => setSelectionne(null)}>
          <div className="mes-detail-boite" onClick={(e) => e.stopPropagation()}>
            <button className="mes-detail-fermer" onClick={() => setSelectionne(null)}>✕</button>
            <h3>Demande #{selectionne.IdSignalement}</h3>

            <span
              className="mes-detail-statut"
              style={{
                color: (COULEURS_STATUT[selectionne.Statut] || COULEURS_STATUT.A_VALIDER).couleur,
                background: (COULEURS_STATUT[selectionne.Statut] || COULEURS_STATUT.A_VALIDER).fond,
              }}
            >
              {(COULEURS_STATUT[selectionne.Statut] || COULEURS_STATUT.A_VALIDER).label}
            </span>

            <dl>
              <dt>Demandeur</dt><dd>{selectionne.NomDemandeur}</dd>
              <dt>Date</dt><dd>{new Date(selectionne.DateCreation).toLocaleString('fr-FR')}</dd>
              <dt>Zone</dt><dd>{selectionne.ZoneNom}</dd>
              <dt>Avancement</dt><dd>{selectionne.AvancementNom || 'En attente de traitement'}</dd>
              <dt>Objet</dt><dd>{selectionne.Description}</dd>
            </dl>

            <div className="mes-detail-commentaire">
              <span className="mes-detail-commentaire-label">Détail complet</span>
              <p>{selectionne.DescriptionComplete}</p>
            </div>

                       <div className="mes-detail-actions">
              {estAdmin && selectionne.Statut === 'A_VALIDER' && (
                <button className="mes-detail-valider" onClick={valider}>
                  ✓ Valider
                </button>
              )}
              <button className="mes-detail-modifier" onClick={ouvrirEdition}>
                ✎ Modifier
              </button>
              <button className="mes-detail-supprimer" onClick={() => setConfirmerSuppression(true)}>
                🗑 Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {clavierOuvert && (
        <ClavierVirtuel
          valeurInitiale={texteEdition}
          obligatoire={true}
          onFermer={() => { setClavierOuvert(false); setModeEdition(false); }}
          onValider={validerEdition}
        />
      )}
            {confirmerSuppression && (
        <div className="mes-confirmation-fond" onClick={() => setConfirmerSuppression(false)}>
          <div className="mes-confirmation-boite" onClick={(e) => e.stopPropagation()}>
            <span className="mes-confirmation-icone">⚠️</span>
            <h3>Supprimer cette demande ?</h3>
            <p>Cette action est définitive et ne peut pas être annulée.</p>
            <div className="mes-confirmation-boutons">
              <button className="mes-confirmation-non" onClick={() => setConfirmerSuppression(false)}>
                Annuler
              </button>
              <button className="mes-confirmation-oui" onClick={supprimer}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}