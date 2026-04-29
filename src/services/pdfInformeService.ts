import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InformeParaPDF {
  pacienteNombre: string;
  pacienteRut: string;
  edad?: string;
  sexo?: string;
  tipoExamen: string;
  regionAnatomica?: string;
  indicacionClinica?: string;
  hallazgos: string;
  impresionEcografica: string;
  recomendaciones?: string;
  codigoExamen?: string;
  fecha?: any;
  firmado?: boolean;
}

type JsPDFWithPlugin = jsPDF & { lastAutoTable: { finalY: number } };

export async function generarPDFInforme(informe: InformeParaPDF, conFirma = false): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as JsPDFWithPlugin;
  const W = 210;
  const margen = 20;
  const anchoUtil = W - margen * 2;
  let y = 15;

  const logoBase64 = await imagenABase64('/logo2.png');
  const firmaBase64 = conFirma
    ? await imagenABase64('/firma.png').catch(() => null)
    : null;

  // Header: logo + datos del centro
  doc.addImage(logoBase64, 'PNG', margen, y, 45, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  const datosCentro = [
    'VIÑAMED - Centro de Imagenología y rehabilitación física',
    'Medio Oriente 831, Oficina 408, Edificio Olympo, Viña del Mar, Chile',
    'Teléfono: 934222146',
    'contacto@vinamed.cl',
    'www.vinamed.cl',
  ];
  datosCentro.forEach((linea, i) => {
    doc.text(linea, W - margen, y + 4 + i * 4, { align: 'right' });
  });

  y += 24;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margen, y, W - margen, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('INFORME ECOGRÁFICO', W / 2, y, { align: 'center' });
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen },
    head: [[{
      content: (informe.tipoExamen?.toUpperCase() ?? '') +
        (informe.regionAnatomica ? `: ${informe.regionAnatomica.toUpperCase()}` : ''),
      colSpan: 4,
      styles: {
        halign: 'center',
        fillColor: [220, 220, 220] as [number, number, number],
        textColor: [0, 0, 0] as [number, number, number],
        fontStyle: 'bold',
        fontSize: 10,
      },
    }]],
    body: [
      [
        { content: 'Paciente', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
        { content: informe.pacienteNombre },
        { content: 'Edad', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
        { content: informe.edad ? `${informe.edad} años` : '-' },
      ],
      [
        { content: 'Rut', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
        { content: informe.pacienteRut },
        { content: 'Sexo', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
        { content: informe.sexo || '-' },
      ],
      [
        { content: 'Fecha de examen', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
        { content: formatearFecha(informe.fecha) },
        { content: 'Código', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
        { content: informe.codigoExamen || '-' },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 62 },
      2: { cellWidth: 20 },
      3: { cellWidth: 60 },
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [180, 180, 180] as [number, number, number],
      lineWidth: 0.2,
    },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 8;

  if (informe.indicacionClinica) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const texto = `Con transductor de alta resolución se realiza barrido sonográfico en ${
      informe.regionAnatomica?.toLowerCase() || 'la región indicada'
    }`;
    doc.text(texto, margen, y);
    y += 7;
  }

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Hallazgos', margen, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const hallazgosLineas = doc.splitTextToSize(informe.hallazgos || '', anchoUtil);
  doc.text(hallazgosLineas, margen, y);
  y += hallazgosLineas.length * 5 + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Impresión ecográfica', margen, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const impresionLineas = doc.splitTextToSize(informe.impresionEcografica || '', anchoUtil);
  doc.text(impresionLineas, margen, y);
  y += impresionLineas.length * 5 + 8;

  if (informe.recomendaciones?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Recomendaciones', margen, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const recomLineas = doc.splitTextToSize(informe.recomendaciones, anchoUtil);
    doc.text(recomLineas, margen, y);
    y += recomLineas.length * 5 + 8;
  }

  if (conFirma && firmaBase64) {
    const espacioRestante = 297 - y - 10;
    if (espacioRestante < 45) {
      doc.addPage();
      y = 20;
    } else {
      y += 10;
    }

    const firmaAncho = 60;
    const firmaAlto = 25;
    const firmaX = (W - firmaAncho) / 2;
    doc.addImage(firmaBase64, 'PNG', firmaX, y, firmaAncho, firmaAlto);
    y += firmaAlto + 2;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(firmaX, y, firmaX + firmaAncho, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Dr. ÁLVARO TRULLENQUE SÁNCHEZ', W / 2, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text('MÉDICO RADIÓLOGO', W / 2, y, { align: 'center' });
    y += 4;
    doc.text('Rut: 7.268.691-8', W / 2, y, { align: 'center' });
  }

  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `ViñaMed · Informe generado el ${new Date().toLocaleDateString('es-CL')} · Página ${i} de ${totalPaginas}`,
      W / 2, 290, { align: 'center' }
    );
  }

  return doc;
}

function formatearFecha(timestamp: any): string {
  if (!timestamp) return '-';
  try {
    const fecha = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return fecha.toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function imagenABase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function descargarPDF(informe: InformeParaPDF, conFirma = false): Promise<void> {
  const doc = await generarPDFInforme(informe, conFirma);
  const rut = informe.pacienteRut?.replace(/\./g, '').replace('-', '') ?? 'sin-rut';
  const tipo = informe.tipoExamen?.replace(/\s+/g, '_') ?? 'Informe';
  const fecha = formatearFecha(informe.fecha).replace(/\//g, '-');
  doc.save(`Informe_${tipo}_${rut}_${fecha}.pdf`);
}
