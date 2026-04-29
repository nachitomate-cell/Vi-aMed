"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recuperarContrasena = exports.crearProfesional = void 0;
const https_1 = require("firebase-functions/v2/https");
const resend_1 = require("resend");
var crearProfesional_1 = require("./crearProfesional");
Object.defineProperty(exports, "crearProfesional", { enumerable: true, get: function () { return crearProfesional_1.crearProfesional; } });
function generarEmailHTML(nombre) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F3F4F6;padding:40px 0">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:16px;overflow:hidden;
                        border:1px solid #E5E7EB">

            <!-- Header teal -->
            <tr>
              <td style="background:linear-gradient(135deg,#0C4A6E,#0E7490);
                         padding:32px 40px;text-align:center">
                <p style="margin:0;font-size:22px;font-style:italic;
                           color:#fff;font-family:Georgia,serif">
                  Mi Salud
                </p>
                <p style="margin:6px 0 0;font-size:12px;
                           color:rgba(255,255,255,0.65);letter-spacing:.06em;
                           text-transform:uppercase">
                  Portal de pacientes · ViñaMed
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 40px">
                <p style="margin:0 0 8px;font-size:20px;font-weight:500;color:#0F172A">
                  Hola, ${nombre}
                </p>
                <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6">
                  Recibimos una solicitud para recuperar el acceso a tu portal.
                  Tu código de acceso es el mismo que te entregó el centro al
                  momento de tu atención.
                </p>

                <!-- Info box -->
                <div style="background:#F0FDFA;border:1px solid #99F6E4;
                             border-radius:12px;padding:20px 24px;margin-bottom:24px">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:500;
                             color:#0F766E">
                    ¿No recuerdas tu código?
                  </p>
                  <p style="margin:0;font-size:13px;color:#134E4A;line-height:1.6">
                    Contacta a ViñaMed directamente:
                    <br>
                    <a href="tel:+56934222146"
                       style="color:#0E7490;text-decoration:none;font-weight:500">
                      +56 9 3422 2146
                    </a>
                    &nbsp;·&nbsp;
                    <a href="mailto:contacto@vinamed.cl"
                       style="color:#0E7490;text-decoration:none;font-weight:500">
                      contacto@vinamed.cl
                    </a>
                  </p>
                </div>

                <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6">
                  Si no solicitaste esto, puedes ignorar este mensaje con seguridad.
                  Nadie podrá acceder a tu portal sin tu código.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="border-top:1px solid #F1F5F9;padding:20px 40px;
                         background:#F8FAFC">
                <p style="margin:0;font-size:11px;color:#CBD5E1;text-align:center">
                  © ViñaMed · Medio Oriente 831, Of. 408, Viña del Mar
                  <br>
                  Desarrollado por
                  <a href="https://synaptechspa.cl"
                     style="color:#94A3B8;text-decoration:none">
                    Synaptech Spa
                  </a>
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
const intentos = new Map();
function checkRateLimit(ip) {
    const ahora = Date.now();
    const entry = intentos.get(ip);
    if (!entry || ahora > entry.resetAt) {
        intentos.set(ip, { count: 1, resetAt: ahora + 60000 });
        return true;
    }
    if (entry.count >= 3)
        return false;
    entry.count++;
    return true;
}
exports.recuperarContrasena = (0, https_1.onRequest)({ cors: [/localhost:300[0-9]$/, 'https://synaptechspa.cl'] }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método no permitido' });
        return;
    }
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
        res.status(429).json({ error: 'Demasiados intentos. Espera un momento.' });
        return;
    }
    const { email, nombre } = req.body;
    if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Email inválido' });
        return;
    }
    const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
    try {
        await resend.emails.send({
            from: `ViñaMed <${process.env.RESEND_FROM_EMAIL || 'noreply@synaptechspa.cl'}>`,
            to: [email],
            subject: 'Recupera tu acceso — Portal ViñaMed',
            html: generarEmailHTML(nombre || 'Usuario'),
        });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('Resend error:', err);
        res.status(500).json({ error: 'No se pudo enviar el email' });
    }
});
//# sourceMappingURL=index.js.map