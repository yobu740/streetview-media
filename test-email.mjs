import nodemailer from 'nodemailer';
const { createTransport } = nodemailer;
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  
  const transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true, // Enable debug output
    logger: true, // Log to console
  });

  const mailOptions = {
    from: `"Streetview Media" <${process.env.SMTP_USER}>`,
    to: ['sales@streetviewmediapr.com', 'cesteves@streetviewmediapr.com'],
    subject: 'Test Email from Streetview Media',
    html: '<h1>Test Email</h1><p>This is a test email from the contact form.</p>',
    replyTo: 'test@example.com',
  };

  try {
    console.log('\nVerifying connection...');
    await transporter.verify();
    console.log('✓ SMTP connection verified');
    
    console.log('\nSending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('✗ Error:', error);
    if (error.code) console.error('Error code:', error.code);
    if (error.command) console.error('Failed command:', error.command);
    if (error.response) console.error('Server response:', error.response);
  }
}

testEmail();
