import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoRiva from '../assets/logo-riva.png';
import logoSam from '../assets/logo-sam.png';
import './AdminLogin.css';

export default function AdminLogin() {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  const seConnecter = async (e) => {
    e.preventDefault();
    setChargement(true);
    setErreur('');
    try {
      const reponse = await fetch('http://10.165.150.21:5000/api/admin/connexion', {
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
    <div className="al2-page">
      <div className="al2-logos">
        <img src={logoRiva} alt="RIVA" />
        <img src={logoSam} alt="SAM Montereau" />
      </div>

      <div className="al2-banniere">
        <h1>BÂTIMENT SOCIAL</h1>
      </div>

      <div className="al2-encadre-exterieur">
        <p className="al2-instruction">
          entrez votre nom d'utilisateur et votre mot de passe pour le domaine SAM Montereau
        </p>

        <div className="al2-encadre-gris">
          <form onSubmit={seConnecter}>
            <div className="al2-champ">
              <label>Nom d'utilisateur :</label>
              <span className="al2-icone">👤</span>
              <input
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                autoFocus
              />
            </div>

            <div className="al2-champ">
              <label>Mot de passe :</label>
              <span className="al2-icone">🔒</span>
              <input
                type={voirMdp ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
              <button type="button" className="al2-oeil" onClick={() => setVoirMdp(!voirMdp)}>👁</button>
            </div>

            <button type="submit" className="al2-ok" disabled={chargement}>
              {chargement ? '...' : 'OK'}
            </button>

            {erreur && <p className="al2-erreur">{erreur}</p>}
          </form>
        </div>
      </div>

      <footer className="al2-pied">
        Groupe Riva — Usine SAM Montereau — France — Version 1.0 React/Node.js — 🔒 JWT
        <br />
        <a href="#">Mentions légales et protection des données (RGPD)</a>
      </footer>
    </div>
  );
}