const API_BASE_URL = 'http://localhost:5000/api';

export async function verifierMatricule(matricule) {
  const reponse = await fetch(`${API_BASE_URL}/employe/${matricule}`);
  const donnees = await reponse.json();
  return { ok: reponse.ok, donnees };
}