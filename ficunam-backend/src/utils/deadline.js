// Calcula la fecha/hora exacta de la función y el límite de 24 horas antes
export function calculateScreeningDeadline(fecha, hora) {
  const [year, month, day] = fecha.split('-').map(Number);
  const [hours, minutes] = hora.split(':').map(Number);

  // Fecha exacta de la función en hora local
  const screeningDate = new Date(year, month - 1, day, hours, minutes, 0);

  // Exactamente 24 horas antes (en milisegundos)
  const deadlineDate = new Date(screeningDate.getTime() - 24 * 60 * 60 * 1000);
  const now = new Date();

  const deadlineFormatted =
    deadlineDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) +
    ' a las ' +
    deadlineDate.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) +
    ' hrs';

  return {
    screeningDate,
    deadlineDate,
    deadlineFormatted,
    isExpired: now >= deadlineDate
  };
}
