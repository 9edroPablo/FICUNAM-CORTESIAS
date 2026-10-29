import express from 'express';
import Screening from '../models/Screening.js';
import Courtesy from '../models/Courtesy.js';
import { SALAS_CCU } from '../config/salas.js';
import { calculateScreeningDeadline } from '../utils/deadline.js';
import { sendInvitationEmail } from '../services/mailer.js';

const router = express.Router();

// 1. Obtener todas las funciones
router.get('/screenings', async (req, res) => {
  try {
    const screenings = await Screening.find().sort({ fecha: 1, hora: 1 });
    res.json(screenings);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener las funciones', details: err.message });
  }
});

// 2. Crear una nueva función / horario
router.post('/screenings', async (req, res) => {
  try {
    const { pelicula, director, seccion, salaId, fecha, hora } = req.body;
    if (!SALAS_CCU[salaId]) {
      return res.status(400).json({ error: 'Sala no válida' });
    }
    const nuevaFuncion = await Screening.create({
      pelicula,
      director,
      seccion,
      salaId,
      fecha,
      hora
    });
    res.status(201).json(nuevaFuncion);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar la función', details: err.message });
  }
});

// 3. Eliminar una función
router.delete('/screenings/:id', async (req, res) => {
  try {
    await Screening.findByIdAndDelete(req.params.id);
    await Courtesy.deleteMany({ screeningId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar función' });
  }
});

// 4. Obtener todas las cortesías (para Taquilla y Resumen Ejecutivo)
router.get('/courtesies', async (req, res) => {
  try {
    const courtesies = await Courtesy.find().sort({ createdAt: -1 });
    res.json(courtesies);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cortesías' });
  }
});

// 5. Asignar cortesía, verificar aforo máximo y enviar correo real
router.post('/courtesies', async (req, res) => {
  try {
    const { nombre, empresa, correo, categoria, screeningId } = req.body;
    const screening = await Screening.findById(screeningId);
    if (!screening) {
      return res.status(404).json({ error: 'Función no encontrada' });
    }

    const sala = SALAS_CCU[screening.salaId];

    // Verificar que no se rebase el aforo máximo de la sala
    if (sala && sala.aforo !== null) {
      const ocupados = await Courtesy.countDocuments({
        screeningId: screening._id,
        estado: { $in: ['pendiente', 'aceptada'] }
      });

      if (ocupados >= sala.aforo) {
        return res.status(400).json({
          error: `No se pueden dar más boletos: se alcanzó el aforo máximo de ${sala.nombre} (${sala.aforo} lugares).`
        });
      }
    }

    // Verificar que aún falten más de 24 horas para la función
    const { deadlineFormatted, isExpired } = calculateScreeningDeadline(
      screening.fecha,
      screening.hora
    );

    if (isExpired) {
      return res.status(400).json({
        error: 'El registro para esta función ya cerró (faltan menos de 24 horas para la función).'
      });
    }

    // Guardar cortesía en MongoDB con token único por persona
    const courtesy = await Courtesy.create({
      nombre,
      empresa: empresa || categoria,
      correo,
      categoria,
      screeningId: screening._id
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const confirmUrl = `${frontendUrl}/confirmar/${courtesy.token}`;

    // Enviar el correo real desde asistencia.direccionejecutiva@fic.unam.mx
    let emailEnviado = true;
    let emailError = null;
    try {
      await sendInvitationEmail({
        courtesy,
        screening,
        salaNombre: sala.nombre,
        deadlineFormatted,
        confirmUrl
      });
    } catch (mailErr) {
      emailEnviado = false;
      emailError = mailErr.message;
      console.error('Advertencia: Se guardó en BD pero falló el envío SMTP:', mailErr.message);
    }

    res.status(201).json({
      courtesy,
      confirmUrl,
      emailEnviado,
      emailError
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la cortesía', details: err.message });
  }
});

// 6. Consultar información de una invitación mediante el token del link (Vista del Invitado)
router.get('/courtesies/verify/:token', async (req, res) => {
  try {
    const courtesy = await Courtesy.findOne({ token: req.params.token }).populate('screeningId');
    if (!courtesy || !courtesy.screeningId) {
      return res.status(404).json({ error: 'Invitación no encontrada o inválida.' });
    }

    const screening = courtesy.screeningId;
    const sala = SALAS_CCU[screening.salaId];
    const deadlineInfo = calculateScreeningDeadline(screening.fecha, screening.hora);

    res.json({
      courtesy: {
        id: courtesy._id,
        nombre: courtesy.nombre,
        empresa: courtesy.empresa,
        correo: courtesy.correo,
        categoria: courtesy.categoria,
        estado: courtesy.estado,
        fechaRespuesta: courtesy.fechaRespuesta
      },
      screening: {
        pelicula: screening.pelicula,
        director: screening.director,
        fecha: screening.fecha,
        hora: screening.hora,
        salaNombre: sala?.nombre || 'Sala CCU'
      },
      deadlineFormatted: deadlineInfo.deadlineFormatted,
      isExpired: deadlineInfo.isExpired
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar invitación' });
  }
});

// 7. Aceptar la invitación desde el botón del correo (se bloquea 24h antes de la función)
router.post('/courtesies/accept/:token', async (req, res) => {
  try {
    const courtesy = await Courtesy.findOne({ token: req.params.token }).populate('screeningId');
    if (!courtesy || !courtesy.screeningId) {
      return res.status(404).json({ error: 'Invitación no válida.' });
    }

    const screening = courtesy.screeningId;
    const { isExpired, deadlineFormatted } = calculateScreeningDeadline(
      screening.fecha,
      screening.hora
    );

    // Regla estricta: se desactiva 24 horas antes de la función
    if (isExpired) {
      return res.status(403).json({
        error: `El enlace de confirmación se desactivó 24 horas antes de la función (${deadlineFormatted}).`
      });
    }

    if (courtesy.estado !== 'aceptada') {
      courtesy.estado = 'aceptada';
      courtesy.fechaRespuesta = new Date();
      await courtesy.save();
    }

    res.json({
      ok: true,
      message: 'Invitación aceptada correctamente. Tu pase individual ha quedado reservado.',
      courtesy
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al confirmar la invitación' });
  }
});

// 8. Marcar boleto como ENTREGADO en Taquilla
router.patch('/courtesies/:id/deliver', async (req, res) => {
  try {
    const courtesy = await Courtesy.findById(req.params.id);
    if (!courtesy) {
      return res.status(404).json({ error: 'Cortesía no encontrada' });
    }

    courtesy.entregado = !courtesy.entregado;
    if (courtesy.entregado) {
      courtesy.estado = 'aceptada';
      courtesy.fechaEntrega = new Date();
    } else {
      courtesy.fechaEntrega = null;
    }

    await courtesy.save();
    res.json(courtesy);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estatus de entrega' });
  }
});

export default router;
