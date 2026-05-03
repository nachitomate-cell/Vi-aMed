import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const makeKeyPlantilla = (label: string): string =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 100);

const plantillasNuevas = [
  // 1
  {
    name: "0404118a - Ecografía Doppler Arterial Extremidad Inferior",
    hallazgos: `Arteria femoral común, superficial, profunda, poplítea y tronco tibio peroneo permeables con flujo presente.
Las curvas arteriales son de aspecto morfológico normal, con peak sistólicas dentro del rango fisiológico.
Adecuada permeabilidad de tibial posterior, anterior y pedia.`,
    impresion: ""
  },
  // 2
  {
    name: "0404118as - Ecografía Doppler Arterial Extremidad Superior",
    hallazgos: `Arterias subclavias, axilares, braquiales, radiales y cubitales de calibre y trayecto normal.
No se aprecian placas parietales ni áreas de estenosis. 
Curvas arteriales de aspecto morfológico normal, con peak sistólicos dentro de rangos fisiológicos.`,
    impresion: "Examen sin hallazgos patológicos."
  },
  {
    name: "0404118s - Ecografía Doppler Arterial y Venosa Extremidad Superior",
    hallazgos: `Arterias subclavias, axilares, braquiales, radiales y cubitales de calibre y trayecto normal.
No se aprecian placas parietales ni áreas de estenosis. 
Curvas arteriales de aspecto morfológico normal, con peak sistólicos dentro de rangos fisiológicos.`,
    impresion: "Examen sin hallazgos patológicos."
  },
  // 3
  {
    name: "0404119 - Ecografía Doppler de Vasos del Cuello",
    hallazgos: `Con transductor de alta resolución se exploran ambos territorios carotídeos y vertebrales.
ACC, ACI y ACE de trayecto y calibre normal.
Bulbos de aspecto morfológico normal.
Las curvas de velocidad son de características morfológicas normales y presentan peak sistólicos dentro de rangos fisiológicos.
Arterias vertebrales con flujo anterógrado.`,
    impresion: ""
  },
  // 4
  {
    name: "0404121R - Ecografía Doppler Renal",
    hallazgos: `Ambos riñones bien situados en el decúbito, son de forma y tamaño normal.
El riñón derecho mide X cm en su eje mayor.
El riñón izquierdo mide X cm en su eje mayor.
Su parénquima es de espesor conservado, sin alteración en su relación corticomedular.
No se observa hidronefrosis, cálculos ni proceso expansivo intrarenal.
Existe adecuada perfusión renal al modo color.
Arterias renales visualizadas a nivel de región del hilio donde son de calibre y trayecto normal. Se llenan adecuadamente al modo Doppler color y presentan curvas de aspecto morfológico normal, con peak sistólicos dentro de rangos fisiológicos. Los índices de resistencia, evaluados a nivel de arterias segmentarias, interlobares y arciformes mantienen su valor en promedio por debajo de X
No se observan áreas de estenosis ni aumento de la velocidad del flujo.
Venas renales permeables.`,
    impresion: ""
  },
  // 5
  {
    name: "0404121 - Ecografía Doppler de Vasos Testiculares",
    hallazgos: `BARRIDO SONOGRÁFICO DEL TESTÍCULO DERECHO:
Glándula de forma, tamaño y ecoestructura conservada.
Su ecogenicidad es homogénea.
El testículo mide X cm de eje longitudinal.
No se demuestran imágenes focales ni calcificaciones intraparenquimatosas.
No se observa hidrocele ni signos de crecimiento epididimario.
Con modo Doppler color se estudia vasculatura capsular e intratesticular, las cuales presentan curvas de velocidad cuyo espectro está en límites normales.
No se visualiza varicocele.
(VARICOCELE)
Leve dilatación del plexo pampiniforme con reflujo a la maniobra de Valsalva demostrado con Doppler color.

BARRIDO SONOGRÁFICO DEL TESTÍCULO IZQUIERDO:
Glándula de forma, tamaño y ecoestructura conservada.
Su ecogenicidad es homogénea.
El testículo mide X cm de eje longitudinal.
No se demuestran imágenes focales ni calcificaciones intraparenquimatosas.
No se observa hidrocele ni signos de crecimiento epididimario.
Con modo Doppler color se estudia vasculatura capsular e intratesticular, las cuales presentan curvas de velocidad cuyo espectro está en límites normales.
No se visualiza varicocele.`,
    impresion: ""
  },
  // 6
  {
    name: "0404118v - Ecografía Doppler Venosa Extremidad Inferior",
    hallazgos: `Venas femorales comunes, profundas, superficiales, poplíteas y troncos tibio peroneo permeables con flujo presente. Se colapsan en forma adecuada al ejercer presión con el transductor y no muestran material ecogénico endoluminal.
Las curvas de velocidad mantienen las características morfológicas normales.
Adecuada permeabilidad de tibiales y peroneas.
No se reconocen comunicantes incompetentes.
Vena safena interna, externa y respectivos cayados permeables.
No hay signos de insuficiencia en el territorio superficial.`,
    impresion: ""
  },
  // 7
  {
    name: "0404118vs - Ecografía Doppler Venosa Extremidad Superior",
    hallazgos: `Venas yugulares internas, subclavias, axilares, braquiales, radiales y cubitales, de calibre y trayecto normal. Se colapsan en forma adecuada al ejercer presión con el transductor y no muestran material ecogénico endoluminal.
Las curvas de velocidades mantienen características morfológicas normales.
Adecuada permeabilidad de venas cefálicas y basílicas.`,
    impresion: ""
  },
  {
    name: "0404118avs - Ecografía Doppler Arterial y Venosa Extremidad Superior",
    hallazgos: `Venas yugulares internas, subclavias, axilares, braquiales, radiales y cubitales, de calibre y trayecto normal. Se colapsan en forma adecuada al ejercer presión con el transductor y no muestran material ecogénico endoluminal.
Las curvas de velocidades mantienen características morfológicas normales.
Adecuada permeabilidad de venas cefálicas y basílicas.`,
    impresion: ""
  },
  // 8
  {
    name: "0404016GD - Ecografía Partes Blandas Glúteo Derecho",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en región glútea derecha

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Los contornos óseos son regulares.
Tendón del glúteo medio y menor sin alteraciones.
No hay evidencia de bursitis.
No se observan evidencias ecográficas de procesos expansivos sólidos.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  {
    name: "0404016GI - Ecografía Partes Blandas Glúteo Izquierdo",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en región glútea izquierda

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Los contornos óseos son regulares.
Tendón del glúteo medio y menor sin alteraciones.
No hay evidencia de bursitis.
No se observan evidencias ecográficas de procesos expansivos sólidos.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  // 9
  {
    name: "0404016HD - Ecografía Partes Blandas Hombro Derecho",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en hombro derecho

El tendón del bíceps es de grosor y ecogenicidad normal. No se aprecia derrame a nivel de su vaina.
Tanto el tendón del subescapular como el infraespinoso impresionan de grosor y ecogenicidad normal.
El tendón del supraespinoso es de grosor y ecogenicidad normal.
La bursa subacromiosubdeltoídea no muestra alteraciones.
Se evalúa además el músculo trapecio sin demostrarse alteraciones a este nivel.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  {
    name: "0404016HI - Ecografía Partes Blandas Hombro Izquierdo",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en hombro izquierdo

El tendón del bíceps es de grosor y ecogenicidad normal. No se aprecia derrame a nivel de su vaina.
Tanto el tendón del subescapular como el infraespinoso impresionan de grosor y ecogenicidad normal.
El tendón del supraespinoso es de grosor y ecogenicidad normal.
La bursa subacromiosubdeltoídea no muestra alteraciones.
Se evalúa además el músculo trapecio sin demostrarse alteraciones a este nivel.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  // 10
  {
    name: "0404016ID - Ecografía Partes Blandas Inguinal Derecha",
    hallazgos: `NORMAL
Al realizar maniobra de valsalva no se demuestra hernia inguinal ni crural.
Piel y tejido celular subcutáneo de aspecto ecográfico normal.
No hay masas ni adenopatías de carácter patológico.
Grandes vasos de trayecto y calibre conservado.
IMPRESIÓN: Estudio negativo para hernia inguinocrural.

DIRECTA
Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Al realizar maniobra de valsalva se demuestra hernia inguinal de tipo directo, dado a que es medial a los vasos epigástricos superficiales y femorales comunes.
El anillo mide X mm y su contenido es principalmente graso y epiplones. 
Se reduce completamente.
No hay masas ni adenopatías de carácter patológico.
Grandes vasos de trayecto y calibre conservado.

INDIRECTA
Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Al realizar maniobra de valsalva se demuestra hernia inguinal de tipo indirecto, dado a que es lateral a los vasos epigástricos superficiales y femorales comunes.
El anillo mide X mm y su contenido es principalmente graso y epiplones. 
Se reduce completamente.
No hay masas ni adenopatías de carácter patológico.
Grandes vasos de trayecto y calibre conservado.`,
    impresion: ""
  },
  {
    name: "0404016II - Ecografía Partes Blandas Inguinal Izquierda",
    hallazgos: `NORMAL
Al realizar maniobra de valsalva no se demuestra hernia inguinal ni crural.
Piel y tejido celular subcutáneo de aspecto ecográfico normal.
No hay masas ni adenopatías de carácter patológico.
Grandes vasos de trayecto y calibre conservado.
IMPRESIÓN: Estudio negativo para hernia inguinocrural.

DIRECTA
Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Al realizar maniobra de valsalva se demuestra hernia inguinal de tipo directo, dado a que es medial a los vasos epigástricos superficiales y femorales comunes.
El anillo mide X mm y su contenido es principalmente graso y epiplones. 
Se reduce completamente.
No hay masas ni adenopatías de carácter patológico.
Grandes vasos de trayecto y calibre conservado.

INDIRECTA
Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Al realizar maniobra de valsalva se demuestra hernia inguinal de tipo indirecto, dado a que es lateral a los vasos epigástricos superficiales y femorales comunes.
El anillo mide X mm y su contenido es principalmente graso y epiplones. 
Se reduce completamente.
No hay masas ni adenopatías de carácter patológico.
Grandes vasos de trayecto y calibre conservado.`,
    impresion: ""
  },
  // 11
  {
    name: "0404016L - Ecografía Partes Blandas Lumbar",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en cono medular y filum terminal.

Cono medular se aprecia de aspecto ecográfico habitual, bien delimitado, móvil y pulsátil sin signos de anclamiento. Se logra apreciar su segmento más distal a nivel de la primera y segunda vértebra lumbar. 
Cauda equina se aprecia de aspecto habitual, libre y pulsátil, sin signos de anclamiento. 
Región sacrocoxígea y plano dermoepidérmico no presentan alteraciones ni soluciones de continuidad.`,
    impresion: "Estudio dentro de límites normales."
  },
  {
    name: "Ecografía Columna Lumbosacra",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en cono medular y filum terminal.

Cono medular se aprecia de aspecto ecográfico habitual, bien delimitado, móvil y pulsátil sin signos de anclamiento. Se logra apreciar su segmento más distal a nivel de la primera y segunda vértebra lumbar. 
Cauda equina se aprecia de aspecto habitual, libre y pulsátil, sin signos de anclamiento. 
Región sacrocoxígea y plano dermoepidérmico no presentan alteraciones ni soluciones de continuidad.`,
    impresion: "Estudio dentro de límites normales."
  },
  // 12
  {
    name: "0404012 - Ecografía Mamaria Bilateral (Incluye Doppler)",
    hallazgos: `Se efectuó barrido sonográfico con transductor de alta resolución de ambas glándulas mamarias.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Parénquimas mamarios difusamente hipoecogénicos por sustitución adiposa parcial (ADIPOSA)
Parénquimas mamarios constituidos por tejido fibroglandular y adiposo de ecogenicidad y distribución habitual. (TIPO 1)
Parénquimas mamarios engrosados e hiperecogénicos por predominio del componente fibroso. (TIPO 2)
No se reconocen imágenes focales sólidas ni quísticas.
Tejido graso y muscular retromamarios libres.
Regiones retroareolares libres.`,
    impresion: `Examen sin hallazgos patológicos.
BIRADS 1.`
  }
];

async function seed() {
  for (const p of plantillasNuevas) {
    const key = makeKeyPlantilla(p.name);
    console.log(`Setting template for: ${p.name} -> ${key}`);
    await setDoc(doc(db, 'plantillas_eco', key), {
      prestacionLabel: p.name,
      hallazgos: p.hallazgos,
      impresion: p.impresion,
      recomendaciones: ''
    }, { merge: true });
  }
  console.log('Seeding parte 2 finalizado.');
  process.exit(0);
}
seed();
