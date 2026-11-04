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

// 1. Login de Administrador (Punto 6)
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ficunam2026';
  if (password === adminPassword) {
    return res.json({ ok: true, token: 'ficunam-admin-ok' });
  }
  return res.status(401).json({ ok: false, error: 'Contraseña incorrecta' });
});

// 2. Salas Extra (Punto 4)
app.get('/api/venues', async (req, res) => {
  try {
    const venues = await Venue.find().sort({ createdAt: 1 });
    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/venues', async (req, res) => {
  try {
    const { nombre, sede, aforo, tipo } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre de la sala es obligatorio' });

    const slugId = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-3);

    const esLibre = tipo === 'libre' || !aforo || Number(aforo) <= 0;
    const nuevaSala = await Venue.create({
      id: slugId,
      nombre: nombre.trim(),
      sede: sede || 'Centro Cultural Universitario UNAM',
      aforo: esLibre ? null : Number(aforo),
      tipo: esLibre ? 'libre' : 'fijo',
      descripcion: esLibre ? 'Aire libre, sin aforo fijo' : `Aforo máximo: ${Number(aforo)} butacas`
    });
    res.status(201).json(nuevaSala);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Funciones y Eventos (Puntos 2 y 3)
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
    const { tipo, pelicula, director, seccion, salaId, sala, fecha, hora, limiteCortesias } = req.body;
    const esEvento = tipo === 'evento';
    const created = await Screening.create({
      tipo: esEvento ? 'evento' : 'pelicula',
      pelicula: pelicula.trim(),
      director: esEvento ? '' : (director || '').trim(),
      seccion: seccion || (esEvento ? 'EVENTO ESPECIAL' : 'SELECCIÓN OFICIAL'),
      salaId: salaId || sala || 'covarrubias',
      fecha,
      hora,
      limiteCortesias: limiteCortesias ? Number(limiteCortesias) : null
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Importación masiva de funciones desde Excel
app.post('/api/screenings/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No se enviaron funciones válidas para importar' });
    }

    const docsToInsert = items.map((item) => {
      const esEvento = item.tipo === 'evento';
      return {
        tipo: esEvento ? 'evento' : 'pelicula',
        pelicula: (item.pelicula || '').trim(),
        director: esEvento ? '' : (item.director || '').trim(),
        seccion: esEvento ? 'EVENTO ESPECIAL' : 'SELECCIÓN OFICIAL',
        salaId: item.salaId || 'covarrubias',
        fecha: item.fecha,
        hora: item.hora,
        limiteCortesias: Number(item.limiteCortesias) || 50
      };
    });

    const created = await Screening.insertMany(docsToInsert);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/screenings/:id', async (req, res) => {
  try {
    await Screening.findByIdAndDelete(req.params.id);
    await Courtesy.deleteMany({ screeningId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Cortesías y Solicitudes Públicas (Puntos 1 y 2)
app.get('/api/courtesies', async (req, res) => {
  try {
    const courtesies = await Courtesy.find().sort({ createdAt: -1 });
    res.json(courtesies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courtesies', async (req, res) => {
  try {
    const { nombre, correo, empresa, categoria, screeningId } = req.body;
    const screening = await Screening.findById(screeningId);
    if (!screening) return res.status(404).json({ error: 'Función no encontrada' });

    const extraSala = await Venue.findOne({ id: screening.salaId });
    const salaNombre = extraSala ? extraSala.nombre : (SALAS_MAP[screening.salaId] || screening.salaId);

    const token = crypto.randomBytes(16).toString('hex');
    const frontendUrl = (process.env.FRONTEND_URL || 'https://ficunam-cortesiass.vercel.app').replace(/\/$/, '');
    const confirmUrl = `${frontendUrl}/confirmar/${token}`;

    const nueva = await Courtesy.create({
      nombre,
      correo,
      empresa: empresa || categoria || 'Invitados',
      categoria: categoria || 'Invitados',
      screeningId,
      estadoSolicitud: 'aprobada',
      estado: 'pendiente',
      entregado: false,
      token,
      fechaEnvio: new Date().toISOString()
    });

    let emailEnviado = false;
    try {
      await sendInvitationEmail(nueva, screening, salaNombre);
      nueva.emailEnviado = true;
      emailEnviado = true;
      await nueva.save();
    } catch (mailErr) {
      console.error('Error Brevo:', mailErr.message);
    }

    res.status(201).json({ courtesy: nueva, emailEnviado, confirmUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Solicitud desde portal público (/solicitar) - NO envía correo hasta que el admin apruebe
app.post('/api/public/solicitar', async (req, res) => {
  try {
    const { nombre, correo, empresa, categoria, screeningId } = req.body;
    const screening = await Screening.findById(screeningId);
    if (!screening) return res.status(404).json({ error: 'Función o evento no encontrado' });

    const token = crypto.randomBytes(16).toString('hex');
    const solicitud = await Courtesy.create({
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      empresa: (empresa || 'Solicitud Pública').trim(),
      categoria: categoria || 'Invitados',
      screeningId,
      estadoSolicitud: 'solicitud_pendiente',
      estado: 'pendiente',
      entregado: false,
      token,
      fechaEnvio: new Date().toISOString()
    });

    res.status(201).json({ ok: true, courtesy: solicitud });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aprobar solicitud pública -> Cambia a 'aprobada' y envía correo por Brevo
app.patch('/api/courtesies/:id/aprobar', async (req, res) => {
  try {
    const courtesy = await Courtesy.findById(req.params.id);
    if (!courtesy) return res.status(404).json({ error: 'Solicitud no encontrada' });

    courtesy.estadoSolicitud = 'aprobada';
    courtesy.fechaEnvio = new Date().toISOString();

    const screening = await Screening.findById(courtesy.screeningId);
    let emailEnviado = false;
    if (screening) {
      const extraSala = await Venue.findOne({ id: screening.salaId });
      const salaNombre = extraSala ? extraSala.nombre : (SALAS_MAP[screening.salaId] || screening.salaId);
      try {
        await sendInvitationEmail(courtesy, screening, salaNombre);
        courtesy.emailEnviado = true;
        emailEnviado = true;
      } catch (mailErr) {
        console.error('Error Brevo al aprobar:', mailErr.message);
      }
    }

    await courtesy.save();
    res.json({ ok: true, courtesy, emailEnviado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Denegar solicitud pública -> Se elimina de la base de datos sin enviar correo
app.delete('/api/courtesies/:id/denegar', async (req, res) => {
  try {
    await Courtesy.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Entregar boleto en taquilla
app.patch('/api/courtesies/:id/deliver', async (req, res) => {
  try {
    const c = await Courtesy.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Cortesía no encontrada' });
    c.entregado = !c.entregado;
    if (c.entregado) c.estado = 'aceptada';
    await c.save();
    res.json(c);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verificar y aceptar invitación por token (Link del invitado)
app.get('/api/courtesies/verify/:token', async (req, res) => {
  try {
    const courtesy = await Courtesy.findOne({ token: req.params.token });
    if (!courtesy) return res.status(404).json({ error: 'Invitación no encontrada' });
    const screening = await Screening.findById(courtesy.screeningId);
    res.json({ courtesy, screening });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courtesies/accept/:token', async (req, res) => {
  try {
    const courtesy = await Courtesy.findOne({ token: req.params.token });
    if (!courtesy) return res.status(404).json({ error: 'Invitación no encontrada' });
    courtesy.estado = 'aceptada';
    courtesy.fechaRespuesta = new Date().toISOString();
    await courtesy.save();
    const screening = await Screening.findById(courtesy.screeningId);
    res.json({ ok: true, courtesy, screening });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REINICIO MAESTRO OCULTO (SOLO DESARROLLADOR)
// ==========================================
app.delete('/api/dev/reset-all', async (req, res) => {
  try {
    const { masterPin } = req.body;
    const expectedPin = process.env.DEV_RESET_PIN || 'pedro-reset-2026';

    if (masterPin !== expectedPin) {
      return res.status(403).json({ ok: false, error: 'PIN maestro de desarrollador inválido' });
    }

    const [delScreenings, delCourtesies, delVenues] = await Promise.all([
      Screening.deleteMany({}),
      Courtesy.deleteMany({}),
      Venue.deleteMany({})
    ]);

    console.log('🧹 Base de datos reiniciada por el desarrollador:', {
      funcionesEliminadas: delScreenings.deletedCount,
      cortesiasEliminadas: delCourtesies.deletedCount,
      salasExtraEliminadas: delVenues.deletedCount
    });

    res.json({
      ok: true,
      message: 'Base de datos limpia al 100%. Lista para producción.',
      deleted: {
        screenings: delScreenings.deletedCount,
        courtesies: delCourtesies.deletedCount,
        venues: delVenues.deletedCount
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

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