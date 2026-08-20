import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  recupererSignalement, validerSignalement, refuserSignalement,
  annulerSignalement, supprimerSignalement, changerAvancement,
  assignerPilote, recupererAvancements, recupererPilotes,
} from '../services/apiAdmin';
import './AdminSignalementDetail.css';

export default function AdminSignalementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donnees, setDonnees] = useState(null);
  const [avancements, setAvancements] = useState([]);
  const [pilotes, setPilotes] = useState([]);
  const [motifRefus, setMotifRefus] = useState('');
  const [afficherRefus, setAfficherRefus] = useState(false);

  useEffect(() => { charger(); }, [id]);

  const charger = async () => {
    const [res, av, pi] = await Promise.all([
      recupererSignalement(id),
      recupererAvancements(),
      recupererPilotes(),
    ]);
    setDonnees(res);
    setAvancements(av || []);
    setPilotes(pi || []);
  };

  if (!donnees) return <div className="admin-detail-page">Chargement...</div>;
  const { signalement: s, historique } = donnees;

  const action = async (fn) => { await fn(); charger(); };

  return (
    <div className="admin-detail-page">
      <header className="admin-detail-header">
        <button onClick={() => navigate('/admin/dashboard')}>← Retour à la liste</button>
        <h1>Signalement #{s.IdSignalement}</h1>
      </header>

      <div className="admin-detail-grille">
        <section className="admin-detail-carte">
          <h2>Informations</h2>
          <dl>
            <dt>Demandeur</dt><dd>{s.NomDemandeur} (matricule {s.MatriculeDemandeur})</dd>
            <dt>Date</dt><dd>{new Date(s.DateCreation).toLocaleString('fr-FR')}</dd>
            <dt>Zone</dt><dd>{s.ZoneNom}</dd>
            <dt>Catégorie</dt><dd>{s.CategorieNom}</dd>
            <dt>Urgence</dt><dd>{s.Urgence === 'Urgent' ? <span className="admin-badge-urgent">⚠ Urgent</span> : 'Normal'}</dd>
            <dt>Description</dt><dd>{s.Description}</dd>
            <dt>Statut</dt><dd><strong>{s.Statut}</strong></dd>
            <dt>Pilote assigné</dt><dd>{s.PiloteNom || '— non assigné —'}</dd>
            <dt>Avancement</dt><dd>{s.AvancementNom || '—'}</dd>
          </dl>
        </section>

        <section className="admin-detail-carte">
          <h2>Actions</h2>

          {s.Statut === 'A_VALIDER' && (
            <div className="admin-detail-actions-validation">
              <button className="admin-btn admin-btn-valider" onClick={() => action(() => validerSignalement(id))}>✓ Valider</button>
              <button className="admin-btn admin-btn-refuser" onClick={() => setAfficherRefus(true)}>✕ Refuser</button>
            </div>
          )}

          {afficherRefus && (
            <div className="admin-detail-refus">
              <textarea placeholder="Motif du refus..." value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} />
              <button className="admin-btn admin-btn-refuser" onClick={() => action(() => refuserSignalement(id, motifRefus))}>
                Confirmer le refus
              </button>
            </div>
          )}

          <label>Assigner un pilote</label>
          <select value={s.IdPilote || ''} onChange={(e) => action(() => assignerPilote(id, e.target.value))}>
            <option value="">— Choisir —</option>
            {pilotes.map((p) => <option key={p.IdPilote} value={p.IdPilote}>{p.NomComplet} ({p.Type})</option>)}
          </select>

          <label>Avancement</label>
          <select value={s.IdAvancement || ''} onChange={(e) => action(() => changerAvancement(id, e.target.value))}>
            <option value="">— Choisir —</option>
            {avancements.map((a) => <option key={a.IdAvancement} value={a.IdAvancement}>{a.Nom}</option>)}
          </select>

          <div className="admin-detail-actions-dangereuses">
            <button className="admin-btn admin-btn-annuler" onClick={() => action(() => annulerSignalement(id))}>
              Annuler la demande
            </button>
            <button
              className="admin-btn admin-btn-supprimer"
              onClick={() => {
                if (window.confirm('Supprimer définitivement ce signalement ?')) {
                  supprimerSignalement(id).then(() => navigate('/admin/dashboard'));
                }
              }}
            >
              Supprimer définitivement
            </button>
          </div>
        </section>

        <section className="admin-detail-carte admin-detail-historique">
          <h2>Historique</h2>
          {historique.length === 0 && <p>Aucune action enregistrée.</p>}
          <ul>
            {historique.map((h) => (
              <li key={h.IdHistorique}>
                <strong>{h.Action}</strong> — {h.Auteur}
                <span className="admin-detail-histo-date">{new Date(h.DateAction).toLocaleString('fr-FR')}</span>
                {h.Commentaire && <p>{h.Commentaire}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}