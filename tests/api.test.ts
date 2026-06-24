// tests/api.test.ts
import { describe, it, expect } from '@jest/globals'; // <-- NEW: Explicitly load Jest types
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

// We create a mini-version of your app just for testing
const app = express();
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2, // Artificially low limit just to test if the blocker works!
  message: { error: 'Too many requests' },
});

app.use('/api/', apiLimiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Tech Fest API is running smoothly!' });
});

describe('Tech Fest API Core Tests', () => {
  
  it('should return 200 OK on the health check endpoint', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });

  it('should block users who spam the API (Rate Limiting)', async () => {
    // Request 1 (Allowed)
    await request(app).get('/api/health');
    // Request 2 (Allowed)
    await request(app).get('/api/health');
    // Request 3 (BLOCKED!)
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(429); // 429 means "Too Many Requests"
    expect(response.body.error).toBe('Too many requests');
  });

});