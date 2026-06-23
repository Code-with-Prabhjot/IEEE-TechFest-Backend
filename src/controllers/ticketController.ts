// src/controllers/ticketController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

// 1. Register for the Tech Fest
export const registerForEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized user context.' });
      return;
    }

    const existingTicket = await prisma.ticket.findUnique({ where: { userId } });
    if (existingTicket) {
      res.status(409).json({ error: 'You have already registered for this tech fest.' });
      return;
    }

    const newTicket = await prisma.ticket.create({
      data: { userId, paymentStatus: 'PENDING' },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(`techfest-ticket:${newTicket.id}`);

    const updatedTicket = await prisma.ticket.update({
      where: { id: newTicket.id },
      data: { qrCode: qrCodeDataUrl },
    });

    res.status(201).json({
      message: 'Registration initiated successfully! Complete payment to activate your ticket.',
      ticket: updatedTicket,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during event registration.' });
  }
};

// 2. View My Own Ticket
export const getMyTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const ticket = await prisma.ticket.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!ticket) {
      res.status(404).json({ error: 'No ticket registration found for your account.' });
      return;
    }
    res.status(200).json({ ticket });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error while fetching your ticket.' });
  }
};

// 3. View All Registrations (Volunteer)
export const getAllRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrations = await prisma.ticket.findMany({
      include: { user: { select: { name: true, email: true, role: true } } },
    });
    res.status(200).json({ count: registrations.length, registrations });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error while fetching registrations.' });
  }
};

// 4. Simulate Payment (Student)
export const simulatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    // THE FIX: Explicitly cast ticketId as a string
    const ticketId = req.params.ticketId as string;

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

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

    // Update to COMPLETED
    const paidTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { paymentStatus: 'COMPLETED' },
    });

    res.status(200).json({ message: 'Payment successful!', ticket: paidTicket });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during payment.' });
  }
};

// 5. Gate Check-in (Volunteer Only)
export const checkInTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const volunteerId = req.user?.id;
    // THE FIX: Explicitly cast ticketId as a string
    const ticketId = req.params.ticketId as string;

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

    res.status(200).json({ message: 'Check-in successful! Student granted entry.', ticket: checkedInTicket });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during check-in.' });
  }
};