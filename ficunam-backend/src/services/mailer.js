import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export async function sendInvitationEmail({
  courtesy,
  screening,
  salaNombre,
  deadlineFormatted,
  confirmUrl
}) {
  dotenv.config();

  const sender = process.env.SMTP_USER || 'asistencia.direccionejecutiva@fic.unam.mx';
  const resendApiKey = process.env.RESEND_API_KEY;

  const htmlTemplate = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body style="margin:0; padding:0; background-color:#080808; color:#F4F0EA; font-family: 'Helvetica Neue', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080808; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111111; border: 2px solid #F4F0EA; padding: 32px;">
            <tr>
              <td style="border-bottom: 1px solid #333333; padding-bottom: 16px;">
                <p style="margin:0; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#D91E26; font-weight:bold;">
                  FESTIVAL INTERNACIONAL DE CINE UNAM · FILMOTECA UNAM
                </p>
                <h1 style="margin:8px 0 0 0; font-size:24px; text-transform:uppercase; color:#F4F0EA;">
                  INVITACIÓN ESPECIAL · ${courtesy.categoria.toUpperCase()}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 24px; font-size: 15px; line-height: 1.6; color: #F4F0EA;">
                <p>Estimado(a) <strong style="color:#ffffff; text-decoration:underline; text-decoration-color:#D91E26;">${courtesy.nombre}</strong>${courtesy.empresa ? ` (${courtesy.empresa})` : ''}:</p>
                <p>La Dirección Ejecutiva del <strong>Festival Internacional de Cine UNAM (FICUNAM)</strong> le extiende una cordial invitación personal para asistir a la siguiente función en el Centro Cultural Universitario UNAM:</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 0;">
                <table width="100%" cellpadding="16" cellspacing="0" style="background-color:#181818; border-left: 4px solid #D91E26;">
                  <tr>
                    <td>
                      <p style="margin:0; font-size:10px; letter-spacing:2px; color:#D91E26; font-weight:bold; text-transform:uppercase;">FUNCIÓN Y DIRECTOR(A)</p>
                      <h2 style="margin:4px 0; font-size:20px; color:#ffffff; text-transform:uppercase;">${screening.pelicula}</h2>
                      <p style="margin:0 0 12px 0; font-size:13px; color:#cccccc;">Dir. ${screening.director}</p>
                      <p style="margin:4px 0; font-size:13px; color:#F4F0EA;"><strong>Sala:</strong> ${salaNombre}</p>
                      <p style="margin:4px 0; font-size:13px; color:#F4F0EA;"><strong>Fecha:</strong> ${screening.fecha}</p>
                      <p style="margin:4px 0; font-size:13px; color:#D91E26;"><strong>Horario:</strong> ${screening.hora} hrs</p>
                      <p style="margin:12px 0 0 0; font-size:11px; color:#aaaaaa;">* Pase válido exclusivamente para 1 persona (Personal e intransferible).</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 24px;">
                <div style="border: 1px solid #D91E26; background-color: rgba(217, 30, 38, 0.12); padding: 16px;">
                  <p style="margin:0 0 6px 0; font-size:12px; font-weight:bold; text-transform:uppercase; color:#ffffff;">
                    Importante: Fecha límite para confirmar asistencia
                  </p>
                  <p style="margin:0; font-size:13px; color:#F4F0EA; line-height:1.5;">
                    Tiene hasta el <strong>${deadlineFormatted}</strong> (exactamente <strong>24 horas antes de la función</strong>) para aceptar esta invitación. Pasado este límite, el botón y el enlace se desactivarán automáticamente.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 12px 0 24px 0;">
                <a href="${confirmUrl}" style="background-color:#D91E26; color:#ffffff; text-decoration:none; padding: 16px 28px; font-size:13px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; display:inline-block; border: 1px solid #F4F0EA;">
                  ACEPTAR INVITACIÓN (PASE PARA 1 PERSONA) &rarr;
                </a>
              </td>
            </tr>
            <tr>
              <td style="border-top: 1px solid #333333; padding-top: 16px; font-size:11px; color:#888888; text-align:center;">
                Dirección Ejecutiva FICUNAM · ${sender}<br/>
                Centro Cultural Universitario, UNAM
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  // 1. Envío prioritario vía Resend API (HTTP 443, inmune a bloqueos de Render)
  if (resendApiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FICUNAM Cortesías <onboarding@resend.dev>',
        to: [courtesy.correo],
        subject: `[FICUNAM · ${courtesy.categoria.toUpperCase()}] Invitación personal a la función "${screening.pelicula}"`,
        html: htmlTemplate
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API Error: ${JSON.stringify(data)}`);
    }
    console.log('📧 Correo enviado vía Resend HTTPS a:', courtesy.correo, '| ID:', data.id);
    return data;
  }

  // 2. Respaldo vía Nodemailer SMTP tradicional (para pruebas en localhost)
  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: isSecure,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const info = await transporter.sendMail({
    from: `"Dirección Ejecutiva FICUNAM" <${sender}>`,
    to: courtesy.correo,
    subject: `[FICUNAM · ${courtesy.categoria.toUpperCase()}] Invitación personal a la función "${screening.pelicula}"`,
    html: htmlTemplate
  });

  console.log('📧 Correo enviado vía SMTP a:', courtesy.correo, '| ID:', info.messageId);
  return info;
}