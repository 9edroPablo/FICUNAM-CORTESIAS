const RAW_BASE = import.meta.env.VITE_API_URL || 'https://ficunam-cortesias.onrender.com/api';
const API_BASE = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE.replace(/\/$/, '')}/api`;

const normalizeDoc = (doc) => {
  if (!doc) return doc;
  const normalized = { ...doc, id: doc._id || doc.id };
  if (normalized.screeningId && typeof normalized.screeningId === 'object') {
    normalized.screeningId = normalized.screeningId._id || normalized.screeningId.id;
  }
  return normalized;
};

export async function loginAdmin(password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Contraseña incorrecta');
  return data;
}

export async function fetchExtraVenues() {
  const res = await fetch(`${API_BASE}/venues`);
  if (!res.ok) return [];
  return res.json();
}

export async function createExtraVenue(payload) {
  const res = await fetch(`${API_BASE}/venues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar sala extra');
  return data;
}

export async function fetchScreenings() {
  const res = await fetch(`${API_BASE}/screenings`);
  if (!res.ok) throw new Error('Error al cargar funciones del servidor');
  const data = await res.json();
  return data.map(normalizeDoc);
}

export async function createScreening(payload) {
  const res = await fetch(`${API_BASE}/screenings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar función');
  return normalizeDoc(data);
}

export async function bulkCreateScreenings(items) {
  const res = await fetch(`${API_BASE}/screenings/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al importar funciones desde Excel');
  return data.map(normalizeDoc);
}

export async function removeScreening(id) {
  const res = await fetch(`${API_BASE}/screenings/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Error al eliminar la función');
  return res.json();
}

export async function fetchCourtesies() {
  const res = await fetch(`${API_BASE}/courtesies`);
  if (!res.ok) throw new Error('Error al cargar cortesías del servidor');
  const data = await res.json();
  return data.map(normalizeDoc);
}

export async function createCourtesy(payload) {
  const res = await fetch(`${API_BASE}/courtesies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al enviar cortesía');
  return {
    ...data,
    courtesy: normalizeDoc(data.courtesy)
  };
}

export async function createPublicRequest(payload) {
  const res = await fetch(`${API_BASE}/public/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar solicitud');
  return {
    ...data,
    courtesy: normalizeDoc(data.courtesy)
  };
}

export async function approvePublicRequest(id) {
  const res = await fetch(`${API_BASE}/courtesies/${id}/aprobar`, {
    method: 'PATCH'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al aprobar solicitud');
  return {
    ...data,
    courtesy: normalizeDoc(data.courtesy)
  };
}

export async function rejectPublicRequest(id) {
  const res = await fetch(`${API_BASE}/courtesies/${id}/denegar`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Error al denegar solicitud');
  return res.json();
}

export async function verifyCourtesyToken(token) {
  const res = await fetch(`${API_BASE}/courtesies/verify/${token}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invitación no encontrada');
  return data;
}

export async function acceptCourtesyByToken(token) {
  const res = await fetch(`${API_BASE}/courtesies/accept/${token}`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo aceptar la invitación');
  return {
    ...data,
    courtesy: normalizeDoc(data.courtesy)
  };
}

export async function toggleCourtesyDelivered(id) {
  const res = await fetch(`${API_BASE}/courtesies/${id}/deliver`, {
    method: 'PATCH'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar entrega');
  return normalizeDoc(data);
}

export async function resetAllDatabase(masterPin) {
  const res = await fetch(`${API_BASE}/dev/reset-all`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ masterPin })
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo reiniciar la base de datos');
  return data;
}