const mongoose = require('mongoose');

const screeningSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['pelicula', 'evento'], default: 'pelicula' },
  pelicula: { type: String, required: true, trim: true },
  director: { type: String, default: '', trim: true },
  seccion: { type: String, default: 'SELECCIÓN OFICIAL', trim: true },
  salaId: { type: String, required: true, trim: true },
  fecha: { type: String, required: true },
  hora: { type: String, required: true },
  limiteCortesias: { type: Number, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Screening', screeningSchema);