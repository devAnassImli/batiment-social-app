
const API_BASE_URL = import.meta.env.VITE_API_URL;

export async function verifierMatricule(matricule) {
  const reponse = await fetch(`${API_BASE_URL}/employe/${matricule}`);
  const donnees = await reponse.json();
  return { ok: reponse.ok, donnees };
}

export async function envoyerSignalement(donnees) {
  const reponse = await fetch(`${API_BASE_URL}/signalements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(donnees),
  });
  const resultat = await reponse.json();
  return { ok: reponse.ok, resultat };
}
export async function recupererMesSignalements(matricule, dateDebut, dateFin) {
  const params = new URLSearchParams();
  if (dateDebut) params.set('dateDebut', dateDebut);
  if (dateFin) params.set('dateFin', dateFin);
  const reponse = await fetch(`${API_BASE_URL}/mes-signalements/${matricule}?${params}`);
  return reponse.json();
}

export async function supprimerSignalement(id, matricule) {
  const reponse = await fetch(`${API_BASE_URL}/mes-signalements/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricule }),
  });
  return reponse.json();
}

export async function modifierSignalement(id, matricule, description) {
  const reponse = await fetch(`${API_BASE_URL}/mes-signalements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricule, description }),
  });
  return reponse.json();
}

export async function validerSignalement(id, matricule) {
  const reponse = await fetch(`${API_BASE_URL}/mes-signalements/${id}/valider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricule }),
  });
  return reponse.json();
}