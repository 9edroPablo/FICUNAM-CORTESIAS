import mongoose from 'mongoose';

const screeningSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['pelicula', 'evento'],
    default: 'pelicula'
  },
  pelicula: {
    type: String,
    required: true,
    trim: true
  },
  director: {
    type: String,
    default: '',
    trim: true
  },
  sala: {
    type: String,
    required: true,
    trim: true
  },
  fecha: {
    type: String,
    required: true
  },
  hora: {
    type: String,
    required: true
  },
  fechaLimiteConfirmacion: {
    type: String,
    default: ''
  },
  limiteCortesias: {
    type: Number,
    default: 50
  }
}, { timestamps: true });

export default mongoose.model('Screening', screeningSchema);