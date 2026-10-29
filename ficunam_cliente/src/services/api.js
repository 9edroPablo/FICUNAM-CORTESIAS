const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const normalizeDoc = (doc) => {
  if (!doc) return doc;
  const normalized = { ...doc, id: doc._id || doc.id };
  if (normalized.screeningId && typeof normalized.screeningId === 'object') {
    normalized.screeningId = normalized.screeningId._id || normalized.screeningId.id;
  }
  return normalized;
};

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
