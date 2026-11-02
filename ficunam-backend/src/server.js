require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const Screening = require('./models/Screening');
const Courtesy = require('./models/Courtesy');
const Venue = require('./models/Venue');
const { sendInvitationEmail, SALAS_MAP } = require('./services/mailer');

const app = express();
app.use(cors());
app.use(express.json());

// Salas predeterminadas de FICUNAM
const DEFAULT_SALAS = [
  { id: 'julio-bracho', nombre: 'Sala Julio Bracho (CCU)', sede: 'CCU UNAM', capacidad: 160 },
  { id: 'jose-revueltas', nombre: 'Sala José Revueltas (CCU)', sede: 'CCU UNAM', capacidad: 60 },
  { id: 'carlos-monsivais', nombre: 'Sala Carlos Monsiváis (CCU)', sede: 'CCU UNAM', capacidad: 52 },
  { id: 'cineteca-nacional', nombre: 'Cineteca Nacional', sede: 'Cineteca', capacidad: 200 },
  { id: 'cine-tonala', nombre: 'Cine Tonalá', sede: 'Roma Sur', capacidad: 80 },
  { id: 'casa-del-lago', nombre: 'Casa del Lago UNAM', sede: 'Chapultepec', capacidad: 100 },
  { id: 'cinematografo-del-chopo', nombre: 'Cinematógrafo del Chopo', sede: 'Santa María la Ribera', capacidad: 110 }
];

// ==========================================
// 1. AUTENTICACIÓN DE ADMINISTRADOR (Punto 6)
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ficunam2026';

  if (password === adminPassword) {
    return res.json({ ok: true, token: 'ficunam-admin-session-ok' });
  }
  return res.status(401).json({ ok: false, error: 'Contraseña incorrecta' });
});

