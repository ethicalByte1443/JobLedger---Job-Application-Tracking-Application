import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import applicationRoutes from './routes/application';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api', applicationRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Global Error Handler (must be last) ---
app.use(errorHandler);

app.listen(port, () => {
  console.log(`🚀 Backend server is running on http://localhost:${port}`);
});
