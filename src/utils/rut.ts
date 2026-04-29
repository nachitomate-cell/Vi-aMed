// Normaliza cualquier formato de RUT al canónico: 17.543.210-K
export function normalizarRut(rut: string): string {
  if (!rut) return '';
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFormateado = cuerpo
    .split('').reverse()
    .reduce((acc, d, i) => (i % 3 === 0 && i !== 0) ? d + '.' + acc : d + acc, '');
  return `${cuerpoFormateado}-${dv}`;
}

// Valida el dígito verificador con módulo 11
export function validarRut(rut: string): boolean {
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0, multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalc = dvEsperado === 11 ? '0'
               : dvEsperado === 10 ? 'K'
               : String(dvEsperado);
  return dv === dvCalc;
}

// Formatea el valor de un input de RUT en tiempo real
export function formatearRutInput(valor: string): string {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length === 0) return '';
  if (limpio.length === 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv     = limpio.slice(-1);
  const formateado = cuerpo
    .split('').reverse()
    .reduce((acc, d, i) =>
      (i % 3 === 0 && i !== 0) ? d + '.' + acc : d + acc, '');
  return `${formateado}-${dv}`;
}
