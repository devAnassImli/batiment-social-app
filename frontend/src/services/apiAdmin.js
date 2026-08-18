const API_BASE_URL = 'http://localhost:5000/api';

function enteteAuth() {
  const token = sessionStorage.getItem('admin_token');
  return { Authorization: `Bearer ${token}` };
}

export async function recupererSignalements() {
  const reponse = await fetch(`${API_BASE_URL}/signalements`, {
    headers: enteteAuth(),
  });
  if (reponse.status === 401) {
    sessionStorage.removeItem('admin_token');
    window.location.href = '/admin';
    return [];
  }
  return reponse.json();
}