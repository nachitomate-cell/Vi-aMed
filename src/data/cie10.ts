// Subconjunto de códigos CIE-10 frecuentes en atención primaria / medicina
// general. No es el catálogo completo (≈14.000 códigos); es una selección
// práctica para diagnóstico rápido. El médico puede escribir texto libre si
// el diagnóstico no está en la lista.

export interface CodigoCIE10 {
  codigo: string;
  descripcion: string;
}

export const CIE10: CodigoCIE10[] = [
  // Respiratorio
  { codigo: 'J00', descripcion: 'Rinofaringitis aguda (resfrío común)' },
  { codigo: 'J01.9', descripcion: 'Sinusitis aguda' },
  { codigo: 'J02.9', descripcion: 'Faringitis aguda' },
  { codigo: 'J03.9', descripcion: 'Amigdalitis aguda' },
  { codigo: 'J04.0', descripcion: 'Laringitis aguda' },
  { codigo: 'J06.9', descripcion: 'Infección aguda de vías respiratorias superiores' },
  { codigo: 'J11.1', descripcion: 'Influenza con otras manifestaciones respiratorias' },
  { codigo: 'J18.9', descripcion: 'Neumonía, no especificada' },
  { codigo: 'J20.9', descripcion: 'Bronquitis aguda' },
  { codigo: 'J45.9', descripcion: 'Asma, no especificada' },
  { codigo: 'J44.9', descripcion: 'Enfermedad pulmonar obstructiva crónica (EPOC)' },
  { codigo: 'J30.4', descripcion: 'Rinitis alérgica' },

  // Digestivo
  { codigo: 'A09', descripcion: 'Diarrea y gastroenteritis de presunto origen infeccioso' },
  { codigo: 'K21.9', descripcion: 'Reflujo gastroesofágico' },
  { codigo: 'K29.7', descripcion: 'Gastritis, no especificada' },
  { codigo: 'K30', descripcion: 'Dispepsia funcional' },
  { codigo: 'K59.0', descripcion: 'Constipación' },
  { codigo: 'K58.9', descripcion: 'Síndrome de intestino irritable' },
  { codigo: 'B82.9', descripcion: 'Parasitosis intestinal, no especificada' },

  // Cardiovascular / metabólico
  { codigo: 'I10', descripcion: 'Hipertensión arterial esencial (primaria)' },
  { codigo: 'E11.9', descripcion: 'Diabetes mellitus tipo 2' },
  { codigo: 'E10.9', descripcion: 'Diabetes mellitus tipo 1' },
  { codigo: 'E78.5', descripcion: 'Dislipidemia / hiperlipidemia' },
  { codigo: 'E66.9', descripcion: 'Obesidad' },
  { codigo: 'E03.9', descripcion: 'Hipotiroidismo' },
  { codigo: 'E05.9', descripcion: 'Hipertiroidismo / tirotoxicosis' },
  { codigo: 'I49.9', descripcion: 'Arritmia cardíaca, no especificada' },
  { codigo: 'I83.9', descripcion: 'Várices de miembros inferiores' },

  // Urinario / genital
  { codigo: 'N39.0', descripcion: 'Infección de vías urinarias, sitio no especificado' },
  { codigo: 'N30.0', descripcion: 'Cistitis aguda' },
  { codigo: 'N76.0', descripcion: 'Vaginitis aguda' },
  { codigo: 'B37.3', descripcion: 'Candidiasis vulvovaginal' },

  // Músculo-esquelético / dolor
  { codigo: 'M54.5', descripcion: 'Lumbago / dolor lumbar bajo' },
  { codigo: 'M54.2', descripcion: 'Cervicalgia' },
  { codigo: 'M25.5', descripcion: 'Dolor articular (artralgia)' },
  { codigo: 'M79.1', descripcion: 'Mialgia' },
  { codigo: 'M19.9', descripcion: 'Artrosis, no especificada' },
  { codigo: 'M06.9', descripcion: 'Artritis reumatoide, no especificada' },
  { codigo: 'M62.6', descripcion: 'Distensión muscular' },
  { codigo: 'S93.4', descripcion: 'Esguince de tobillo' },

  // Piel
  { codigo: 'L03.9', descripcion: 'Celulitis, no especificada' },
  { codigo: 'L20.9', descripcion: 'Dermatitis atópica' },
  { codigo: 'L23.9', descripcion: 'Dermatitis alérgica de contacto' },
  { codigo: 'L30.9', descripcion: 'Dermatitis, no especificada' },
  { codigo: 'L50.9', descripcion: 'Urticaria' },
  { codigo: 'B02.9', descripcion: 'Herpes zóster' },
  { codigo: 'B00.9', descripcion: 'Herpes simple' },

  // Neurológico / general
  { codigo: 'R51', descripcion: 'Cefalea' },
  { codigo: 'G43.9', descripcion: 'Migraña' },
  { codigo: 'R42', descripcion: 'Mareo y vértigo' },
  { codigo: 'R10.4', descripcion: 'Dolor abdominal, no especificado' },
  { codigo: 'R50.9', descripcion: 'Fiebre, no especificada' },
  { codigo: 'R05', descripcion: 'Tos' },
  { codigo: 'R53', descripcion: 'Malestar y fatiga' },

  // Salud mental
  { codigo: 'F41.1', descripcion: 'Trastorno de ansiedad generalizada' },
  { codigo: 'F32.9', descripcion: 'Episodio depresivo, no especificado' },
  { codigo: 'F43.2', descripcion: 'Trastorno de adaptación' },
  { codigo: 'G47.0', descripcion: 'Insomnio' },

  // Oftalmo / otorrino
  { codigo: 'H10.9', descripcion: 'Conjuntivitis, no especificada' },
  { codigo: 'H66.9', descripcion: 'Otitis media, no especificada' },
  { codigo: 'H92.0', descripcion: 'Otalgia (dolor de oído)' },

  // Sangre / nutrición
  { codigo: 'D50.9', descripcion: 'Anemia por deficiencia de hierro' },
  { codigo: 'E55.9', descripcion: 'Deficiencia de vitamina D' },

  // Controles / preventivo
  { codigo: 'Z00.0', descripcion: 'Examen médico general' },
  { codigo: 'Z00.1', descripcion: 'Control de salud de rutina del niño' },
  { codigo: 'Z34.9', descripcion: 'Supervisión de embarazo normal' },
  { codigo: 'Z23', descripcion: 'Necesidad de inmunización (vacuna)' },
  { codigo: 'Z76.0', descripcion: 'Emisión de receta / repetición de receta' },
];

/** Busca códigos por código o descripción (sin distinguir tildes/mayúsculas). */
export function buscarCIE10(termino: string, maxResultados = 8): CodigoCIE10[] {
  const t = termino
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
  if (!t) return [];
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return CIE10
    .filter(c => norm(c.codigo).includes(t) || norm(c.descripcion).includes(t))
    .slice(0, maxResultados);
}
