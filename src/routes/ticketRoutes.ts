// src/routes/ticketRoutes.ts
import { Router } from 'express';
import { registerForEvent, getMyTicket, getAllRegistrations } from '../controllers/ticketController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Student-accessible routes (Must be authenticated)
router.post('/register-fest', authenticateJWT, registerForEvent);
router.get('/my-ticket', authenticateJWT, getMyTicket);

// Volunteer-only routes (Must be authenticated AND a volunteer)
router.get('/admin/all-tickets', authenticateJWT, requireRole(['VOLUNTEER']), getAllRegistrations);

export default router;