import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { recupererStatistiques } from '../services/apiAdmin';
import './AdminStatistiques.css';

const COULEURS_STATUT = {
  A_VALIDER: { label: 'À valider', couleur: '#d97706' },
  VALIDE: { label: 'Validé', couleur: '#2563eb' },
  REFUSE: { label: 'Refusé', couleur: '#c0392b' },
  ANNULE: { label: 'Annulé', couleur: '#6b7280' },
};

export default function AdminStatistiques() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    recupererStatistiques().then(setStats);
  }, []);

  if (!stats) return (
    <AdminLayout titrePage="STATISTIQUES">
      <div className="stat-page"><p>Chargement...</p></div>
    </AdminLayout>
  );

  const maxZone = Math.max(1, ...stats.parZone.map((z) => z.n));
  const maxCategorie = Math.max(1, ...stats.parCategorie.map((c) => c.n));

  return (
    <AdminLayout titrePage="STATISTIQUES">
      <div className="stat-page">

        <div className="stat-cartes">
          <div className="stat-carte">
            <span className="stat-carte-nombre">{stats.total}</span>
            <span className="stat-carte-label">Total des demandes</span>
          </div>
          <div className="stat-carte stat-carte-attente">
            <span className="stat-carte-nombre">{stats.enAttente}</span>
            <span className="stat-carte-label">En attente de validation</span>
          </div>
          <div className="stat-carte stat-carte-urgent">
            <span className="stat-carte-nombre">{stats.urgents}</span>
            <span className="stat-carte-label">Signalements urgents</span>
          </div>
        </div>

        <div className="stat-split">
          <div className="stat-bloc">
            <h2>Répartition par statut</h2>
            <div className="stat-repartition-statut">
              {stats.parStatut.map((s) => {
                const info = COULEURS_STATUT[s.Statut] || { label: s.Statut, couleur: '#999' };
                const pourcentage = stats.total ? Math.round((s.n / stats.total) * 100) : 0;
                return (
                  <div key={s.Statut} className="stat-ligne-statut">
                    <span className="stat-ligne-label">{info.label}</span>
                    <div className="stat-barre-fond">
                      <div className="stat-barre" style={{ width: `${pourcentage}%`, background: info.couleur }} />
                    </div>
                    <span className="stat-ligne-valeur">{s.n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="stat-bloc">
            <h2>Demandes par zone</h2>
            <div className="stat-barres-verticales">
              {stats.parZone.map((z) => (
                <div key={z.zone} className="stat-barre-verticale-conteneur">
                  <div className="stat-barre-verticale-valeur">{z.n}</div>
                  <div className="stat-barre-verticale-fond">
                    <div className="stat-barre-verticale" style={{ height: `${(z.n / maxZone) * 100}%` }} />
                  </div>
                  <span className="stat-barre-verticale-label">{z.zone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stat-split">
          <div className="stat-bloc">
            <h2>Par catégorie</h2>
            <div className="stat-repartition-statut">
              {stats.parCategorie.map((c) => {
                const pourcentage = Math.round((c.n / maxCategorie) * 100);
                return (
                  <div key={c.categorie} className="stat-ligne-statut">
                    <span className="stat-ligne-label">{c.categorie}</span>
                    <div className="stat-barre-fond">
                      <div className="stat-barre" style={{ width: `${pourcentage}%`, background: 'var(--couleur-teal-600)' }} />
                    </div>
                    <span className="stat-ligne-valeur">{c.n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="stat-bloc">
            <h2>Dernières demandes</h2>
            <ul className="stat-dernieres">
              {stats.dernieres.map((d) => (
                <li key={d.IdSignalement} onClick={() => navigate('/admin/dashboard')}>
                  <span className="stat-dernieres-id">#{d.IdSignalement}</span>
                  <span className="stat-dernieres-demandeur">{d.NomDemandeur}</span>
                  <span className="stat-dernieres-zone">{d.ZoneNom}</span>
                  <span className="stat-dernieres-date">{new Date(d.DateCreation).toLocaleDateString('fr-FR')}</span>
                </li>
              ))}
              {stats.dernieres.length === 0 && <li className="stat-dernieres-vide">Aucune demande pour le moment.</li>}
            </ul>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}