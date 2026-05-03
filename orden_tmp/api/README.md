# API Orden de Pago — ViñaMed

Genera PDFs de Órdenes de Pago con el diseño oficial de ViñaMed.  
Cada PDF pesa ~60 KB. Sin dependencias de archivos externos ni base de datos.

---

## Instalación

```bash
npm install
npm start
# → http://localhost:3000
```

---

## Endpoint

### `POST /orden-pago`

**Content-Type:** `application/json`  
**Respuesta:** `application/pdf` (descarga directa)

#### Body — todos los campos

```json
{
  "centroMedico":        "Viñamed",
  "fechaEmision":        "30/04/2026",

  "tipoAtencion":        "Ecografía Doppler arterial",
  "nombreApellidos":     "Juan Pérez",
  "run":                 "12.345.678-9",
  "fechaNacimiento":     "01/01/1990",
  "edad":                "34",
  "sexo":                "Masculino",
  "telefono":            "961752344",
  "fechaIngreso":        "02/05/2026",
  "fechaEmisionDetalle": "30/04/2026",

  "prestaciones": [
    {
      "codigo":      "0404016MUD",
      "descripcion": "ECOGRAFÍA PARTES BLANDAS MUSLO DERECHO",
      "cantidad":    1,
      "exento":      15100,
      "afecto":      0,
      "iva":         0,
      "total":       15100
    }
  ],

  "metodoPago":   "Débito",
  "nroOperacion": "800061959976"
}
```

#### Campos opcionales

| Campo | Por defecto si no se envía |
|---|---|
| `run` | `—` |
| `fechaNacimiento` | `—` |
| `edad` | `—` |
| `sexo` | `—` |
| `telefono` | `—` |
| `fechaEmisionDetalle` | mismo que `fechaEmision` |
| `prestaciones` | lista vacía → "Sin prestaciones registradas." |
| `metodoPago` | no se muestra |
| `nroOperacion` | no se muestra |

---

## Estructura de archivos

```
api-orden-pago/
├── server.js      ← servidor Express + endpoint POST /orden-pago
├── plantilla.js   ← lógica de construcción del PDF (pdfmake)
├── assets.js      ← logo y sello embebidos en base64 (no tocar)
├── package.json
└── README.md
```

---

## Ejemplo con curl

```bash
curl -X POST http://localhost:3000/orden-pago \
  -H "Content-Type: application/json" \
  -d '{"nombreApellidos":"María González","run":"9.876.543-2","tipoAtencion":"Radiografía Tórax","fechaIngreso":"01/05/2026","fechaEmision":"01/05/2026","prestaciones":[{"codigo":"RAD001","descripcion":"RADIOGRAFÍA DE TÓRAX AP","cantidad":1,"exento":8500,"afecto":0,"iva":0,"total":8500}]}' \
  --output OrdenPago_9876543-2.pdf
```

## Ejemplo en JavaScript (fetch)

```js
const response = await fetch('http://localhost:3000/orden-pago', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombreApellidos: 'María González',
    run: '9.876.543-2',
    tipoAtencion: 'Radiografía Tórax',
    fechaIngreso: '01/05/2026',
    fechaEmision: '01/05/2026',
    prestaciones: [{
      codigo: 'RAD001',
      descripcion: 'RADIOGRAFÍA DE TÓRAX AP',
      cantidad: 1,
      exento: 8500,
      afecto: 0,
      iva: 0,
      total: 8500
    }]
  })
});

const blob = await response.blob();
// En el navegador: crear link de descarga
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'OrdenPago.pdf';
a.click();
```

---

## Health check

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```
