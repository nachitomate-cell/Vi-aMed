# ViñaMed - Portal Clínico
## Demo reforzada para operación local y revisión UX/flujo clínico

### Archivos incluidos
- `vinamed_app.html` - Aplicación principal
- `enhancements.js` - Capa nueva de seguridad, persistencia, auditoría y control de emisión
- `manifest.json` - Configuración PWA actualizada
- `sw.js` - Service worker de shell offline, sin cachear datos clínicos dinámicos
- `logo_vinamed.png` - Logo del centro (debes agregarlo si quieres ícono real)

---

## Qué mejoró en esta versión
- Corrección visible de textos con problemas de codificación dentro de la UI.
- Inicio de sesión local de demo por rol: admisión, médico y dirección clínica.
- Cierre automático por inactividad a los 10 minutos.
- Persistencia local en el navegador para pacientes, informes, boxes y bitácora.
- Validación de RUT con dígito verificador al registrar paciente e informe.
- Control de estados clínicos y estados de informe.
- Impresión separada del guardado: ya no imprime automáticamente al guardar.
- Bitácora local de acciones sensibles en dashboard.
- PWA ajustada para cachear la app, no los datos clínicos dinámicos.

---

## Credenciales demo
- `admision@vinamed.cl / Demo1234`
- `medico@vinamed.cl / Demo1234`
- `direccion@vinamed.cl / Demo1234`

---

## Cómo probarla
### Opción A: Netlify Drop
1. Ve a https://app.netlify.com/drop
2. Arrastra la carpeta completa `files`
3. Abre la URL generada
4. Inicia sesión con una cuenta demo
5. Prueba admisión, cambios de box y flujo de informe

### Opción B: servidor local simple
```bash
python -m http.server 8080
```
Luego abre `http://localhost:8080/vinamed_app.html`

---

## Alcance actual
Esta versión es bastante mejor para demo operativa, evaluación de UX y validación de flujo clínico interno.

### Sigue faltando para producción real
- Backend seguro
- Base de datos centralizada
- Control multiusuario concurrente
- Firma electrónica del profesional
- Auditoría inmutable centralizada
- Cifrado, backups y trazabilidad institucional

---

## Nota de seguridad
Aunque ahora la app protege mejor la experiencia local, sigue almacenando información en el navegador del equipo. Úsala solo en entornos de prueba o estaciones institucionales controladas.
