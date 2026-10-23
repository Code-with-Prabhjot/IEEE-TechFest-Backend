// src/controllers/ticketController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

// 1. Generate Event Ticket with Teammate Validation
export const registerForEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const leaderId = req.user?.id;
    const { eventName, isTeam, teammateEmails } = req.body;

    if (!leaderId) {
      res.status(401).json({ error: 'Unauthorized: Please login first.' });
      return;
    }

    if (!eventName || typeof eventName !== 'string') {
      res.status(400).json({ error: 'Event name is required.' });
      return;
    }

    // Dynamic Pricing Logic (Solo vs Team)
    let totalAmount = isTeam ? 600 : 200; 

    // Prevent double-booking the same event
    const existingTicket = await prisma.ticket.findFirst({
      where: { userId: leaderId, eventName }
    });
    
    if (existingTicket) {
      res.status(400).json({ error: `You are already registered for ${eventName}.` });
      return;
    }

    // Validate Teammates (MUST exist in database)
    const teamMembersData = [];
    if (isTeam && teammateEmails && Array.isArray(teammateEmails)) {
      if (teammateEmails.length > 3) {
        res.status(400).json({ error: 'Maximum 3 teammates allowed (4 members total).' });
        return;
      }

      for (const email of teammateEmails) {
        const teammate = await prisma.user.findUnique({ where: { email } });
        if (!teammate) {
          res.status(404).json({ error: `User with email ${email} does not exist. They must create an account first!` });
          return;
        }
        if (teammate.id === leaderId) {
          res.status(400).json({ error: 'You cannot add yourself as a teammate.' });
          return;
        }
        teamMembersData.push({ userId: teammate.id });
      }
    }

    // Create the Ticket and link everyone
    const newTicket = await prisma.ticket.create({
      data: {
        userId: leaderId,
        eventName,
        isTeam: Boolean(isTeam),
        totalAmount,
        teamMembers: {
          create: teamMembersData
        }
      },
      include: { teamMembers: { include: { user: true } } }
    });

    res.status(201).json({ 
      message: `${eventName} registration successful! Proceed to payment.`, 
      ticketId: newTicket.id,
      totalAmount: newTicket.totalAmount,
      team: newTicket.teamMembers.map((tm: any) => tm.user.email)
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

// 2. View My Tickets (Updated for Multiple Events)
export const getMyTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tickets = await prisma.ticket.findMany({
      where: { userId },
      include: { teamMembers: { include: { user: true } } }
    });

    if (!tickets || tickets.length === 0) {
      res.status(404).json({ error: 'No tickets found.' });
      return;
    }

    res.status(200).json({ tickets });
  } catch (error) {
    console.error("Fetch Tickets Error:", error);
    res.status(500).json({ error: 'Internal server error while fetching tickets.' });
  }
};

// 3. View All Registrations (Volunteer)
export const getAllRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrations = await prisma.ticket.findMany({
      include: { 
        user: { select: { name: true, email: true, role: true } },
        teamMembers: { include: { user: { select: { name: true, email: true } } } }
      },
    });
    res.status(200).json({ count: registrations.length, registrations });
  } catch (error) {
    console.error("Get All Registrations Error:", error);
    res.status(500).json({ error: 'Internal server error while fetching registrations.' });
  }
};

// 4. Simulate Payment (Student)
export const simulatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const ticketId = (req.params.ticketId || req.body.ticketId) as string;

    if (!ticketId) {
      res.status(400).json({ error: 'Ticket ID is required.' });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: true,
        teamMembers: {
          include: {
            user: true
          }
        }
      }
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }
    if (ticket.userId !== userId) {
      res.status(403).json({ error: 'You can only pay for your own ticket.' });
      return;
    }
    if (ticket.paymentStatus === 'COMPLETED') {
      res.status(400).json({ error: 'This ticket has already been paid for.' });
      return;
    }

    // Generate dynamic QR Code Data URL
    const qrDataUrl = await QRCode.toDataURL(ticketId);

    // Update to COMPLETED with QR Code
    const paidTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { 
        paymentStatus: 'COMPLETED',
        qrCode: qrDataUrl
      },
    });

    res.status(200).json({ message: 'Payment successful!', ticket: paidTicket });
  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).json({ error: 'Internal server error during payment.' });
  }
};

// 5. Gate Check-in (Volunteer Only)
export const checkInTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const volunteerId = req.user?.id;
    const ticketId = (req.params.ticketId || req.body.ticketId) as string;

    if (!ticketId) {
      res.status(400).json({ error: 'Ticket ID is required.' });
      return;
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      res.status(404).json({ error: 'Invalid QR Code. Ticket not found in database.' });
      return;
    }

    if (ticket.paymentStatus !== 'COMPLETED') {
      res.status(402).json({ error: 'Access Denied. Payment has not been completed.' });
      return;
    }

    if (ticket.isCheckedIn) {
      res.status(409).json({ error: 'Warning: This ticket has already been checked in!' });
      return;
    }

    const checkedInTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isCheckedIn: true,
        checkInTime: new Date(),
        checkedInBy: volunteerId,
      },
    });

    // Security Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'TICKET_CHECK_IN',
        details: `Ticket ${ticketId} successfully scanned and admitted.`,
        performedBy: (volunteerId || 'SYSTEM') as string,
      },
    });

    res.status(200).json({ message: 'Check-in successful! Student granted entry.', ticket: checkedInTicket });
  } catch (error) {
    console.error("Check-in Error:", error);
    res.status(500).json({ error: 'Internal server error during check-in.' });
  }
};

// 6. Export Registrations as CSV (Volunteer Only)
export const exportRegistrationsCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: { user: true },
    });

    let csv = 'Ticket ID,Student Name,Email,Payment Status,Checked In,Check-in Time\n';

    tickets.forEach(ticket => {
      const name = `"${ticket.user.name}"`; 
      const email = `"${ticket.user.email}"`;
      const checkInTime = ticket.checkInTime ? ticket.checkInTime.toISOString() : 'N/A';
      csv += `${ticket.id},${name},${email},${ticket.paymentStatus},${ticket.isCheckedIn},${checkInTime}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('techfest_registrations.csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error("Export CSV Error:", error);
    res.status(500).json({ error: 'Internal server error during CSV export.' });
  }
};
