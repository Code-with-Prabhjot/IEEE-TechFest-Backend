// tests/api.test.ts
import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { app } from '../src/server';

describe('Tech Fest API Core Tests', () => {
  // Test rate limiter behavior using isolated instance
  it('should block users who spam the API (Rate Limiting)', async () => {
    const miniApp = express();
    miniApp.use(express.json());
    const miniLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2,
      message: { error: 'Too many requests' },
    });
    miniApp.use('/api/', miniLimiter);
    miniApp.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'success' });
    });

    await request(miniApp).get('/api/health');
    await request(miniApp).get('/api/health');
    const response = await request(miniApp).get('/api/health');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many requests');
  });

  it('should return 200 OK on the health check endpoint', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toContain('running smoothly');
  });
});

describe('Authentication & Gate Security Flow', () => {
  const timestamp = Date.now();
  const studentEmail = `student_${timestamp}@example.com`;
  const studentPassword = 'password123';
  let studentToken = '';
  let studentId = '';

  const volunteerEmail = `guard_${timestamp}@example.com`;
  const volunteerPassword = 'secureguard123';
  let volunteerToken = '';

  let generatedTicketId = '';

  it('should reject student registration with invalid input', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'invalid-email', password: '123' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it('should successfully register a student', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alex Student',
        email: studentEmail,
        password: studentPassword,
        role: 'STUDENT',
      });
    expect(response.status).toBe(201);
    expect(response.body.userId).toBeDefined();
    studentId = response.body.userId;
  });

  it('should reject duplicate email registration with 409', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alex Duplicate',
        email: studentEmail,
        password: studentPassword,
      });
    expect(response.status).toBe(409);
    expect(response.body.error).toContain('already exists');
  });

  it('should reject volunteer registration without a valid secret key with 403', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Fake Guard',
        email: `fakeguard_${timestamp}@example.com`,
        password: 'guardpassword',
        role: 'VOLUNTEER',
        secretKey: 'wrong-key',
      });
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Invalid Volunteer Secret Key');
  });

  it('should successfully register a volunteer with the secret key', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Gate Commander',
        email: volunteerEmail,
        password: volunteerPassword,
        role: 'VOLUNTEER',
        secretKey: 'ieee-master-guard-2026',
      });
    expect(response.status).toBe(201);
  });

  it('should login student and return JWT token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: studentPassword });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe('STUDENT');
    studentToken = response.body.token;
  });

  it('should login volunteer and return JWT token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: volunteerEmail, password: volunteerPassword });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe('VOLUNTEER');
    volunteerToken = response.body.token;
  });

  it('should reject unauthenticated access to tickets', async () => {
    const response = await request(app).get('/api/events/my-ticket');
    expect(response.status).toBe(401);
  });

  it('should register for an event (create ticket)', async () => {
    const response = await request(app)
      .post('/api/events/register-fest')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        eventName: `AI Hackathon ${timestamp}`,
        isTeam: false,
      });
    expect(response.status).toBe(201);
    expect(response.body.ticketId).toBeDefined();
    expect(response.body.totalAmount).toBe(200);
    generatedTicketId = response.body.ticketId;
  });

  it('should reject duplicate registration for the same event by the same user', async () => {
    const response = await request(app)
      .post('/api/events/register-fest')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        eventName: `AI Hackathon ${timestamp}`,
        isTeam: false,
      });
    expect(response.status).toBe(400);
  });

  it('should block unpaid ticket at gate check-in with 402', async () => {
    const response = await request(app)
      .post(`/api/events/admin/checkin/${generatedTicketId}`)
      .set('Authorization', `Bearer ${volunteerToken}`);
    expect(response.status).toBe(402);
    expect(response.body.error).toContain('Payment has not been completed');
  });

  it('should simulate payment and generate dynamic QR code', async () => {
    const response = await request(app)
      .post(`/api/events/payment/${generatedTicketId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.status).toBe(200);
    expect(response.body.ticket.paymentStatus).toBe('COMPLETED');
    expect(response.body.ticket.qrCode).toMatch(/^data:image\/png;base64,/);
  });

  it('should retrieve student tickets including the paid ticket', async () => {
    const response = await request(app)
      .get('/api/events/my-ticket')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.tickets)).toBe(true);
    const found = response.body.tickets.find((t: any) => t.id === generatedTicketId);
    expect(found).toBeDefined();
    expect(found.paymentStatus).toBe('COMPLETED');
  });

  it('should allow ticket access via route alias /api/tickets/my-ticket', async () => {
    const response = await request(app)
      .get('/api/tickets/my-ticket')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.status).toBe(200);
  });

  it('should block non-volunteer students from check-in endpoints with 403', async () => {
    const response = await request(app)
      .post(`/api/events/admin/checkin/${generatedTicketId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.status).toBe(403);
  });

  it('should successfully admit student at gate check-in via volunteer', async () => {
    const response = await request(app)
      .post(`/api/events/admin/checkin/${generatedTicketId}`)
      .set('Authorization', `Bearer ${volunteerToken}`);
    expect(response.status).toBe(200);
    expect(response.body.ticket.isCheckedIn).toBe(true);
    expect(response.body.message).toContain('Check-in successful');
  });

  it('should prevent double check-in with 409 conflict', async () => {
    const response = await request(app)
      .post(`/api/events/admin/checkin/${generatedTicketId}`)
      .set('Authorization', `Bearer ${volunteerToken}`);
    expect(response.status).toBe(409);
    expect(response.body.error).toContain('already been checked in');
  });

  it('should support gate check-in via scanner route alias /api/scanner/admin/checkin/:id', async () => {
    const response = await request(app)
      .post(`/api/scanner/admin/checkin/non-existent-id`)
      .set('Authorization', `Bearer ${volunteerToken}`);
    expect(response.status).toBe(404);
  });
});
