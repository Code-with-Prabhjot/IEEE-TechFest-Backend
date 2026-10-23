// src/controllers/authController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registerSchema, loginSchema } from '../utils/validation';

const prisma = new PrismaClient();
const getJwtSecret = (): string => process.env.JWT_SECRET || 'fallback_secret';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate request body against schema
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid input data' });
      return;
    }

    const { name, email, password } = parseResult.data;
    const role = parseResult.data.role || 'STUDENT';
    const providedKey = req.body.secretKey || req.body.adminKey;

    // --- SECURITY: Block unauthorized volunteers ---
    if (role === 'VOLUNTEER') {
      const validSecretKeys = [
        process.env.VOLUNTEER_SECRET_KEY,
        process.env.VOLUNTEER_MASTER_KEY
      ].filter(Boolean);

      if (!providedKey || !validSecretKeys.includes(providedKey)) {
        res.status(403).json({ error: 'Forbidden: Invalid Volunteer Secret Key.' });
        return;
      }
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // 3. Hash the password and save the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate data
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid email or password format' });
      return;
    }

    const { email, password } = parseResult.data;

    // 2. Find User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // 3. Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // 4. Generate the digital key (JWT Token)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};
