import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  listerZones, creerZone, modifierZone, desactiverZone,
  listerCategories, creerCategorie, modifierCategorie, desactiverCategorie,
  listerPilotesAdmin, creerPilote, modifierPilote, desactiverPilote,
} from '../services/apiAdmin';
import './AdminReferentiels.css';

export default function AdminReferentiels() {
  const [onglet, setOnglet] = useState('zones');

  return (
    <AdminLayout titrePage="PARAMÉTRISATION">
      <div className="ref-page">
        <div className="ref-onglets">
          <button className={onglet === 'zones' ? 'actif' : ''} onClick={() => setOnglet('zones')}>Zones</button>
          <button className={onglet === 'categories' ? 'actif' : ''} onClick={() => setOnglet('categories')}>Catégories</button>
          <button className={onglet === 'pilotes' ? 'actif' : ''} onClick={() => setOnglet('pilotes')}>Intervenants</button>
        </div>

        {onglet === 'zones' && <BlocSimple titre="Zones du bâtiment" charger={listerZones} creer={creerZone} modifier={modifierZone} desactiver={desactiverZone} champId="IdZone" champNom="Nom" />}
        {onglet === 'categories' && <BlocSimple titre="Catégories de problèmes" charger={listerCategories} creer={creerCategorie} modifier={modifierCategorie} desactiver={desactiverCategorie} champId="IdCategorie" champNom="Nom" />}
        {onglet === 'pilotes' && <BlocPilotes />}
      </div>
    </AdminLayout>
  );
}

function BlocSimple({ titre, charger, creer, modifier, desactiver, champId, champNom }) {
  const [items, setItems] = useState([]);
  const [nouveauNom, setNouveauNom] = useState('');
  const [editionId, setEditionId] = useState(null);
  const [editionNom, setEditionNom] = useState('');

  useEffect(() => { rafraichir(); }, []);
  const rafraichir = async () => setItems((await charger()) || []);

  const ajouter = async () => {
    if (!nouveauNom.trim()) return;
    await creer(nouveauNom.trim());
    setNouveauNom('');
    rafraichir();
  };

  const sauverEdition = async (item) => {
    await modifier(item[champId], editionNom, item.Actif);
    setEditionId(null);
    rafraichir();
  };

  const toggleActif = async (item) => {
    await modifier(item[champId], item[champNom], item.Actif ? 0 : 1);
    rafraichir();
  };

  return (
    <div className="ref-bloc">
      <h2>{titre}</h2>

      <div className="ref-ajout">
        <input placeholder={`Nouvelle ${titre.toLowerCase()}...`} value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} />
        <button onClick={ajouter}>+ Ajouter</button>
      </div>

      <table className="ref-table">
        <thead><tr><th>Nom</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item[champId]} className={!item.Actif ? 'ref-ligne-inactive' : ''}>
              <td>
                {editionId === item[champId] ? (
                  <input value={editionNom} onChange={(e) => setEditionNom(e.target.value)} autoFocus />
                ) : (
                  item[champNom]
                )}
              </td>
              <td>
                <span className={`ref-badge ${item.Actif ? 'ref-actif' : 'ref-inactif'}`}>
                  {item.Actif ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="ref-actions">
                {editionId === item[champId] ? (
                  <button className="ref-btn-valider" onClick={() => sauverEdition(item)}>✓ OK</button>
                ) : (
                  <button className="ref-btn-modifier" onClick={() => { setEditionId(item[champId]); setEditionNom(item[champNom]); }}>✎ Modifier</button>
                )}
                <button className="ref-btn-toggle" onClick={() => toggleActif(item)}>
                  {item.Actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlocPilotes() {
  const [pilotes, setPilotes] = useState([]);
  const [nom, setNom] = useState('');
  const [type, setType] = useState('INT');
  const [editionId, setEditionId] = useState(null);
  const [editionNom, setEditionNom] = useState('');
  const [editionType, setEditionType] = useState('INT');

  useEffect(() => { rafraichir(); }, []);
  const rafraichir = async () => setPilotes((await listerPilotesAdmin()) || []);

  const ajouter = async () => {
    if (!nom.trim()) return;
    await creerPilote(nom.trim(), type);
    setNom('');
    rafraichir();
  };

  const sauverEdition = async (p) => {
    await modifierPilote(p.IdPilote, editionNom, editionType, p.Actif);
    setEditionId(null);
    rafraichir();
  };

  const toggleActif = async (p) => {
    await modifierPilote(p.IdPilote, p.NomComplet, p.Type, p.Actif ? 0 : 1);
    rafraichir();
  };

  return (
    <div className="ref-bloc">
      <h2>Intervenants (pilotes)</h2>

      <div className="ref-ajout ref-ajout-pilote">
        <input placeholder="Nom complet..." value={nom} onChange={(e) => setNom(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="INT">Interne</option>
          <option value="EXT">Externe</option>
        </select>
        <button onClick={ajouter}>+ Ajouter</button>
      </div>

      <table className="ref-table">
        <thead><tr><th>Nom</th><th>Type</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          {pilotes.map((p) => (
            <tr key={p.IdPilote} className={!p.Actif ? 'ref-ligne-inactive' : ''}>
              <td>
                {editionId === p.IdPilote ? (
                  <input value={editionNom} onChange={(e) => setEditionNom(e.target.value)} autoFocus />
                ) : p.NomComplet}
              </td>
              <td>
                {editionId === p.IdPilote ? (
                  <select value={editionType} onChange={(e) => setEditionType(e.target.value)}>
                    <option value="INT">Interne</option>
                    <option value="EXT">Externe</option>
                  </select>
                ) : (
                  <span className={`ref-badge-type ${p.Type === 'INT' ? 'type-int' : 'type-ext'}`}>{p.Type}</span>
                )}
              </td>
              <td>
                <span className={`ref-badge ${p.Actif ? 'ref-actif' : 'ref-inactif'}`}>{p.Actif ? 'Actif' : 'Inactif'}</span>
              </td>
              <td className="ref-actions">
                {editionId === p.IdPilote ? (
                  <button className="ref-btn-valider" onClick={() => sauverEdition(p)}>✓ OK</button>
                ) : (
                  <button className="ref-btn-modifier" onClick={() => { setEditionId(p.IdPilote); setEditionNom(p.NomComplet); setEditionType(p.Type); }}>✎ Modifier</button>
                )}
                <button className="ref-btn-toggle" onClick={() => toggleActif(p)}>
                  {p.Actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}