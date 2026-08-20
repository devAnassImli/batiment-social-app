const API_BASE_URL = 'http://localhost:5000/api';

function enteteAuth() {
  const token = sessionStorage.getItem('admin_token');
  return { Authorization: `Bearer ${token}` };
}

async function appelAuth(url, options = {}) {
  const reponse = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: { ...enteteAuth(), 'Content-Type': 'application/json', ...options.headers },
  });
  if (reponse.status === 401) {
    sessionStorage.removeItem('admin_token');
    window.location.href = '/admin';
    return null;
  }
  return reponse.json();
}

export const recupererSignalements = () => appelAuth('/signalements');
export const recupererSignalement = (id) => appelAuth(`/signalements/${id}`);
export const validerSignalement = (id) => appelAuth(`/signalements/${id}/valider`, { method: 'POST' });
export const refuserSignalement = (id, motif) => appelAuth(`/signalements/${id}/refuser`, { method: 'POST', body: JSON.stringify({ motif }) });
export const annulerSignalement = (id) => appelAuth(`/signalements/${id}/annuler`, { method: 'POST' });
export const supprimerSignalement = (id) => appelAuth(`/signalements/${id}`, { method: 'DELETE' });
export const changerAvancement = (id, idAvancement) => appelAuth(`/signalements/${id}/avancement`, { method: 'POST', body: JSON.stringify({ idAvancement }) });
export const assignerPilote = (id, idPilote) => appelAuth(`/signalements/${id}/pilote`, { method: 'POST', body: JSON.stringify({ idPilote }) });
export const recupererAvancements = () => appelAuth('/reference/avancement');
export const recupererPilotes = () => appelAuth('/reference/pilotes');