import { useState, useEffect } from 'react';
import { recupererMesSignalements } from '../services/api';
import './MesSignalements.css';

const COULEURS_STATUT = {
  A_VALIDER: { label: 'En attente', couleur: '#d97706', fond: '#fef3e2' },
  VALIDE: { label: 'Validé', couleur: '#2563eb', fond: '#eaf1fd' },
  REFUSE: { label: 'Refusé', couleur: '#c0392b', fond: '#fdecea' },
  ANNULE: { label: 'Annulé', couleur: '#6b7280', fond: '#f1f2f3' },
};

export default function MesSignalements({ employe, onRetour }) {
  const [liste, setListe] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    recupererMesSignalements(employe.Matricola?.trim()).then((d) => {
      setListe(d || []);
      setChargement(false);
    });
  }, []);

  return (
    <main className="mes-page">
      <div className="mes-carte">
        <h2>Mes demandes</h2>

        {chargement && <p className="mes-vide">Chargement...</p>}
        {!chargement && liste.length === 0 && <p className="mes-vide">Vous n'avez encore fait aucun signalement.</p>}

        <div className="mes-liste">
          {liste.map((s) => {
            const info = COULEURS_STATUT[s.Statut] || COULEURS_STATUT.A_VALIDER;
            return (
              <div key={s.IdSignalement} className="mes-item">
                <div className="mes-item-haut">
                  <span className="mes-item-zone">{s.ZoneNom}</span>
                  <span className="mes-item-badge" style={{ color: info.couleur, background: info.fond }}>
                    {info.label}
                  </span>
                </div>
                <p className="mes-item-desc">{s.Description}</p>
                <div className="mes-item-bas">
                  <span>{new Date(s.DateCreation).toLocaleDateString('fr-FR')}</span>
                  {s.AvancementNom && <span>· {s.AvancementNom}</span>}
                  {s.Urgence === 'Urgent' && <span className="mes-item-urgent">⚠ Urgent</span>}
                </div>
              </div>
            );
          })}
        </div>

        <button className="mes-retour" onClick={onRetour}>← Retour à l'accueil</button>
      </div>
    </main>
  );
}