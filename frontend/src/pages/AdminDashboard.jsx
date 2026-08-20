import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recupererSignalements } from '../services/apiAdmin';
import './AdminDashboard.css';

const COULEURS_STATUT = {
  A_VALIDER: { label: 'À valider', couleur: '#d97706', fond: '#fef3e2' },
  VALIDE: { label: 'Validé', couleur: '#2563eb', fond: '#eaf1fd' },
  REFUSE: { label: 'Refusé', couleur: '#c0392b', fond: '#fdecea' },
  ANNULE: { label: 'Annulé', couleur: '#6b7280', fond: '#f1f2f3' },
};

export default function AdminDashboard() {
  const [signalements, setSignalements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtreZone, setFiltreZone] = useState('Tous');
  const [filtreStatut, setFiltreStatut] = useState('Tous');
  const navigate = useNavigate();

  const utilisateur = JSON.parse(sessionStorage.getItem('admin_utilisateur') || '{}');

  useEffect(() => { chargerSignalements(); }, []);

  const chargerSignalements = async () => {
    setChargement(true);
    const donnees = await recupererSignalements();
    setSignalements(donnees || []);
    setChargement(false);
  };

  const seDeconnecter = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_utilisateur');
    navigate('/admin');
  };

  const zonesUniques = ['Tous', ...new Set(signalements.map((s) => s.ZoneNom))];

  const signalementsFiltres = signalements.filter((s) => {
    const matchZone = filtreZone === 'Tous' || s.ZoneNom === filtreZone;
    const matchStatut = filtreStatut === 'Tous' || s.Statut === filtreStatut;
    return matchZone && matchStatut;
  });

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>BÂTIMENT SOCIAL — Back-office</h1>
        <div className="admin-header-droite">
          <span>{utilisateur.nomComplet}</span>
          <button onClick={seDeconnecter}>Déconnexion</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-filtres">
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

          <span className="admin-compteur">{signalementsFiltres.length} signalement(s)</span>
        </div>

        {chargement ? (
          <p>Chargement...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>N°</th><th>Date</th><th>Demandeur</th><th>Zone</th>
                <th>Catégorie</th><th>Urgence</th><th>Description</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {signalementsFiltres.map((s) => {
                const statutInfo = COULEURS_STATUT[s.Statut] || COULEURS_STATUT.A_VALIDER;
                return (
                  <tr
                    key={s.IdSignalement}
                    onClick={() => navigate(`/admin/signalement/${s.IdSignalement}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>#{s.IdSignalement}</td>
                    <td>{new Date(s.DateCreation).toLocaleDateString('fr-FR')}</td>
                    <td>{s.NomDemandeur}</td>
                    <td>{s.ZoneNom}</td>
                    <td>{s.CategorieNom}</td>
                    <td>{s.Urgence === 'Urgent' ? <span className="admin-badge-urgent">⚠ Urgent</span> : 'Normal'}</td>
                    <td className="admin-description-cell">{s.Description}</td>
                    <td>
                      <span className="admin-badge-statut" style={{ color: statutInfo.couleur, background: statutInfo.fond }}>
                        {statutInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}