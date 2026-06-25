// src/server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import ticketRoutes from './routes/ticketRoutes';
import path from 'path';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// --- FRONTEND INTEGRATION ---
// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// --- SECURITY: Rate Limiting ---
// This stops bots from spamming your API and crashing the server
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply the rate limiter to all API routes
app.use('/api/', apiLimiter);

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/events', ticketRoutes);

// --- HEALTH CHECK ---
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'Tech Fest API is running smoothly!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});