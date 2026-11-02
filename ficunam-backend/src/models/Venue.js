const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  sede: { type: String, default: 'Centro Cultural Universitario UNAM', trim: true },
  aforo: { type: Number, default: null },
  tipo: { type: String, enum: ['fijo', 'libre'], default: 'fijo' },
  descripcion: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Venue', venueSchema);