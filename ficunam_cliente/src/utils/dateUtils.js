export function formatDateSpanish(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function getDeadlineInfo(fecha, hora, referenceTimeStr) {
  if (!fecha || !hora) {
    return { deadlineDate: null, deadlineFormatted: '', isExpired: false, hoursRemaining: 0 };
  }
  const [year, month, day] = fecha.split('-').map(Number);
  const [hours, minutes] = hora.split(':').map(Number);
  const screeningDate = new Date(year, month - 1, day, hours, minutes, 0);
  const deadlineDate = new Date(screeningDate.getTime() - 24 * 60 * 60 * 1000);

  const now = referenceTimeStr ? new Date(referenceTimeStr) : new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));

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
    isExpired: now >= deadlineDate,
    hoursRemaining
  };
}

export function categoryBadgeStyle(cat) {
  switch (cat) {
    case 'Invitados':
      return 'bg-[#D91E26]/20 text-[#FF6B72] border-[#D91E26]/50';
    case 'Aliados':
      return 'bg-[#F4F0EA]/15 text-[#F4F0EA] border-[#F4F0EA]/40';
    case 'Prensa':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    case 'Medios':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/40';
    default:
      return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }
}
