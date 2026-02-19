import nodemailer from 'nodemailer';

interface ContactFormData {
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
}

export async function sendContactEmail(data: ContactFormData): Promise<void> {
  // Create transporter using SMTP (you'll need to configure this with actual SMTP credentials)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a4d3c;">Nuevo Mensaje de Contacto - Streetview Media</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Nombre:</strong> ${data.nombre}</p>
        <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
        <p><strong>Teléfono:</strong> ${data.telefono}</p>
        <p><strong>Mensaje:</strong></p>
        <p style="white-space: pre-wrap;">${data.mensaje}</p>
      </div>
      <p style="color: #666; font-size: 12px;">Este mensaje fue enviado desde el formulario de contacto de streetviewmediapr.com</p>
    </div>
  `;

  const mailOptions = {
    from: `"Streetview Media" <${process.env.SMTP_USER}>`, // Use authenticated email as sender
    to: 'sales@streetviewmediapr.com',
    subject: `Nuevo mensaje de contacto de ${data.nombre}`,
    html: emailHtml,
    replyTo: data.email, // User's email for replies
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('[Email Service] Contact email sent successfully');
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
    throw new Error('Error al enviar el correo electrónico');
  }
}
