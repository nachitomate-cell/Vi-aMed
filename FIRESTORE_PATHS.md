# Paths de Firestore — ViñaMed
Cualquier cambio a estas colecciones debe actualizarse aquí primero.

## Proyectos Firebase
- **vinamed-10b76** — Proyecto principal (lectura + escritura)
- **medicenter-3cb92** — Legacy DICOM (solo lectura)

## Colecciones (vinamed-10b76)
- citas/{citaId}
- resultados/{resultadoId}
- profesionales/{profesionalId}
- users/{uid}
- horarios/{profesionalId}
- bloqueos/{bloqueoId}
- informes/{informeId}

## Formato canónico de RUT
Siempre con puntos y guión: 17.543.210-K
Nunca: 17543210K ni 17543210-K ni 17.543.210K
Aplicar esta normalización en TODOS los puntos de escritura.
Usar `normalizarRut()` de `src/utils/rut.ts` antes de cada write a Firestore.
