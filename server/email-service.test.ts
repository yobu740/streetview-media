import { describe, it, expect } from 'vitest';
import nodemailer from 'nodemailer';

describe('Email Service SMTP Configuration', () => {
  it('should verify SMTP credentials are valid', async () => {
    // Check that required env vars are set
    expect(process.env.SMTP_HOST).toBeDefined();
    expect(process.env.SMTP_PORT).toBeDefined();
    expect(process.env.SMTP_USER).toBeDefined();
    expect(process.env.SMTP_PASS).toBeDefined();
    
    // Create transporter with provided credentials
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    try {
      await transporter.verify();
      expect(true).toBe(true); // Connection successful
    } catch (error) {
      console.error('SMTP verification failed:', error);
      throw new Error('Invalid SMTP credentials. Please check your Outlook email and password.');
    }
  }, 15000); // 15 second timeout for network request
});
