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
    name: "Ecografía Mamaria Bilateral (Botón Mamario)",
    hallazgos: `Se efectuó barrido sonográfico con transductor de alta resolución de ambas regiones mamarias.

Inmediatamente bajo la areola solo se aprecia tejido celular subcutáneo. No se observa botón mamario ni otro tipo de nódulos o lesiones quísticas.
En ambas regiones retroareolares se observa material hipoecogénico compatible con desarrollo de botón mamario. (TELARQUIA)
No se aprecian formaciones nodulares ni quísticas de aspecto patológico.
Piel y celular subcutáneo de aspecto ecográfico normal.
Plano muscular y óseo subyacente sin alteraciones.`,
    impresion: `Examen sin hallazgos patológicos.
Desarrollo de botón mamario bilateral.`
  },
  // 2
  {
    name: "0404016MD - Ecografía Partes Blandas Mano Derecha",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico de mano derecha.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Tendones extensores de aspecto conservado.
Tendones flexores de ecogenicidad normal.
No se observa derrame articular.
No se observan quistes ni gangliones.
Resto de estructuras exploradas sin alteraciones.`,
    impresion: "Estudio dentro de límites normales."
  },
  {
    name: "0404016MI - Ecografía Partes Blandas Mano Izquierda",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico de mano izquierda.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Tendones extensores de aspecto conservado.
Tendones flexores de ecogenicidad normal.
No se observa derrame articular.
No se observan quistes ni gangliones.
Resto de estructuras exploradas sin alteraciones.`,
    impresion: "Estudio dentro de límites normales."
  },
  // 3
  {
    name: "0404016MÑD - Ecografía Partes Blandas Muñeca Derecha",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en muñeca derecha.

Tendones extensores de grosor y ecogenicidad normal. 
No se observa engrosamiento de las vainas ni derrame peritendíneo.
No hay evidencias de quistes sinoviales ni gangliones.
No se demostró derrame articular.
Tendones flexores que conforman el túnel de aspecto ecográfico normal.
El nervio mediano presenta un área de sección transversal máxima de XX mm2 a nivel de retináculo.
Fibrocartílago triangular de aspecto ecográfico normal.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  {
    name: "0404016MÑI - Ecografía Partes Blandas Muñeca Izquierda",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en muñeca izquierda.

Tendones extensores de grosor y ecogenicidad normal. 
No se observa engrosamiento de las vainas ni derrame peritendíneo.
No hay evidencias de quistes sinoviales ni gangliones.
No se demostró derrame articular.
Tendones flexores que conforman el túnel de aspecto ecográfico normal.
El nervio mediano presenta un área de sección transversal máxima de XX mm2 a nivel de retináculo.
Fibrocartílago triangular de aspecto ecográfico normal.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  // 4
  {
    name: "04040416PA - Ecografía Partes Blandas Pared Abdominal",
    hallazgos: `Se realiza barrido sonográfico con transductor de alta resolución en pared abdominal.

NORMAL
Piel y tejido celular subcutáneo de aspecto ecográfico normal.
A pesar de efectuar maniobra de valsalva no se demostró hernias de la pared.
Plano muscular subyacente sin alteraciones.
No hay procesos expansivos sólidos.

HERNIA UMBILICAL
En la región umbilical se aprecia un defecto de continuidad del plano músculo aponeurótico de aproximadamente X mm de diámetro, compatible con un anillo herniario a través del cual transcurre de forma espontánea y durante la maniobra de valsalva, materia intraabdominal, conformando un saco herniario compuesto fundamentalmente por tejido graso. Este se reduce completamente.
No se observan otras hernias.`,
    impresion: ""
  },
  // 5
  {
    name: "0404016 - Ecografía Partes Blandas o Musculoesquelética (General)",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en zona de estudio.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Plano musculoaponeurótico de aspecto conservado.
No se observan lesiones focales expansivas ni colecciones líquidas.
Contornos óseos regulares.
Vasos sanguíneos de trayectoria y calibre conservado.
Resto de estructuras estudiadas sin alteraciones.`,
    impresion: "Estudio sin hallazgos patológicos."
  },
  {
    name: "0404016o - Ecografía Partes Blandas Otras Regiones",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en zona de estudio.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Plano musculoaponeurótico de aspecto conservado.
No se observan lesiones focales expansivas ni colecciones líquidas.
Contornos óseos regulares.
Vasos sanguíneos de trayectoria y calibre conservado.
Resto de estructuras estudiadas sin alteraciones.`,
    impresion: "Estudio sin hallazgos patológicos."
  },
  {
    name: "0404016oo - Ecografía Partes Blandas Otras Regiones",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en zona de estudio.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
Plano musculoaponeurótico de aspecto conservado.
No se observan lesiones focales expansivas ni colecciones líquidas.
Contornos óseos regulares.
Vasos sanguíneos de trayectoria y calibre conservado.
Resto de estructuras estudiadas sin alteraciones.`,
    impresion: "Estudio sin hallazgos patológicos."
  },
  // 6
  {
    name: "0404006 - Ecografía Pelviana Femenina (No Ginecológica)",
    hallazgos: `Vejiga distendida, de paredes regulares sin imágenes parietales ni endoluminales.
Su volumen premiccional es de X ml.
Útero en AVF de morfología y contornos regulares, con endometrio fino. 
Mide X cm, con un volumen aproximado de X cc.
El ovario derecho mide 0 x 0 x 0 cm, con un volumen aproximado de 0 cc.
El ovario izquierdo mide 0 x 0 x 0 cm, con un volumen aproximado de 0 cc
(No se visualizan anexos)
Fondo de saco posterior libre.
El volumen postmiccional es de X ml.`,
    impresion: "Examen dentro de límites normales."
  },
  // 7
  {
    name: "0404009 - Ecografía Pélvica Masculina (Incluye Vejiga y Próstata)",
    hallazgos: `Vejiga distendida, de paredes regulares sin imágenes parietales ni endoluminales.
Su volumen premiccional es de XX ml.
La glándula prostática es de morfología normal con su parénquima finamente heterogéneo.
Mide y tiene un peso aproximado de XX gramos.
Vesículas seminales de características ecográficas normales.
El volumen postmiccional es de XX ml.`,
    impresion: "Examen dentro de límites normales."
  },
  // 8
  {
    name: "0404016TD - Ecografía Partes Blandas Tobillo Derecho",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en tobillo derecho.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
El tendón del tibial posterior se observa de aspecto ecográfico normal.
El extensor del Hallux y el tibial anterior no muestran alteraciones.
Tendones peroneos de aspecto ecográfico normal.
No se observan quistes ni gangliones.
Tendón de aquiles de grosor y ecogenicidad normal. No hay interrupción del patrón fibrilar, ni compromiso inflamatorio del peritendón.
Resto de estructuras exploradas sin alteraciones.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  {
    name: "0404016TI - Ecografía Partes Blandas Tobillo Izquierdo",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en tobillo izquierdo.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.
El tendón del tibial posterior se observa de aspecto ecográfico normal.
El extensor del Hallux y el tibial anterior no muestran alteraciones.
Tendones peroneos de aspecto ecográfico normal.
No se observan quistes ni gangliones.
Tendón de aquiles de grosor y ecogenicidad normal. No hay interrupción del patrón fibrilar, ni compromiso inflamatorio del peritendón.
Resto de estructuras exploradas sin alteraciones.`,
    impresion: "Estudios sin hallazgos patológicos."
  },
  // 9
  {
    name: "0404015 - Ecografía Tiroidea (Incluye Doppler)",
    hallazgos: `La glándula tiroidea impresiona de morfología, tamaño y ecoestructura normal. 
El parénquima glandular es homogéneo, y no se reconocen imágenes focales.
El LTD mide cm.
El LTI mide cm.
Los contornos de la glándula son regulares.
No se demuestra compresión traqueal.
Grandes vasos del cuello de trayecto y calibre conservado.`,
    impresion: "Estudio dentro de límites normales."
  },
  // 10 & 11
  {
    name: "0404014 - Ecografía Testicular",
    hallazgos: `Testículos bien situados en bolsa escrotal, son de forma, tamaño y ecoestructura normal.
El testículo derecho mide xxxx cm, con un volumen de xxx ml.
El testículo izquierdo mide xxx cm, con un volumen de xxx ml.
Parénquimas testiculares homogéneos, sin imágenes focales.
Epidídimos de características ecográficas normales.
No se visualiza hidrocele.

TESTICULAR BILATERAL:
BARRIDO SONOGRÁFICO DEL TESTÍCULO DERECHO:
Glándula de forma, tamaño y ecoestructura conservada.
Su ecogenicidad es homogénea.
El testículo mide xx cm de eje longitudinal.
No se demuestran imágenes focales ni calcificaciones intraparenquimatosas.
No se observan signos de crecimiento epididimario.
No hay hidrocele.

BARRIDO SONOGRÁFICO DEL TESTÍCULO IZQUIERDO:
Glándula de forma, tamaño y ecoestructura conservada.
Su ecogenicidad es homogénea.
El testículo mide xx cm de eje longitudinal.
No se demuestran imágenes focales ni calcificaciones intraparenquimatosas.
No se observan signos de crecimiento epididimario.
No hay hidrocele.`,
    impresion: ""
  },
  // 12
  {
    name: "0404016RD - Ecografía Partes Blandas Rodilla Derecha",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico de rodilla derecha.

Tendón del cuádriceps y rotuliano de grosor y ecogenicidad normal.
Ligamento colateral medial y lateral de aspecto ecográfico normal.
No se aprecia derrame articular.
Los meniscos en sus porciones visibles no muestran alteraciones.
No se observan quistes.`,
    impresion: "Estudio dentro de límites normales."
  },
  {
    name: "0404016RI - Ecografía Partes Blandas Rodilla Izquierda",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico de rodilla izquierda.

Tendón del cuádriceps y rotuliano de grosor y ecogenicidad normal.
Ligamento colateral medial y lateral de aspecto ecográfico normal.
No se aprecia derrame articular.
Los meniscos en sus porciones visibles no muestran alteraciones.
No se observan quistes.`,
    impresion: "Estudio dentro de límites normales."
  },
  // 13
  {
    name: "0404010 - Ecografía Renal (Bilateral), o de Bazo",
    hallazgos: `Ambos riñones bien situados en el decúbito, son de forma y tamaño normal.
El riñón derecho mide XX cm.
El riñón izquierdo mide XX cm.

PEDIÁTRICO
El riñón derecho mide XX cm con un volumen aproximado de X cc.
El riñón izquierdo mide XX cm con un volumen aproximado de X cc.

Su parénquima es de espesor conservado, sin alteración en su relación corticomedular.
No se observa hidronefrosis, cálculos ni proceso expansivo intrarrenal.
Bazo sin alteraciones.`,
    impresion: "Examen dentro de límites normales."
  },
  // 14
  {
    name: "0404016PID - Ecografía Partes Blandas Pie Derecho",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en región plantar del pie derecho.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.

NORMAL
La fascia plantar, tanto a nivel de su inserción calcánea como hacía su extensión a los dedos, se encuentra de grosor y ecogenicidad conservada.

PATOLOGICO 
La fascia plantar en su inserción calcánea se encuentra engrosada e hipoecogénica y sensible a la compresión dirigida con el transductor.
Los contornos óseos son regulares.
Resto de estructuras estudiadas sin alteraciones.`,
    impresion: ""
  },
  {
    name: "0404016PII - Ecografía Partes Blandas Pie Izquierdo",
    hallazgos: `Con transductor de alta resolución se realiza barrido sonográfico en región plantar del pie izquierdo.

Piel y tejido celular subcutáneo de aspecto ecográfico normal.

NORMAL
La fascia plantar, tanto a nivel de su inserción calcánea como hacía su extensión a los dedos, se encuentra de grosor y ecogenicidad conservada.

PATOLOGICO 
La fascia plantar en su inserción calcánea se encuentra engrosada e hipoecogénica y sensible a la compresión dirigida con el transductor.
Los contornos óseos son regulares.
Resto de estructuras estudiadas sin alteraciones.`,
    impresion: ""
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
  console.log('Seeding parte 3 finalizado.');
  process.exit(0);
}
seed();
