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

interface InvoiceEmailData {
  to: string;
  cc?: string;
  subject: string;
  message: string;
  pdfUrl: string;
  numeroFactura: string;
  clienteNombre: string;
}

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Download the PDF from S3 to attach it
  const pdfResponse = await fetch(data.pdfUrl);
  if (!pdfResponse.ok) throw new Error('No se pudo descargar el PDF de la factura');
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a4d3c; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Streetview Media PR</h1>
        <p style="color: #a7d9c8; margin: 4px 0 0; font-size: 13px;">streetviewmediapr.com</p>
      </div>
      <div style="padding: 24px; background: #ffffff;">
        <p style="font-size: 15px; color: #333;">Estimado/a <strong>${data.clienteNombre}</strong>,</p>
        <div style="white-space: pre-wrap; font-size: 14px; color: #444; line-height: 1.6; margin: 16px 0;">${data.message}</div>
        <p style="font-size: 13px; color: #666;">La factura <strong>${data.numeroFactura}</strong> se adjunta en formato PDF a este correo.</p>
      </div>
      <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 11px; color: #999;">
        Streetview Media PR &middot; San Juan, Puerto Rico &middot; sales@streetviewmediapr.com
      </div>
    </div>
  `;

  const mailOptions: any = {
    from: `"Streetview Media PR" <${process.env.SMTP_USER}>`,
    to: data.to,
    subject: data.subject,
    html: emailHtml,
    attachments: [
      {
        filename: `${data.numeroFactura}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  if (data.cc) mailOptions.cc = data.cc;

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Invoice ${data.numeroFactura} sent to ${data.to}`);
  } catch (error) {
    console.error('[Email Service] Error sending invoice email:', error);
    throw new Error('Error al enviar la factura por correo');
  }
}
