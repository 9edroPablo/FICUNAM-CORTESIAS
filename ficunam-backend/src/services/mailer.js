const SALAS_MAP = {
  'julio-bracho': 'Sala Julio Bracho (CCU)',
  'jose-revueltas': 'Sala José Revueltas (CCU)',
  'carlos-monsivais': 'Sala Carlos Monsiváis (CCU)',
  'cineteca-nacional': 'Cineteca Nacional',
  'cine-tonala': 'Cine Tonalá',
  'casa-del-lago': 'Casa del Lago UNAM',
  'cinematografo-del-chopo': 'Cinematógrafo del Chopo'
};

async function sendInvitationEmail(courtesy, screening) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_USER || 'invitaciones@ficunam-cortesias.lat';
  const senderName = 'Dirección Ejecutiva FICUNAM';
  const frontendUrl = (process.env.FRONTEND_URL || 'https://ficunam-cortesiass.vercel.app').replace(/\/$/, '');

  const confirmUrl = `${frontendUrl}/confirmar/${courtesy.token}`;
  const salaNombre = SALAS_MAP[screening.sala] || screening.sala;

  const esEvento = screening.tipo === 'evento';
  const etiquetaTipo = esEvento ? 'al evento especial' : 'a la función de la película';
  const tituloAsunto = esEvento ? 'Evento Especial' : 'Función';
  const directorTexto = (!esEvento && screening.director) ? ` (Dir. ${screening.director})` : '';

  const deadlineFormatted = screening.fechaLimiteConfirmacion
    ? screening.fechaLimiteConfirmacion
    : `${screening.fecha} (2 horas antes del inicio)`;

  const subject = `Invitación personal FICUNAM: ${tituloAsunto} "${screening.pelicula}"`;

  const textTemplate = `Estimado(a) ${courtesy.nombre}${courtesy.empresa ? ` (${courtesy.empresa})` : ''},\n\n` +
    `La Dirección Ejecutiva del Festival Internacional de Cine UNAM (FICUNAM) le extiende una cordial invitación para asistir ${etiquetaTipo} "${screening.pelicula}"${directorTexto}.\n\n` +
    `Detalles:\n` +
    `- Tipo: ${esEvento ? 'Evento' : 'Película'}\n` +
    `- Sala / Sede: ${salaNombre}\n` +
    `- Fecha: ${screening.fecha}\n` +
    `- Horario: ${screening.hora} hrs\n` +
    `- Fecha límite para confirmar: ${deadlineFormatted}\n\n` +
    `Para confirmar su asistencia y obtener su pase personal, ingrese al siguiente enlace:\n` +
    `${confirmUrl}\n\n` +
    `Atentamente,\nDirección Ejecutiva FICUNAM\nCentro Cultural Universitario, UNAM`;

  const htmlTemplate = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #f5f5f5; border: 1px solid #262626; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #171717; padding: 28px 32px; border-bottom: 2px solid #d97706; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px; color: #fbbf24;">FICUNAM</h1>
        <p style="margin: 6px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #a3a3a3;">
          Festival Internacional de Cine UNAM · Dirección Ejecutiva
        </p>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; line-height: 1.6; color: #e5e5e5;">
          Estimado(a) <strong>${courtesy.nombre}</strong>${courtesy.empresa ? ` <span style="color:#a3a3a3;">(${courtesy.empresa})</span>` : ''},
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #d4d4d4;">
          La Dirección Ejecutiva de <strong>FICUNAM</strong> le extiende una cordial invitación para asistir ${etiquetaTipo}:
        </p>
        <div style="background-color: #171717; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 6px;">
          <span style="display: inline-block; background-color: #262626; color: #fbbf24; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px;">
            ${esEvento ? '🥂 Evento Especial' : '🎬 Función de Película'} · ${courtesy.categoria}
          </span>
          <h2 style="margin: 4px 0 6px; font-size: 20px; color: #ffffff;">${screening.pelicula}</h2>
          ${(!esEvento && screening.director) ? `<p style="margin: 0 0 14px; font-size: 14px; color: #a3a3a3;">Dir. ${screening.director}</p>` : '<div style="margin-bottom: 12px;"></div>'}
          <p style="margin: 6px 0; font-size: 14px; color: #e5e5e5;"><strong>📍 Sala / Sede:</strong> ${salaNombre}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #e5e5e5;"><strong>📅 Fecha:</strong> ${screening.fecha}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #e5e5e5;"><strong>🕒 Horario:</strong> ${screening.hora} hrs</p>
          <p style="margin: 10px 0 0; font-size: 12px; color: #fbbf24;"><strong>⏳ Confirmar antes de:</strong> ${deadlineFormatted}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmUrl}" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            Confirmar Asistencia y Obtener Pase
          </a>
        </div>
        <p style="font-size: 12px; color: #737373; text-align: center; margin-top: 24px;">
          Si el enlace directo no abre, copie y pegue la siguiente dirección:<br/>
          <a href="${confirmUrl}" style="color: #f59e0b;">${confirmUrl}</a>
        </p>
      </div>
      <div style="background-color: #141414; padding: 18px 32px; text-align: center; font-size: 12px; color: #737373; border-top: 1px solid #262626;">
        Dirección Ejecutiva FICUNAM · Centro Cultural Universitario, UNAM
      </div>
    </div>
  `;

  if (!brevoApiKey) {
    throw new Error('Falta configurar BREVO_API_KEY en las variables de entorno');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
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

  console.log(`📧 Correo enviado vía Brevo HTTPS a ${courtesy.correo}`);
  return true;
}

module.exports = { sendInvitationEmail, SALAS_MAP };