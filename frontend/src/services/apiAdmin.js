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
export function ouvrirPdfSignalement(id) {
  const token = sessionStorage.getItem('admin_token');
  fetch(`${API_BASE_URL}/signalements/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
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
export const listerZones = () => appelAuth('/admin/zones');
export const creerZone = (nom) => appelAuth('/admin/zones', { method: 'POST', body: JSON.stringify({ nom }) });
export const modifierZone = (id, nom, actif) => appelAuth(`/admin/zones/${id}`, { method: 'PUT', body: JSON.stringify({ nom, actif }) });
export const desactiverZone = (id) => appelAuth(`/admin/zones/${id}`, { method: 'DELETE' });

export const listerCategories = () => appelAuth('/admin/categories');
export const creerCategorie = (nom) => appelAuth('/admin/categories', { method: 'POST', body: JSON.stringify({ nom }) });
export const modifierCategorie = (id, nom, actif) => appelAuth(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify({ nom, actif }) });
export const desactiverCategorie = (id) => appelAuth(`/admin/categories/${id}`, { method: 'DELETE' });

export const listerPilotesAdmin = () => appelAuth('/admin/pilotes');
export const creerPilote = (nomComplet, type) => appelAuth('/admin/pilotes', { method: 'POST', body: JSON.stringify({ nomComplet, type }) });
export const modifierPilote = (id, nomComplet, type, actif) => appelAuth(`/admin/pilotes/${id}`, { method: 'PUT', body: JSON.stringify({ nomComplet, type, actif }) });
export const desactiverPilote = (id) => appelAuth(`/admin/pilotes/${id}`, { method: 'DELETE' });