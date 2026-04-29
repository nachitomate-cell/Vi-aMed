export function esMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent);
}

export function determinarRedirectPostLogin(): string {
  // Prioridad 1: flag explícita de sessionStorage
  const origen = sessionStorage.getItem('loginOrigen');
  if (origen === 'eco-mobile') return '/eco-mobile';

  // Prioridad 2: detección por User Agent
  if (esMobile()) return '/eco-mobile';

  // Default: dashboard para desktop
  return '/dashboard';
}
