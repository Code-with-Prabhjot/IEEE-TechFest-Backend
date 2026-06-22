// src/controllers/ticketController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

// 1. Register for the Tech Fest and Generate a Ticket
export const registerForEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized user context.' });
      return;
    }

    // EDGE CASE: Prevent duplicate registrations from the same account
    const existingTicket = await prisma.ticket.findUnique({ where: { userId } });
    if (existingTicket) {
      res.status(409).json({ error: 'You have already registered for this tech fest.' });
      return;
    }

    // Create the ticket in PENDING payment status initially
    const newTicket = await prisma.ticket.create({
      data: {
        userId,
        paymentStatus: 'PENDING',
      },
    });

    // BONUS INNOVATIVE FEATURE: Generate an actual valid QR Code graphic string containing the ticket ID
    const qrCodeDataUrl = await QRCode.toDataURL(`techfest-ticket:${newTicket.id}`);

    // Update the ticket record with the generated QR code string
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

// 2. View My Own Ticket (For Students)
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

// 3. View All Registrations (For Volunteers Only)
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