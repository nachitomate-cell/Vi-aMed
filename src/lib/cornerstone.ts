import cornerstone               from 'cornerstone-core';
import cornerstoneTools          from 'cornerstone-tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser               from 'dicom-parser';

let inicializado = false;

export function inicializarCornerstone() {
  if (inicializado || typeof window === 'undefined') return;

  // ── WADO Image Loader ────────────────────────────────────────
  // @ts-ignore
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  // @ts-ignore
  cornerstoneWADOImageLoader.external.dicomParser  = dicomParser;
  // @ts-ignore
  cornerstoneTools.external.cornerstone = cornerstone;

  // Registramos explícitamente los loaders para evitar fallos en Vite
  try {
    (cornerstone as any).registerImageLoader(
      'wadouri',
      (cornerstoneWADOImageLoader as any).wadouri.loadImage
    );
  } catch (_) {}

  cornerstoneWADOImageLoader.configure({
    useWebWorkers: true,
    decodeConfig: {
      convertFloatPixelDataToInt: false,
      use16BitDataType: true,
    },
  });

  try {
    cornerstoneWADOImageLoader.webWorkerManager.initialize({
      maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 4),
      startWebWorkersOnDemand: true,
      webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.min.js',
      taskConfiguration: {
        decodeTask: {
          loadCodecsOnStartup: true,
          initializeCodecsOnStartup: false,
          // Mantenemos CDN para codecs porque no están en /public
          codecsPath: 'https://unpkg.com/cornerstone-wado-image-loader@3.3.2/dist/cornerstoneWADOImageLoaderCodecs.min.js',
        }
      }
    });
  } catch (err) {
    console.warn('Cornerstone WebWorkers ya estaban inicializados:', err);
  }

  // ── FIX colorLUT: parchear el módulo de segmentación ANTES del init ──
  // Esto evita que cornerstone-tools intente autogenerar 65535 etiquetas
  // cuando el array está vacío, lo cual congela o lanza warnings en v6.
  try {
    const segModule = (cornerstoneTools as any).store?.modules?.segmentation;
    if (segModule) {
      segModule.state = segModule.state || {};
      segModule.state.colorLutTables = [
        new Array(65536).fill(null).map(() => [0, 0, 0, 0])
      ];
    }
  } catch (_) {}

  // ── Init con herramientas ───────────────────────────────────
  cornerstoneTools.init({
    mouseEnabled:          true,
    touchEnabled:          true,
    showSVGCursors:        false,
    globalToolSyncEnabled: false,
  });

  // ── Suprimir warning residual de colorLUT ───────────────────
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('colorLUT only provides') || args[0].includes('unable to remove element'))
    ) {
      return; 
    }
    originalWarn.apply(console, args);
  };

  inicializado = true;
}

export { cornerstone, cornerstoneTools };
