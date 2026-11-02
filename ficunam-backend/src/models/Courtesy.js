const mongoose = require('mongoose');

const courtesySchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  correo: { type: String, required: true, trim: true, lowercase: true },
  empresa: { type: String, default: '', trim: true },
  categoria: { type: String, default: 'Invitados' },
  screeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'Screening', required: true },
  estadoSolicitud: { type: String, enum: ['solicitud_pendiente', 'aprobada'], default: 'aprobada' },
  estado: { type: String, enum: ['pendiente', 'aceptada', 'declinada'], default: 'pendiente' },
  entregado: { type: Boolean, default: false },
  token: { type: String, required: true, unique: true },
  emailEnviado: { type: Boolean, default: false },
  fechaEnvio: { type: String, default: () => new Date().toISOString() },
  fechaRespuesta: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Courtesy', courtesySchema);