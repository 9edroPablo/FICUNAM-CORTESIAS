const SALAS_MAP = {
  covarrubias: 'Sala Miguel Covarrubias',
  bracho: 'Sala Julio Bracho',
  chavez: 'Sala Carlos Chávez',
  revueltas: 'Sala José Revueltas',
  monsivais: 'Sala Carlos Monsiváis',
  espiga: 'Explanada de la Espiga (MUAC)'
};

async function sendInvitationEmail(courtesy, screening, customSalaNombre) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_USER || 'invitaciones@ficunam-cortesias.lat';
  const senderName = 'Dirección Ejecutiva FICUNAM';
  const frontendUrl = (process.env.FRONTEND_URL || 'https://ficunam-cortesiass.vercel.app').replace(/\/$/, '');

  const confirmUrl = `${frontendUrl}/confirmar/${courtesy.token}`;
  const salaNombre = customSalaNombre || SALAS_MAP[screening.salaId] || screening.salaId;

  const esEvento = screening.tipo === 'evento';
  const etiquetaTexto = esEvento ? 'al evento especial' : 'a la función especial';
  const subject = `[FICUNAM · ${(courtesy.categoria || 'INVITADOS').toUpperCase()}] Invitación personal ${esEvento ? 'al evento' : 'a la función'} "${screening.pelicula}"`;

  const textTemplate =
    `Estimado(a) ${courtesy.nombre}${courtesy.empresa ? ` (${courtesy.empresa})` : ''}:\n\n` +
    `La Dirección Ejecutiva del Festival Internacional de Cine UNAM (FICUNAM) le extiende una cordial invitación para asistir ${etiquetaTexto} de nuestra programación oficial en el Centro Cultural Universitario:\n\n` +
    `- ${esEvento ? 'Evento' : 'Película'}: ${screening.pelicula}\n` +
    `${!esEvento && screening.director ? `- Dirección: ${screening.director}\n` : ''}` +
    `- Recinto / Sala: ${salaNombre}\n` +
    `- Fecha: ${screening.fecha}\n` +
    `- Horario: ${screening.hora} hrs\n\n` +
    `Tiene hasta 24 horas antes para confirmar su asistencia en el siguiente enlace:\n${confirmUrl}\n\n` +
    `Dirección Ejecutiva FICUNAM · Centro Cultural Universitario UNAM`;

  const htmlTemplate = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #0B0B0B; color: #F4F0EA; border: 2px solid #F4F0EA;">
      <div style="background-color: #050505; padding: 12px 24px; border-bottom: 1px solid #333333; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #F4F0EA;">
        UNAM <span style="color: #D91E26;">/</span> CULTURA UNAM <span style="color: #D91E26;">/</span> FILMOTECA UNAM <span style="color: #D91E26;">/</span> FICUNAM
      </div>
      <div style="padding: 32px 28px;">
        <p style="margin: 0; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #D91E26; font-weight: bold;">
          FESTIVAL INTERNACIONAL DE CINE UNAM · FILMOTECA UNAM
        </p>
        <h1 style="margin: 6px 0 20px; font-size: 24px; text-transform: uppercase; color: #F4F0EA; letter-spacing: -0.5px;">
          INVITACIÓN ESPECIAL · ${(courtesy.categoria || 'INVITADOS').toUpperCase()}
        </h1>
        <p style="font-size: 14px; line-height: 1.6; color: #F4F0EA;">
          Estimado(a) <strong style="color: #ffffff; text-decoration: underline; text-decoration-color: #D91E26;">${courtesy.nombre}</strong>${courtesy.empresa ? ` (${courtesy.empresa})` : ''}:
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #E5E0D8;">
          La Dirección Ejecutiva del <strong>Festival Internacional de Cine UNAM (FICUNAM)</strong> le extiende una cordial invitación para asistir ${etiquetaTexto} de nuestra programación oficial en el Centro Cultural Universitario:
        </p>
        <div style="background-color: #121212; border-left: 4px solid #D91E26; padding: 20px; margin: 24px 0;">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #D91E26; font-weight: bold;">
            ${esEvento ? 'EVENTO ESPECIAL · FICUNAM' : 'FUNCIÓN Y DIRECTOR(A)'}
          </div>
          <div style="font-size: 20px; font-weight: 800; text-transform: uppercase; color: #F4F0EA; margin-top: 4px;">
            ${screening.pelicula}
          </div>
          ${(!esEvento && screening.director) ? `<div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #A8A29E; margin-top: 2px;">Dir. ${screening.director}</div>` : ''}
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #262626; font-size: 12px; color: #F4F0EA;">
            <p style="margin: 4px 0;"><strong>RECINTO / SALA:</strong> ${salaNombre}</p>
            <p style="margin: 4px 0;"><strong>FECHA:</strong> ${screening.fecha}</p>
            <p style="margin: 4px 0;"><strong>HORARIO:</strong> <span style="color: #D91E26; font-weight: bold;">${screening.hora} hrs</span></p>
          </div>
        </div>
        <div style="padding: 14px; border: 1px solid #D91E26; background-color: rgba(217, 30, 38, 0.1); font-size: 12px; color: #F4F0EA; margin-bottom: 24px;">
          <strong>IMPORTANTE:</strong> Este enlace estará activo hasta <strong>24 horas antes</strong> del inicio. Validez exclusiva para 1 persona (personal e intransferible).
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${confirmUrl}" style="background-color: #D91E26; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; display: inline-block; border: 1px solid #F4F0EA;">
            Aceptar Invitación (Pase para 1 Persona) →
          </a>
        </div>
        <p style="font-size: 11px; color: #888888; text-align: center; margin-top: 20px;">
          Link directo: <a href="${confirmUrl}" style="color: #D91E26;">${confirmUrl}</a>
        </p>
      </div>
    </div>
  `;

  if (!brevoApiKey) {
    throw new Error('Falta configurar BREVO_API_KEY en Render');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': brevoApiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      replyTo: { name: 'Dirección Ejecutiva FICUNAM', email: 'asistencia.direccionejecutiva@fic.unam.mx' },
      to: [{ email: courtesy.correo, name: courtesy.nombre }],
      subject,
      htmlContent: htmlTemplate,
      textContent: textTemplate
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Brevo API Error: ${errText}`);
  }

  return { confirmUrl };
}

module.exports = { sendInvitationEmail, SALAS_MAP };