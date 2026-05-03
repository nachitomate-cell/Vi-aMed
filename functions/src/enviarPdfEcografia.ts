import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

function htmlEmail(pacienteNombre: string, pdfUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">
            <tr>
              <td style="background:linear-gradient(135deg,#083344,#0E7490);padding:28px 40px">
                <p style="margin:0;font-size:20px;color:#fff;font-weight:500">Portal Clínico ViñaMed</p>
                <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:.06em;text-transform:uppercase">
                  Centro de Ecografía y Diagnóstico
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px">
                <p style="margin:0 0 8px;font-size:20px;font-weight:500;color:#0F172A">
                  Hola, ${pacienteNombre}
                </p>
                <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6">
                  Tus imágenes ecográficas están disponibles para descargar.
                  Haz clic en el botón para obtener tu PDF.
                  <br><br>
                  <strong>Importante:</strong> Este archivo estará disponible durante 30 días.
                </p>
                <a href="${pdfUrl}"
                   style="display:inline-block;padding:14px 32px;background:#0E7490;color:#fff;border-radius:10px;
                          text-decoration:none;font-size:14px;font-weight:600;margin-bottom:24px">
                  Descargar PDF de Imágenes →
                </a>
                <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6">
                  Si tienes preguntas, comunícate con ViñaMed.
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #F1F5F9;padding:20px 40px;background:#F8FAFC">
                <p style="margin:0;font-size:11px;color:#CBD5E1;text-align:center">
                  © ViñaMed · Medio Oriente 831, Of. 408, Viña del Mar
                  <br>Desarrollado por
                  <a href="https://synaptechspa.cl" style="color:#94A3B8;text-decoration:none">Synaptech Spa</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export const enviarPdfEcografia = onCall(async (request: CallableRequest) => {
  const { docId, pacienteNombre, pacienteEmail, pdfUrl } = request.data;

  if (!docId || !pacienteEmail || !pdfUrl || !pacienteNombre) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos.');
  }

  if (!pacienteEmail.includes('@')) {
    throw new HttpsError('invalid-argument', 'Correo electrónico inválido.');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: `ViñaMed <${process.env.RESEND_FROM_EMAIL || 'noreply@synaptechspa.cl'}>`,
    to: [pacienteEmail],
    subject: 'Tus imágenes ecográficas — ViñaMed',
    html: htmlEmail(pacienteNombre, pdfUrl),
  });

  await admin.firestore().collection('generadorPdf').doc(docId).update({
    emailEnviado:    true,
    emailEnviadoEn:  admin.firestore.FieldValue.serverTimestamp(),
    emailEnviadoPor: request.auth?.uid ?? 'sistema',
  });

  return { ok: true };
});
