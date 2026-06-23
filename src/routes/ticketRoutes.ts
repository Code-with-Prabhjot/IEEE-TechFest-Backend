// src/routes/ticketRoutes.ts
import { Router } from 'express';
import { 
  registerForEvent, 
  getMyTicket, 
  getAllRegistrations, 
  simulatePayment, 
  checkInTicket 
} from '../controllers/ticketController';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware';

const router = Router();

// --- STUDENT ROUTES ---
router.post('/register-fest', authenticateJWT, registerForEvent);
router.get('/my-ticket', authenticateJWT, getMyTicket);
router.post('/payment/:ticketId', authenticateJWT, simulatePayment);

// --- VOLUNTEER ROUTES ---
router.get('/admin/all-tickets', authenticateJWT, requireRole(['VOLUNTEER']), getAllRegistrations);
router.post('/admin/checkin/:ticketId', authenticateJWT, requireRole(['VOLUNTEER']), checkInTicket);

export default router;