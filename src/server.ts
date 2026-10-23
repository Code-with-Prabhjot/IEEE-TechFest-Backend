// src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRoutes from './routes/authRoutes';
import ticketRoutes from './routes/ticketRoutes';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// --- CORS CONFIGURATION ---
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, same-origin)
    // or allow local origins and specified production origin
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for Tech Fest portal
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- FRONTEND INTEGRATION ---
// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// --- SECURITY: Rate Limiting ---
// This stops bots from spamming your API and crashing the server
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // Generous ceiling during automated test runs
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply the rate limiter to all API routes
app.use('/api/', apiLimiter);

// --- HEALTH CHECK ---
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'Tech Fest API is running smoothly!' });
});

// --- CORE ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/events', ticketRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/scanner', ticketRoutes);

// --- SPA FALLBACK & 404 HANDLER (Express 5 compatible) ---
app.use((req: Request, res: Response) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
  }
});

// --- ERROR HANDLING MIDDLEWARE ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

export { app };
export default app;
