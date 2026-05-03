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

const exactMappings = [
  {
    name: "0404005 - Ecografía Abdominal",
    hallazgos: `HÍGADO GRASO
El hígado es de morfología y tamaño normal. Sus contornos son lisos y su parénquima es homogéneo. Presenta una ecogenicidad aumentada sin demostrarse imágenes focales. 
HÍGADO NORMAL
El hígado es de morfología y tamaño normal. Sus contornos son lisos y su parénquima es homogéneo, sin demostrarse imágenes focales.

Las venas porta y suprahepáticas son de calibre y trayecto conservado.
No hay dilatación de la vía biliar intrahepática.
La extrahepática mide XX mm a nivel del porta hepatis.
La vesícula biliar está bien distendida, de paredes regulares y sin cálculos en su interior.
Bazo sin alteraciones.
Páncreas parcialmente visualizado por interposición de gas intestinal, impresionando en su segmento visible de un aspecto normal.
Ambos riñones son de forma y tamaño normal.
El riñón derecho mide XX cm. El riñón izquierdo mide XX cm.
Su parénquima es de espesor conservado, sin alteración de la relación córticomedular.
No hay evidencias de hidronefrosis, cálculos ni proceso expansivo intrarrenal.
Grandes vasos de calibre y trayecto normales.
No hay evidencias de ascitis, masas ni adenopatías retroperitoneales de carácter patológico.`,
    impresion: "Examen dentro de límites normales."
  },
  {
    name: "0404016AX - Ecografía Partes Blandas Axilar",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en hueco axilar.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
En el hueco axilar no se demostró masas ni adenopatías de carácter patológico.
No se observan lesiones focales expansivas.
Resto del tejido estudiado sin alteraciones.
Vasos sanguíneos de trayectoria y calibre conservado.`,
    impresion: "Estudio sin hallazgos patológicos."
  },
  {
    name: "0404016CAD - Ecografía Partes Blandas Cadera Derecha",
    hallazgos: `Se realiza barrido sonográfico con transductor de alta resolución en cadera derecha.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Los contornos óseos son regulares.
Tendón del glúteo medio y menor se observan de ecogenicidad y grosor normal.
No hay evidencia de bursitis.
El resto de estructuras adyacentes impresionan de aspecto normal.
No se observan evidencias ecográficas de procesos expansivos sólidos.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  {
    name: "0404016CAI - Ecografía Partes Blandas Cadera Izquierda",
    hallazgos: `Se realiza barrido sonográfico con transductor de alta resolución en cadera izquierda.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Los contornos óseos son regulares.
Tendón del glúteo medio y menor se observan de ecogenicidad y grosor normal.
No hay evidencia de bursitis.
El resto de estructuras adyacentes impresionan de aspecto normal.
No se observan evidencias ecográficas de procesos expansivos sólidos.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  {
    name: "0404118a - Ecografía Doppler Arterial Extremidad Inferior",
    hallazgos: `Arterias femorales comunes, superficiales, profundas, poplíteas y troncos tibio peroneos permeables con flujo presente.
Las curvas arteriales son de aspecto morfológico normal, con peak sistólicas dentro del rango fisiológico.
Adecuada permeabilidad de tibiales posteriores, anteriores y pedias.`,
    impresion: ""
  },
  {
    name: "0404118 - Ecografía Doppler Arterial y Venosa Extremidad Inferior",
    hallazgos: `Arterias femorales comunes, superficiales, profundas, poplíteas y troncos tibio peroneos permeables con flujo presente.
Las curvas arteriales son de aspecto morfológico normal, con peak sistólicas dentro del rango fisiológico.
Adecuada permeabilidad de tibiales posteriores, anteriores y pedias.`,
    impresion: ""
  },
  {
    name: "0404121DA - Ecografía Doppler Abdominal",
    hallazgos: `Se realiza estudio Doppler color hepático.

HÍGADO GRASO
El hígado es de morfología y tamaño normal. Sus contornos son lisos y su parénquima es homogéneo. Presenta una ecogenicidad aumentada sin demostrarse imágenes focales. 
HÍGADO NORMAL
El hígado es de morfología y tamaño normal. Sus contornos son lisos y su parénquima es homogéneo, sin demostrarse imágenes focales.

Vena porta de trayecto y calibre normal a nivel de su tronco y ramas principales. El flujo al modo color es hepatópeta. No hay evidencia de trombosis venosa ni signos de cavernomatosis.
Vena esplénica de calibre normal, con flujo adecuado al Doppler color.
Arteria hepática de trayecto y calibre normal con curvas de aspecto morfológico normal y peaks sistólicos en rangos fisiológicos.
Venas suprahepáticas permeables con curvas de aspecto morfológico normal.
No se observa circulación colateral.
No hay dilatación de la vía biliar intrahepática.
La extrahepática mide X mm a nivel del porta hepatis.
La vesícula biliar está bien distendida, de paredes regulares y sin cálculos en su interior.
Bazo sin alteraciones.
Páncreas parcialmente visualizado por interposición de gas intestinal, impresionando en su segmento visible de un aspecto normal.
Ambos riñones son de forma y tamaño normal.
El riñón derecho mide X cm. El riñón izquierdo mide X cm.
Su parénquima es de espesor conservado, sin alteración de la relación córticomedular.
No hay evidencias de hidronefrosis, quistes, cálculos ni proceso expansivo sólido intrarrenal.
No hay evidencias de ascitis, masas ni adenopatías retroperitoneales de carácter patológico.
Grandes vasos de calibre y trayecto normales.`,
    impresion: ""
  },
  {
    name: "Ecografía Doppler Abdominal Aortomesentérico",
    hallazgos: `Se realiza estudio Doppler color abdominal aortomesentérico.

HÍGADO GRASO
El hígado es de morfología y tamaño normal. Sus contornos son lisos y su parénquima es homogéneo. Presenta una ecogenicidad aumentada sin demostrarse imágenes focales. 
HÍGADO NORMAL
El hígado es de morfología y tamaño normal. Sus contornos son lisos y su parénquima es homogéneo, sin demostrarse imágenes focales.

Las venas porta y suprahepáticas son de calibre y trayecto conservado.
No hay dilatación de la vía biliar intrahepática.
La extrahepática mide X mm a nivel del porta hepatis.
La vesícula biliar está bien distendida, de paredes regulares y sin cálculos en su interior.
Bazo sin alteraciones.
Páncreas parcialmente visualizado por interposición de gas intestinal, impresionando en su segmento visible de un aspecto normal.
Ambos riñones son de forma y tamaño normal.
El riñón derecho mide X cm. El riñón izquierdo mide X cm.
Su parénquima es de espesor conservado, sin alteración de la relación córticomedular.
No hay evidencias de hidronefrosis, quistes, cálculos ni proceso expansivo sólido intrarrenal.
No hay evidencias de ascitis, masas ni adenopatías retroperitoneales de carácter patológico.
Grandes vasos de calibre y trayecto normales.
La aorta presenta un diámetro anteroposterior máximo de X mm. 
Las curvas arteriales a nivel de aorta e ilíacas son de aspecto morfológico normal, con peaks sistólicos dentro del rango fisiológico.
Tronco celíaco y sus ramas esplénica y hepática, arteria mesentérica superior y arteria mesentérica inferior permeables con flujo presente. Las curvas presentan peaks sistólicos dentro del rango fisiológico.`,
    impresion: ""
  },
  {
    name: "0404016CU - Ecografía Partes Blandas Cuello",
    hallazgos: `La glándula tiroidea impresiona de morfología, tamaño y ecoestructura normal. 
El parénquima glandular es homogéneo, y no se reconocen imágenes focales.
El LTD mide cm.
El LTI mide cm.
Los contornos de la glándula son regulares.
No se demuestra compresión traqueal.
Grandes vasos del cuello de trayecto y calibre conservado.
Glándulas salivales mayores y menores de aspecto normal.
Resto de estructuras exploradas sin alteraciones.`,
    impresion: "Estudio dentro de límites normales."
  },
  {
    name: "0404016CD - Ecografía Partes Blandas Codo Derecho",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en codo derecho.

Tanto el tendón extensor en su inserción a nivel del epicóndilo como el tendón flexor en su inserción a nivel de la epitróclea impresionan de grosor y ecogenicidad normal.
Tendón del tríceps de grosor y ecogenicidad normal.
Nervio ulnar sin alteraciones.
No hay derrame articular.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  {
    name: "0404016CI - Ecografía Partes Blandas Codo Izquierdo",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en codo izquierdo.

Tanto el tendón extensor en su inserción a nivel del epicóndilo como el tendón flexor en su inserción a nivel de la epitróclea impresionan de grosor y ecogenicidad normal.
Tendón del tríceps de grosor y ecogenicidad normal.
Nervio ulnar sin alteraciones.
No hay derrame articular.`,
    impresion: "Estudios sin hallazgos patológicos."
  }
];

async function seed() {
  for (const p of exactMappings) {
    const key = makeKeyPlantilla(p.name);
    console.log(`Setting template for: ${p.name} -> ${key}`);
    await setDoc(doc(db, 'plantillas_eco', key), {
      prestacionLabel: p.name,
      hallazgos: p.hallazgos,
      impresion: p.impresion,
      recomendaciones: ''
    }, { merge: true });
  }
  console.log('Seeding exacto finalizado.');
  process.exit(0);
}
seed();
