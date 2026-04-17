import nodemailer from 'nodemailer';

interface ContactFormData {
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
}

export async function sendContactEmail(data: ContactFormData): Promise<void> {
  // Use dedicated sales SMTP credentials so contact form emails come from sales@
  // and do not mix with facturacion@ invoicing emails
  const salesUser = process.env.SMTP_SALES_USER || process.env.SMTP_USER;
  const salesPass = process.env.SMTP_SALES_PASS || process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: salesUser,
      pass: salesPass,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
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
    from: `"Streetview Media" <${salesUser}>`,
    to: 'sales@streetviewmediapr.com',
    subject: `Nuevo mensaje de contacto de ${data.nombre}`,
    html: emailHtml,
    replyTo: data.email,
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
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
  });

  // Download the PDF from S3 to attach it
  const pdfResponse = await fetch(data.pdfUrl);
  if (!pdfResponse.ok) throw new Error('No se pudo descargar el PDF de la factura');
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

  // White-background version of the logo — required for Outlook dark mode compatibility
  // (Outlook ignores CSS background-color on image containers; only a non-transparent PNG works)
  const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/email-logo-white-bg_8d4b02f4.png';
  const HEADER_BANNER_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/email-header-banner_8a34749d.jpg';

  const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
</head>
<body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#f0f1f5;margin:0;padding:0">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f0f1f5" style="background-color:#f0f1f5">
  <tbody><tr><td style="background-color:#f0f1f5">
    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;min-height:600px;margin:0 auto;background-color:#ffffff">
      <tbody>
        <!-- Logo: white background locked for ALL dark-mode clients including Outlook mobile -->
        <!--[if mso]>
        <tr><td bgcolor="#ffffff" style="background-color:#ffffff !important;padding:20px 0">
        <![endif]-->
        <!--[if !mso]><!-->
        <tr><td bgcolor="#ffffff" style="background-color:#ffffff !important;padding:20px 0">
        <!--<![endif]-->
          <!--[if mso]>
          <table align="center" width="205" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff">
          <tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff !important">
          <![endif]-->
          <!--[if !mso]><!-->
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background-color:#ffffff !important;max-width:205px">
          <tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff !important">
          <!--<![endif]-->
            <img src="${LOGO_URL}" width="205" height="52"
              style="display:block;width:205px;height:auto;max-width:205px;background-color:#ffffff"
              alt="Streetview Media">
          </td></tr></table>
        </td></tr>

        <!-- Tagline -->
        <tr><td style="font-size:0;height:8px" height="8">&nbsp;</td></tr>
        <tr><td dir="ltr" style="color:#171d2b;font-size:13px;font-family:Verdana, Geneva, sans-serif;text-align:center;padding:0px 20px">
          TU MARCA EN EL CAMINO
        </td></tr>
        <tr><td style="font-size:0;height:8px" height="8">&nbsp;</td></tr>

        <!-- Header Banner -->
        <tr><td>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
            <tbody><tr><td align="center">
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
                <tbody><tr><td style="width:100%;padding:0">
                  <img src="${HEADER_BANNER_URL}" width="600" height="76" style="display:block;width:100%;height:auto;max-width:100%" alt="">
                </td></tr></tbody>
              </table>
            </td></tr></tbody>
          </table>
        </td></tr>

        <!-- Heading -->
        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>
        <tr><td dir="ltr" style="color:#171d2b;font-size:34px;font-family:Georgia, serif;line-height:1;text-align:center;padding:0px 20px">
          Gracias por confiar<br>en nosotros
        </td></tr>

        <!-- Message body -->
        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>
        <tr><td dir="ltr" style="color:#085e3a;font-size:16px;font-family:Verdana, Geneva, sans-serif;line-height:1.7;text-align:left;padding:0px 32px">
          ${data.message.replace(/\n/g, '<br>')}
        </td></tr>
        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>

        <!-- Divider -->
        <tr><td style="padding:0px 20px">
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
            <tbody><tr><td align="center">
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">
                <tbody><tr><td height="1px" style="height:1px;border-radius:999px;line-height:1px;font-size:0;background-color:#bfc3c8">&nbsp;</td></tr></tbody>
              </table>
            </td></tr></tbody>
          </table>
        </td></tr>
        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>

        <!-- Tagline bottom -->
        <tr><td dir="ltr" style="color:#171d2b;font-size:16px;font-family:Verdana, Geneva, sans-serif;text-align:center;padding:0px 20px">
          La nueva red de publicidad externa en Puerto Rico.
        </td></tr>
        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>

        <!-- Footer -->
        <tr><td style="vertical-align:top">
          <table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:100%;background-color:#0c291d">
            <tbody><tr><td style="text-align:center;padding:24px 20px">
              <table border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:547px;margin:0 auto">
                <tbody><tr><td style="vertical-align:top">
                  <table border="0" cellpadding="0" cellspacing="0" style="width:100%">
                    <tbody>
                      <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>
                      <tr><td dir="ltr" style="color:#ffffff;font-size:14px;font-family:Verdana, Geneva, sans-serif;line-height:1.4;text-align:left">
                        <a href="tel:7877085115" style="color:#ffffff;text-decoration:none">(787)708-5115</a>
                      </td></tr>
                      <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>
                      <tr><td dir="ltr" style="font-size:14px;font-family:Verdana, Geneva, sans-serif;line-height:1.4;text-align:left;color:#ffffff">
                        130 Ave. Winston Churchill<br>
                        PMB 167<br>
                        San Juan, PR 00926<br>
                        <span style="font-size:13px;color:#bfc3c8">www.streetviewmediapr.com</span>
                      </td></tr>
                      <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>
                      <tr><td dir="ltr" style="color:#bfc3c8;font-size:13px;font-family:Verdana, Geneva, sans-serif;line-height:1.4;text-align:left">
                        &copy;Streetviewmedia PR 2026
                      </td></tr>
                    </tbody>
                  </table>
                </td></tr></tbody>
              </table>
            </td></tr></tbody>
          </table>
        </td></tr>
      </tbody>
    </table>
  </td></tr></tbody>
</table>
</body></html>
  `;

  // Normalize multiple emails: split by comma or semicolon, trim, rejoin with comma
  const normalizeEmails = (raw: string) =>
    raw.split(/[,;]+/).map(e => e.trim()).filter(Boolean).join(', ');

  // Outlook/Microsoft 365 requires From to exactly match the authenticated SMTP_USER
  // Using a different From address causes silent rejection
  const senderEmail = process.env.SMTP_USER;
  const mailOptions: any = {
    from: `"Streetview Media PR" <${senderEmail}>`,
    to: normalizeEmails(data.to),
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
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Invoice ${data.numeroFactura} sent to ${data.to}. MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error('[Email Service] Error sending invoice email:', error);
    const detail = error?.message || error?.response || 'Unknown SMTP error';
    throw new Error(`Error al enviar la factura: ${detail}`);
  }
}
