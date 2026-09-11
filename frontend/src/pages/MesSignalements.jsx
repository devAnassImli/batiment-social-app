import { useState, useEffect } from 'react';
import { recupererMesSignalements, supprimerSignalement, modifierSignalement } from '../services/api';
import ClavierVirtuel from '../components/ClavierVirtuel';
import './MesSignalements.css';
const COULEURS_STATUT = {
  A_VALIDER: { couleur: '#d97706', fond: '#fef3e2' },
  VALIDE: { couleur: '#2563eb', fond: '#eaf1fd' },
  AVANCEMENT: { couleur: '#7c3aed', fond: '#f3e8ff' },
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
                     <span className="mes-carte-numero">{s.NumeroAffiche}</span>
                     <span className="mes-badge-statut" style={{ color: (COULEURS_STATUT[s.Statut] || COULEURS_STATUT.A_VALIDER).couleur, background: (COULEURS_STATUT[s.Statut] || COULEURS_STATUT.A_VALIDER).fond }}>
  {s.StatutLabel}
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
           <h3>Demande {selectionne.NumeroAffiche}</h3>

<span
  className="mes-detail-statut"
  style={{
    color: (COULEURS_STATUT[selectionne.Statut] || COULEURS_STATUT.A_VALIDER).couleur,
    background: (COULEURS_STATUT[selectionne.Statut] || COULEURS_STATUT.A_VALIDER).fond,
  }}
>
  {selectionne.StatutLabel}
</span>
                      <dl>
              <dt>Matricule</dt><dd>{selectionne.DescriptionComplete?.match(/\[Matricule: (\d+)\]/)?.[1] || '—'}</dd>
              <dt>Demandeur</dt><dd>{selectionne.NomDemandeur}</dd>
              <dt>Date</dt><dd>{new Date(selectionne.DateCreation).toLocaleString('fr-FR')}</dd>
              <dt>Zone</dt><dd>{selectionne.ZoneNom}</dd>
              <dt>Avancement</dt><dd>{selectionne.AvancementNom || 'En attente de traitement'}</dd>
              <dt>Objet</dt><dd>{selectionne.Description}</dd>
            </dl>

                       {(() => {
              const texteApresMatricule = selectionne.DescriptionComplete?.replace(/^\[Matricule: \d+\]\s*/, '').trim();
              return texteApresMatricule ? (
                <div className="mes-detail-commentaire">
                  <span className="mes-detail-commentaire-label">Description</span>
                  <p>{texteApresMatricule}</p>
                </div>
              ) : null;
            })()}
                                     <div className="mes-detail-actions">
              {selectionne.Statut === 'A_VALIDER' && (
                <>
                  <button className="mes-detail-modifier" onClick={ouvrirEdition}>
                    ✎ Modifier
                  </button>
                  <button className="mes-detail-supprimer" onClick={() => setConfirmerSuppression(true)}>
                    🗑 Supprimer
                  </button>
                </>
              )}
              {selectionne.Statut !== 'A_VALIDER' && (
                <p className="mes-detail-info-lecture-seule">
                  Cette demande a été validée — elle n'est plus modifiable depuis le totem.
                </p>
              )}
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