import mongoose from 'mongoose';
import crypto from 'crypto';

const courtesySchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    empresa: { type: String, default: '', trim: true },
    correo: { type: String, required: true, trim: true, lowercase: true },
    categoria: {
      type: String,
      required: true,
      enum: ['Invitados', 'Aliados', 'Prensa', 'Medios']
    },
    screeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screening',
      required: true
    },
    token: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(24).toString('hex')
    },
    estado: {
      type: String,
      enum: ['pendiente', 'aceptada'],
      default: 'pendiente'
    },
    entregado: {
      type: Boolean,
      default: false
    },
    fechaEnvio: { type: Date, default: Date.now },
    fechaRespuesta: { type: Date, default: null },
    fechaEntrega: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model('Courtesy', courtesySchema);
