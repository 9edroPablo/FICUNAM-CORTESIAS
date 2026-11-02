import mongoose from 'mongoose';

const courtesySchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  correo: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  empresa: {
    type: String,
    default: '',
    trim: true
  },
  categoria: {
    type: String,
    default: 'Invitado Especial'
  },
  screeningId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Screening',
    required: true
  },
  estadoSolicitud: {
    type: String,
    enum: ['solicitud_pendiente', 'aprobada'],
    default: 'aprobada'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'declinada', 'cancelada'],
    default: 'pendiente'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  emailEnviado: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Courtesy', courtesySchema);