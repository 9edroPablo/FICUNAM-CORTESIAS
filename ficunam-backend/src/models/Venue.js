import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  sede: {
    type: String,
    default: 'Sede FICUNAM',
    trim: true
  },
  capacidad: {
    type: Number,
    default: 100
  }
}, { timestamps: true });

export default mongoose.model('Venue', venueSchema);