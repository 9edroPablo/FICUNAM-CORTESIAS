import mongoose from 'mongoose';

const screeningSchema = new mongoose.Schema(
  {
    pelicula: { type: String, required: true, trim: true },
    director: { type: String, required: true, trim: true },
    seccion: { type: String, default: 'SELECCIÓN OFICIAL', trim: true },
    salaId: {
      type: String,
      required: true,
      enum: ['covarrubias', 'bracho', 'chavez', 'revueltas', 'monsivais', 'espiga']
    },
    fecha: { type: String, required: true }, // Formato YYYY-MM-DD
    hora: { type: String, required: true }   // Formato HH:mm (24h)
  },
  { timestamps: true }
);

export default mongoose.model('Screening', screeningSchema);
