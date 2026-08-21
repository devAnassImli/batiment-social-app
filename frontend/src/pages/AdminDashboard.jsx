import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  recupererSignalements, recupererSignalement, validerSignalement, refuserSignalement,
  annulerSignalement, supprimerSignalement, changerAvancement, assignerPilote,
  recupererAvancements, recupererPilotes, ouvrirPdfSignalement,
} from '../services/apiAdmin';
import './AdminDashboard.css';

const COULEURS_STATUT = {
  A_VALIDER: { label: 'À valider', couleur: '#d97706', fond: '#fef3e2' },
  VALIDE: { label: 'Validé', couleur: '#2563eb', fond: '#eaf1fd' },
  REFUSE: { label: 'Refusé', couleur: '#c0392b', fond: '#fdecea' },
  ANNULE: { label: 'Annulé', couleur: '#6b7280', fond: '#f1f2f3' },
};

export default function AdminDashboard() {
  const [signalements, setSignalements] = useState([]);
  const [idSelectionne, setIdSelectionne] = useState(null);
  const [detail, setDetail] = useState(null);
  const [avancements, setAvancements] = useState([]);
  const [pilotes, setPilotes] = useState([]);
  const [motifRefus, setMotifRefus] = useState('');
  const [afficherRefus, setAfficherRefus] = useState(false);
  const [filtreZone, setFiltreZone] = useState('Tous');
  const [filtreStatut, setFiltreStatut] = useState('Tous');

  useEffect(() => { chargerListe(); chargerReferences(); }, []);
  useEffect(() => { if (idSelectionne) chargerDetail(idSelectionne); }, [idSelectionne]);

  const chargerListe = async () => setSignalements((await recupererSignalements()) || []);
  const chargerReferences = async () => {
    setAvancements((await recupererAvancements()) || []);
    setPilotes((await recupererPilotes()) || []);
  };
  const chargerDetail = async (id) => setDetail(await recupererSignalement(id));

  const action = async (fn) => {
    await fn();
    chargerListe();
    if (idSelectionne) chargerDetail(idSelectionne);
  };

  const zonesUniques = ['Tous', ...new Set(signalements.map((s) => s.ZoneNom))];
  const signalementsFiltres = signalements.filter((s) =>
    (filtreZone === 'Tous' || s.ZoneNom === filtreZone) &&
    (filtreStatut === 'Tous' || s.Statut === filtreStatut)
  );

  return (
    <AdminLayout titrePage="SUIVI GLOBAL DES DEMANDES">
      <div className="dash-page">

        <div className="dash-filtres">
          <select value={filtreZone} onChange={(e) => setFiltreZone(e.target.value)}>
            {zonesUniques.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
            <option value="Tous">Tous les statuts</option>
            <option value="A_VALIDER">À valider</option>
            <option value="VALIDE">Validé</option>
            <option value="REFUSE">Refusé</option>
            <option value="ANNULE">Annulé</option>
          </select>
          <span className="dash-compteur">{signalementsFiltres.length} demande(s)</span>
        </div>

        <div className="dash-split">
          <div className="dash-table-conteneur">
            <table className="dash-table">
              <thead>
                <tr>
                  <th></th><th>N°</th><th>Date</th><th>Demandeur</th><th>Zone</th><th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {signalementsFiltres.length === 0 && (
                  <tr><td colSpan="6" className="dash-table-vide">Aucune demande pour le moment.</td></tr>
                )}
                {signalementsFiltres.map((s) => {
                  const info = COULEURS_STATUT[s.Statut] || COULEURS_STATUT.A_VALIDER;
                  return (
                    <tr key={s.IdSignalement} className={idSelectionne === s.IdSignalement ? 'dash-ligne-active' : ''}>
                      <td>
                        <button className="dash-sel" onClick={() => setIdSelectionne(s.IdSignalement)}>SEL</button>
                      </td>
                      <td>#{s.IdSignalement}</td>
                      <td>{new Date(s.DateCreation).toLocaleDateString('fr-FR')}</td>
                      <td>{s.NomDemandeur}</td>
                      <td>{s.ZoneNom}</td>
                      <td><span className="dash-badge" style={{ color: info.couleur, background: info.fond }}>{info.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dash-panneau">
            {!detail && <p className="dash-panneau-vide">Sélectionnez une ligne avec « SEL » pour voir le détail.</p>}

            {detail && (() => {
              const s = detail.signalement;
              const historique = detail.historique;
              return (
                <>
                  <div className="dash-panneau-entete">
                    <h2>Signalement #{s.IdSignalement}</h2>
                    <button className="dash-btn-pdf" onClick={() => ouvrirPdfSignalement(s.IdSignalement)}>Imprimer / PDF</button>
                  </div>

                  <dl className="dash-infos">
                    <dt>Demandeur</dt><dd>{s.NomDemandeur} (matricule {s.MatriculeDemandeur})</dd>
                    <dt>Zone</dt><dd>{s.ZoneNom}</dd>
                    <dt>Catégorie</dt><dd>{s.CategorieNom}</dd>
                    <dt>Urgence</dt><dd>{s.Urgence === 'Urgent' ? <span className="dash-urgent">⚠ Urgent</span> : 'Normal'}</dd>
                    <dt>Description</dt><dd>{s.Description}</dd>
                    <dt>Statut</dt><dd><strong>{s.Statut}</strong></dd>
                  </dl>

                  {s.Statut === 'A_VALIDER' && (
                    <div className="dash-actions-validation">
                      <button className="dash-btn dash-btn-valider" onClick={() => action(() => validerSignalement(s.IdSignalement))}>✓ Valider</button>
                      <button className="dash-btn dash-btn-refuser" onClick={() => setAfficherRefus(true)}>✕ Refuser</button>
                    </div>
                  )}

                  {afficherRefus && (
                    <div className="dash-refus">
                      <textarea placeholder="Motif du refus..." value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} />
                      <button className="dash-btn dash-btn-refuser" onClick={() => { action(() => refuserSignalement(s.IdSignalement, motifRefus)); setAfficherRefus(false); }}>
                        Confirmer le refus
                      </button>
                    </div>
                  )}

                  <label>Assigner un intervenant</label>
                  <select value={s.IdPilote || ''} onChange={(e) => action(() => assignerPilote(s.IdSignalement, e.target.value))}>
                    <option value="">— Choisir —</option>
                    {pilotes.length === 0 && <option disabled>Aucun intervenant enregistré</option>}
                    {pilotes.map((p) => <option key={p.IdPilote} value={p.IdPilote}>{p.NomComplet} ({p.Type})</option>)}
                  </select>

                  <label>Avancement</label>
                  <select value={s.IdAvancement || ''} onChange={(e) => action(() => changerAvancement(s.IdSignalement, e.target.value))}>
                    <option value="">— Choisir —</option>
                    {avancements.map((a) => <option key={a.IdAvancement} value={a.IdAvancement}>{a.Nom}</option>)}
                  </select>

                  <div className="dash-actions-dangereuses">
                    <button className="dash-btn dash-btn-annuler" onClick={() => action(() => annulerSignalement(s.IdSignalement))}>Annuler</button>
                    <button
                      className="dash-btn dash-btn-supprimer"
                      onClick={() => { if (window.confirm('Supprimer définitivement ?')) { supprimerSignalement(s.IdSignalement).then(() => { setIdSelectionne(null); setDetail(null); chargerListe(); }); } }}
                    >
                      Supprimer
                    </button>
                  </div>

                  <h3 className="dash-histo-titre">Historique</h3>
                  <ul className="dash-histo-liste">
                    {historique.map((h) => (
                      <li key={h.IdHistorique}>
                        <strong>{h.Action}</strong> — {h.Auteur}
                        <span>{new Date(h.DateAction).toLocaleString('fr-FR')}</span>
                        {h.Commentaire && <p>{h.Commentaire}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}