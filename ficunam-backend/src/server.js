import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api', apiRoutes);

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FICUNAM Cortesias API' });
});

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ficunam_cortesias')
  .then(() => {
    console.log('✅ Conectado a MongoDB (ficunam_cortesias)');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Backend FICUNAM corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error conectando a MongoDB:', err.message);
  });