// ==========================================
// 2. GESTIÓN DE SALAS Y SALAS EXTRA (Punto 4)
// ==========================================
app.get('/api/salas', async (req, res) => {
  try {
    const extraSalas = await Venue.find().sort({ createdAt: 1 });
    const todasLasSalas = [
      ...DEFAULT_SALAS,
      ...extraSalas.map(v => ({
        id: v.id,
        nombre: v.nombre,
        sede: v.sede,
        capacidad: v.capacidad,
        esExtra: true,
        _id: v._id
      }))
    ];
    res.json(todasLasSalas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/venues', async (req, res) => {
  try {
    const extraSalas = await Venue.find().sort({ createdAt: 1 });
    res.json(extraSalas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/venues', async (req, res) => {
  try {
    const { nombre, sede, capacidad } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre de la sala es obligatorio' });

    const slugId = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

    const nuevaSala = await Venue.create({
      id: slugId,
      nombre: nombre.trim(),
      sede: sede || 'Sede Extra',
      capacidad: Number(capacidad) || 100
    });

    res.status(201).json(nuevaSala);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. FUNCIONES Y EVENTOS (Puntos 2 y 3)
// ==========================================
app.get('/api/screenings', async (req, res) => {
  try {
    const screenings = await Screening.find().sort({ fecha: 1, hora: 1 });
    res.json(screenings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/screenings', async (req, res) => {
  try {
    const { tipo, pelicula, director, sala, fecha, hora, fechaLimiteConfirmacion, limiteCortesias } = req.body;
    const nuevaFuncion = await Screening.create({
      tipo: tipo || 'pelicula',
      pelicula,
      director: tipo === 'evento' ? '' : (director || ''),
      sala,
      fecha,
      hora,
      fechaLimiteConfirmacion: fechaLimiteConfirmacion || '',
      limiteCortesias: Number(limiteCortesias) || 50
    });
    res.status(201).json(nuevaFuncion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/screenings/:id', async (req, res) => {
  try {
    const actualizada = await Screening.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(actualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/screenings/:id', async (req, res) => {
  try {
    await Screening.findByIdAndDelete(req.params.id);
    await Courtesy.deleteMany({ screeningId: req.params.id });
    res.json({ ok: true, message: 'Función y sus cortesías eliminadas' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. CORTESÍAS Y SOLICITUDES PÚBLICAS (Puntos 1 y 2)
// ==========================================

// Obtener todas las cortesías y solicitudes (con los datos de su función/evento)
app.get('/api/courtesies', async (req, res) => {
  try {
    const courtesies = await Courtesy.find()
      .populate('screeningId')
      .sort({ createdAt: -1 });
    res.json(courtesies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear cortesía directa desde el Admin (Aprobada de inmediato + Envía correo + Revisa límite sin bloquear)
app.post('/api/courtesies', async (req, res) => {
  try {
    const { nombre, correo, empresa, categoria, screeningId } = req.body;
    const screening = await Screening.findById(screeningId);
    if (!screening) return res.status(404).json({ error: 'Función o evento no encontrado' });

    const aprobadasCount = await Courtesy.countDocuments({
      screeningId,
      estadoSolicitud: 'aprobada'
    });

    const token = crypto.randomBytes(16).toString('hex');
    const nuevaCortesia = await Courtesy.create({
      nombre,
      correo,
      empresa: empresa || '',
      categoria: categoria || 'Invitado Especial',
      screeningId,
      estadoSolicitud: 'aprobada',
      estado: 'pendiente',
      token
    });

    let emailWarning = null;
    try {
      await sendInvitationEmail(nuevaCortesia, screening);
      nuevaCortesia.emailEnviado = true;
      await nuevaCortesia.save();
    } catch (mailErr) {
      console.error('Advertencia: Se guardó en BD pero falló el envío SMTP:', mailErr.message);
      emailWarning = mailErr.message;
    }

    const nuevoTotal = aprobadasCount + 1;
    const limiteSuperado = nuevoTotal >= (screening.limiteCortesias || 50);

    const poblada = await Courtesy.findById(nuevaCortesia._id).populate('screeningId');
    res.status(201).json({
      courtesy: poblada,
      emailWarning,
      limiteSuperado,
      cupoActual: nuevoTotal,
      limiteCortesias: screening.limiteCortesias || 50
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUNTO 1A: Solicitud enviada por el público (Queda pendiente, NO envía correo aún)
app.post('/api/public/solicitar', async (req, res) => {
  try {
    const { nombre, correo, empresa, categoria, screeningId } = req.body;
    const screening = await Screening.findById(screeningId);
    if (!screening) return res.status(404).json({ error: 'La función o evento seleccionado no existe' });

    const token = crypto.randomBytes(16).toString('hex');
    const solicitud = await Courtesy.create({
      nombre,
      correo,
      empresa: empresa || '',
      categoria: categoria || 'Solicitud Pública',
      screeningId,
      estadoSolicitud: 'solicitud_pendiente',
      estado: 'pendiente',
      token
    });

    res.status(201).json({
      ok: true,
      message: 'Tu solicitud ha sido enviada correctamente. Si es aprobada, recibirás tu invitación por correo.',
      data: solicitud
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUNTO 1B: Aprobar solicitud desde el Admin (Pasa a 'aprobada' y envía correo por Brevo)
app.patch('/api/courtesies/:id/aprobar', async (req, res) => {
  try {
    const courtesy = await Courtesy.findById(req.params.id);
    if (!courtesy) return res.status(404).json({ error: 'Solicitud no encontrada' });

    courtesy.estadoSolicitud = 'aprobada';
    const screening = await Screening.findById(courtesy.screeningId);

    let emailWarning = null;
    if (screening) {
      try {
        await sendInvitationEmail(courtesy, screening);
        courtesy.emailEnviado = true;
      } catch (mailErr) {
        console.error('Error enviando correo al aprobar solicitud:', mailErr.message);
        emailWarning = mailErr.message;
      }
    }

    await courtesy.save();
    const poblada = await Courtesy.findById(courtesy._id).populate('screeningId');
    res.json({ ok: true, courtesy: poblada, emailWarning });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUNTO 1C: Denegar solicitud o eliminar cortesía (Desaparece sin enviar correo)
app.delete('/api/courtesies/:id/denegar', async (req, res) => {
  try {
    await Courtesy.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: 'Solicitud denegada y eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courtesies/:id', async (req, res) => {
  try {
    await Courtesy.findByIdAndDelete(req.params.id);
    res.json({ ok: true, message: 'Cortesía eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. CONFIRMACIÓN DE ASISTENCIA POR INVITADO
// ==========================================
app.get('/api/confirm/:token', async (req, res) => {
  try {
    const courtesy = await Courtesy.findOne({ token: req.params.token }).populate('screeningId');
    if (!courtesy) return res.status(404).json({ error: 'Invitación no válida o no encontrada' });
    res.json(courtesy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/confirm/:token', async (req, res) => {
  try {
    const { respuesta } = req.body; // 'confirmada' o 'declinada'
    const courtesy = await Courtesy.findOne({ token: req.params.token }).populate('screeningId');
    if (!courtesy) return res.status(404).json({ error: 'Invitación no encontrada' });

    courtesy.estado = respuesta === 'declinada' ? 'declinada' : 'confirmada';
    await courtesy.save();

    res.json({ ok: true, courtesy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CONEXIÓN A MONGODB E INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ficunam_cortesias';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB (ficunam_cortesias)');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Backend FICUNAM corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error conectando a MongoDB:', err.message);
  });