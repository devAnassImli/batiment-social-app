import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

export default function AdminLogin() {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const seConnecter = async (e) => {
    e.preventDefault();
    setChargement(true);
    setErreur('');
    try {
      const reponse = await fetch('http://localhost:5000/api/admin/connexion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant, motDePasse }),
      });
      const resultat = await reponse.json();
      if (resultat.succes) {
        sessionStorage.setItem('admin_token', resultat.token);
        sessionStorage.setItem('admin_utilisateur', JSON.stringify(resultat.utilisateur));
        navigate('/admin/dashboard');
      } else {
        setErreur(resultat.message || 'Connexion refusée');
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-carte">
        <h1>BÂTIMENT SOCIAL</h1>
        <p className="admin-login-soustitre">Back-office · Gestion des signalements</p>

        <form onSubmit={seConnecter}>
          <label>Identifiant</label>
          <input type="text" placeholder="prenom.nom" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoFocus />

          <label>Mot de passe</label>
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />

          <button type="submit" disabled={chargement}>
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>

          {erreur && <p className="admin-login-erreur">{erreur}</p>}
        </form>
      </div>
    </div>
  );
}