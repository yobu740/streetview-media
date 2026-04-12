/**
 * Email Service — uses Microsoft Graph API (HTTPS) to send emails.
 * SMTP direct connections are blocked in the sandbox environment ("Greeting never received").
 * Graph API works over port 443 and uses the existing Microsoft 365 credentials.
 *
 * Required env vars (already configured):
 *   MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET
 *   SMTP_USER  — the mailbox to send FROM (e.g. facturacion@streetviewmediapr.com)
 */

import { ConfidentialClientApplication } from '@azure/msal-node';

// ─── Token helper ────────────────────────────────────────────────────────────

async function getGraphToken(): Promise<string> {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Graph credentials not configured (MICROSOFT_TENANT_ID / CLIENT_ID / CLIENT_SECRET)');
  }

  const msalApp = new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });

  const result = await msalApp.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });

  if (!result?.accessToken) throw new Error('Failed to acquire Microsoft Graph access token');
  return result.accessToken;
}

// ─── Send via Graph API ───────────────────────────────────────────────────────

interface GraphAttachment {
  '@odata.type': string;
  name: string;
  contentType: string;
  contentBytes: string; // base64
}

interface SendMailPayload {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
  attachments?: GraphAttachment[];
}

async function sendViaGraph(payload: SendMailPayload): Promise<void> {
  const token = await getGraphToken();
  const senderUpn = encodeURIComponent(payload.from);

  const toRecipients = [{ emailAddress: { address: payload.to } }];
  const ccRecipients = payload.cc
    ? payload.cc.split(',').map(e => ({ emailAddress: { address: e.trim() } }))
    : [];

  const body: Record<string, unknown> = {
    message: {
      subject: payload.subject,
      body: { contentType: 'HTML', content: payload.htmlBody },
      toRecipients,
      ...(ccRecipients.length ? { ccRecipients } : {}),
      ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
    },
    saveToSentItems: true,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderUpn}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Graph API sendMail failed (${res.status}): ${errText}`);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

interface ContactFormData {
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
}

export async function sendContactEmail(data: ContactFormData): Promise<void> {
  const senderEmail = process.env.SMTP_USER || 'facturacion@streetviewmediapr.com';

  const htmlBody = `
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

  try {
    await sendViaGraph({
      from: senderEmail,
      to: 'sales@streetviewmediapr.com',
      subject: `Nuevo mensaje de contacto de ${data.nombre}`,
      htmlBody,
    });
    console.log('[Email Service] Contact email sent successfully via Graph API');
  } catch (error) {
    console.error('[Email Service] Error sending contact email:', error);
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
  const senderEmail = process.env.SMTP_USER || 'facturacion@streetviewmediapr.com';

  // Download the PDF to attach it
  const pdfResponse = await fetch(data.pdfUrl);
  if (!pdfResponse.ok) throw new Error('No se pudo descargar el PDF de la factura');
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  const pdfBase64 = pdfBuffer.toString('base64');

  const LOGO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png';
  const HEADER_BANNER_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663148968393/NB4DzLv3DwSWij5HcQ7rQi/email-header-banner_8a34749d.jpg';

  const htmlBody = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
        <tr><td style="vertical-align:top;padding:10px 0 0 0;background-color:#ffffff !important">
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background-color:#ffffff">
            <tbody><tr><td style="padding:10px 0 10px 0;vertical-align:top;background-color:#ffffff">
              <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tbody><tr><td style="padding:0px 20px">
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
                    <tbody><tr><td align="center">
                      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:205px">
                        <tbody><tr><td style="width:100%;padding:20px 0">
                          <img src="${LOGO_URL}" width="205" height="52" style="display:block;width:100%;height:auto;max-width:100%" alt="Streetview Media">
                        </td></tr></tbody>
                      </table>
                    </td></tr></tbody>
                  </table>
                </td></tr></tbody>
              </table>
            </td></tr></tbody>
          </table>
        </td></tr>

        <tr><td style="font-size:0;height:8px" height="8">&nbsp;</td></tr>
        <tr><td dir="ltr" style="color:#171d2b;font-size:13px;font-family:Verdana, Geneva, sans-serif;text-align:center;padding:0px 20px">
          TU MARCA EN EL CAMINO
        </td></tr>
        <tr><td style="font-size:0;height:8px" height="8">&nbsp;</td></tr>

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

        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>
        <tr><td dir="ltr" style="color:#171d2b;font-size:34px;font-family:Georgia, serif;line-height:1;text-align:center;padding:0px 20px">
          Gracias por confiar<br>en nosotros
        </td></tr>

        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>
        <tr><td dir="ltr" style="color:#085e3a;font-size:16px;font-family:Verdana, Geneva, sans-serif;line-height:1.7;text-align:left;padding:0px 32px">
          ${data.message.replace(/\n/g, '<br>')}
        </td></tr>
        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>

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

        <tr><td dir="ltr" style="color:#171d2b;font-size:16px;font-family:Verdana, Geneva, sans-serif;text-align:center;padding:0px 20px">
          La nueva red de publicidad exterior en Puerto Rico.
        </td></tr>
        <tr><td style="font-size:0;height:16px" height="16">&nbsp;</td></tr>

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
</body></html>`;

  const attachments: GraphAttachment[] = [
    {
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: `${data.numeroFactura}.pdf`,
      contentType: 'application/pdf',
      contentBytes: pdfBase64,
    },
  ];

  try {
    await sendViaGraph({
      from: senderEmail,
      to: data.to,
      cc: data.cc,
      subject: data.subject,
      htmlBody,
      attachments,
    });
    console.log(`[Email Service] Invoice ${data.numeroFactura} sent to ${data.to} via Graph API`);
  } catch (error: any) {
    console.error('[Email Service] Error sending invoice email:', error);
    const detail = error?.message || 'Unknown error';
    throw new Error(`Error al enviar la factura: ${detail}`);
  }
}
