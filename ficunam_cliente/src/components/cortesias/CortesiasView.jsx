import React, { useState } from 'react';
import { User, Mail, CheckCircle2, AlertCircle, Lock, ExternalLink } from 'lucide-react';
import { CATEGORIAS_CORTESIA, SALAS_CCU, SENDER_EMAIL } from '../../constants/salas';
import { formatDateSpanish, getDeadlineInfo, categoryBadgeStyle } from '../../utils/dateUtils';
import FicunamLogo from '../artwork/FicunamLogo';

export default function CortesiasView({
  screenings,
  courtesies,
  moviesGrouped,
  movieTitles,
  selectedMovieTitle,
  selectedScreeningId,
  onSelectMovie,
  onSelectScreeningId,
  occupancyByScreening,
  simulatedNow,
  onSendCourtesy,
  onAcceptInvitation
}) {
  const [guestName, setGuestName] = useState('');
  const [guestCompany, setGuestCompany] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCategory, setGuestCategory] = useState('Invitados');
  const [courtesyFeedback, setCourtesyFeedback] = useState(null);
  const [sending, setSending] = useState(false);

  const availableSchedulesForMovie =
    selectedMovieTitle && moviesGrouped[selectedMovieTitle]
      ? moviesGrouped[selectedMovieTitle].horarios
      : [];

  const currentSelectedScreening =
    screenings.find((s) => s.id === selectedScreeningId) ||
    availableSchedulesForMovie[0] ||
    null;

  const currentDeadline = currentSelectedScreening
    ? getDeadlineInfo(currentSelectedScreening.fecha, currentSelectedScreening.hora, simulatedNow)
    : null;

  const currentSalaObj = currentSelectedScreening
    ? SALAS_CCU.find((s) => s.id === currentSelectedScreening.salaId)
    : null;

  const currentOccupancy = currentSelectedScreening
    ? occupancyByScreening[currentSelectedScreening.id]
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim() || !currentSelectedScreening) return;

    if (currentOccupancy && currentOccupancy.cupoLleno) {
      setCourtesyFeedback({
        type: 'error',
        message: `No es posible asignar más cortesías para esta función: se alcanzó el límite de aforo de la sala (${currentOccupancy.aforoMax} lugares).`
      });
      return;
    }

    setSending(true);
    setCourtesyFeedback(null);
    try {
      const result = await onSendCourtesy({
        nombre: guestName.trim(),
        empresa: guestCompany.trim() || guestCategory,
        correo: guestEmail.trim(),
        categoria: guestCategory,
        screeningId: currentSelectedScreening.id
      });

      setCourtesyFeedback({
        type: 'success',
        confirmUrl: result?.confirmUrl,
        emailEnviado: result?.emailEnviado,
        message: result?.emailEnviado
          ? `Invitación guardada en MongoDB y enviada por correo a ${guestName.trim()} (${guestEmail.trim()}).`
          : `Cortesía guardada en MongoDB. (Ya puedes abrir el link único abajo).`
      });

      setGuestName('');
      setGuestCompany('');
      setGuestEmail('');
    } catch (err) {
      setCourtesyFeedback({
        type: 'error',
        message: err.message
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-5 bg-[#111111] border-2 border-[#F4F0EA]/25 p-6 shadow-[6px_6px_0px_0px_#D91E26]">
        <div className="border-b border-[#F4F0EA]/15 pb-4 mb-5">
          <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
            ACREDITACIÓN PERSONAL · INTRANSFERIBLE
          </span>
          <h2 className="font-ficunam-display text-xl font-extrabold uppercase tracking-tight text-[#F4F0EA] mt-0.5">
            Asignar Cortesía Individual
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
              Nombre completo de la persona invitada
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#F4F0EA]/40 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ej. Natalia Beristáin"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] placeholder-[#F4F0EA]/35 focus:outline-none focus:border-[#D91E26]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="invitado@correo.com"
                className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] placeholder-[#F4F0EA]/35 focus:outline-none focus:border-[#D91E26]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Empresa / Medio / Institución
              </label>
              <input
                type="text"
                value={guestCompany}
                onChange={(e) => setGuestCompany(e.target.value)}
                placeholder="Ej. IMCINE / La Jornada"
                className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] placeholder-[#F4F0EA]/35 focus:outline-none focus:border-[#D91E26]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
              Tipo de Cortesía
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIAS_CORTESIA.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGuestCategory(cat)}
                  className={`py-2 px-3 text-xs font-bold uppercase tracking-[0.12em] border transition ${
                    guestCategory === cat
                      ? 'bg-[#D91E26] text-white border-[#F4F0EA]'
                      : 'bg-[#080808] text-[#F4F0EA]/70 border-[#F4F0EA]/25 hover:border-[#D91E26]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#F4F0EA]/15">
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
              1. Seleccionar Película / Función
            </label>
            <select
              value={selectedMovieTitle}
              onChange={(e) => onSelectMovie(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
            >
              {movieTitles.map((title) => {
                const group = moviesGrouped[title];
                return (
                  <option key={title} value={title}>
                    {group.pelicula} — Dir. {group.director} ({group.horarios.length}{' '}
                    {group.horarios.length > 1 ? 'horarios disponibles' : 'horario'})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80">
                2. Seleccionar Día, Hora y Sala disponible
              </label>
              {availableSchedulesForMovie.length > 1 && (
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D91E26]">
                  {availableSchedulesForMovie.length} fechas en la semana
                </span>
              )}
            </div>

            <div className="space-y-2">
              {availableSchedulesForMovie.map((sched) => {
                const isSelected = currentSelectedScreening?.id === sched.id;
                const dl = getDeadlineInfo(sched.fecha, sched.hora, simulatedNow);
                const occ = occupancyByScreening[sched.id];
                return (
                  <div
                    key={sched.id}
                    onClick={() => onSelectScreeningId(sched.id)}
                    className={`p-3.5 border cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#D91E26]/15 border-[#D91E26]'
                        : 'bg-[#080808] border-[#F4F0EA]/20 hover:border-[#F4F0EA]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#F4F0EA]">
                        {sched.salaNombre}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#111111] text-[#D91E26] border border-[#D91E26]/40">
                        {sched.hora} hrs
                      </span>
                    </div>
                    <div className="text-xs text-[#F4F0EA]/80 capitalize mt-1">
                      {formatDateSpanish(sched.fecha)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className={dl.isExpired ? 'text-rose-400' : 'text-[#F4F0EA]/60'}>
                        {dl.isExpired
                          ? 'Plazo de confirmación cerrado (-24h)'
                          : `Límite confirmación: ${dl.deadlineFormatted}`}
                      </span>
                      {occ?.cupoLleno && (
                        <span className="text-rose-400 font-bold uppercase">Cupo agotado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={currentOccupancy?.cupoLleno || sending || !currentSelectedScreening}
            className={`w-full py-3 px-4 font-bold uppercase tracking-[0.18em] text-xs transition flex items-center justify-center gap-2 border ${
              currentOccupancy?.cupoLleno || sending || !currentSelectedScreening
                ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                : 'bg-[#F4F0EA] hover:bg-white text-[#080808] border-[#F4F0EA] shadow-[4px_4px_0px_0px_#D91E26]'
            }`}
          >
            <Mail className="w-4 h-4 text-[#D91E26]" />
            {sending
              ? 'Guardando y enviando correo...'
              : currentOccupancy?.cupoLleno
              ? 'Aforo máximo alcanzado en esta función'
              : 'Enviar Invitación Personalizada →'}
          </button>
        </form>

        {courtesyFeedback && (
          <div
            className={`mt-4 p-4 border text-xs space-y-2.5 ${
              courtesyFeedback.type === 'error'
                ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                : 'border-[#D91E26] bg-[#D91E26]/15 text-[#F4F0EA]'
            }`}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D91E26] shrink-0 mt-0.5" />
              <span>{courtesyFeedback.message}</span>
            </div>
            {courtesyFeedback.confirmUrl && (
              <div className="pt-2 border-t border-[#F4F0EA]/15 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#F4F0EA]/70 truncate">
                  Link único: {courtesyFeedback.confirmUrl}
                </span>
                <a
                  href={courtesyFeedback.confirmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-[#D91E26] text-white font-bold uppercase text-[10px] inline-flex items-center gap-1 shrink-0"
                >
                  <span>Abrir Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-7 bg-[#111111] border-2 border-[#F4F0EA]/25 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-4 border-b border-[#F4F0EA]/15">
          <div>
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
              PLANTILLA OFICIAL DE CORREO · FICUNAM
            </span>
            <h2 className="font-ficunam-display text-xl font-extrabold uppercase tracking-tight text-[#F4F0EA]">
              Vista Previa de la Invitación por Correo
            </h2>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] bg-[#D91E26] text-white">
            1 PASE PERSONAL INTRANSFERIBLE
          </span>
        </div>

        {currentSelectedScreening && (
          <div className="border-2 border-[#F4F0EA]/30 bg-[#080808] overflow-hidden">
            <div className="bg-[#141414] px-5 py-3.5 border-b border-[#F4F0EA]/15 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#F4F0EA]/50 w-16 uppercase tracking-wider text-[10px]">De:</span>
                <span className="font-mono text-[#F4F0EA] bg-[#080808] px-2 py-0.5 border border-[#F4F0EA]/20">
                  {SENDER_EMAIL}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#F4F0EA]/50 w-16 uppercase tracking-wider text-[10px]">Para:</span>
                <span className="text-[#F4F0EA]">
                  {guestName ? `${guestName} <${guestEmail || 'correo@invitado.mx'}>` : 'Nombre del Invitado <correo@invitado.mx>'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#F4F0EA]/50 w-16 uppercase tracking-wider text-[10px]">Asunto:</span>
                <span className="text-[#F4F0EA] font-bold">
                  [FICUNAM · {guestCategory.toUpperCase()}] Invitación personal a la función "{currentSelectedScreening.pelicula}"
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-[#0B0B0B] text-[#F4F0EA] space-y-6">
              <div className="border-2 border-[#F4F0EA] bg-white p-2">
                <FicunamLogo variant="banner" className="w-full h-24" />
              </div>

              <div className="flex items-center justify-between border-b border-[#F4F0EA]/20 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#D91E26] font-bold">
                    FESTIVAL INTERNACIONAL DE CINE UNAM · FILMOTECA UNAM
                  </p>
                  <h3 className="font-ficunam-display text-2xl font-extrabold uppercase tracking-tight text-[#F4F0EA] mt-1">
                    INVITACIÓN ESPECIAL · {guestCategory.toUpperCase()}
                  </h3>
                </div>
                <span className={`px-3 py-1 text-xs font-bold uppercase border ${categoryBadgeStyle(guestCategory)}`}>
                  {guestCategory}
                </span>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-[#F4F0EA]/90">
                <p>
                  Estimado(a){' '}
                  <strong className="text-white underline decoration-[#D91E26]">
                    {guestName || '[Nombre de la Persona Invitada]'}
                  </strong>
                  {guestCompany ? ` (${guestCompany})` : ''}:
                </p>
                <p>
                  La Dirección Ejecutiva del <strong>Festival Internacional de Cine UNAM (FICUNAM)</strong> le extiende una cordial invitación para asistir a la función especial de nuestra programación oficial en el Centro Cultural Universitario:
                </p>
              </div>

              <div className="bg-[#121212] border-l-4 border-[#D91E26] p-5 space-y-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[#D91E26] font-bold">
                    FUNCIÓN Y DIRECTOR(A)
                  </span>
                  <p className="font-ficunam-display text-xl font-extrabold text-[#F4F0EA] uppercase mt-0.5">
                    {currentSelectedScreening.pelicula}
                  </p>
                  <p className="text-xs text-[#F4F0EA]/70 uppercase tracking-[0.14em]">
                    Dir. {currentSelectedScreening.director}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#F4F0EA]/15 text-xs">
                  <div>
                    <span className="text-[#F4F0EA]/50 block uppercase text-[10px] tracking-wider">Recinto / Sala</span>
                    <span className="text-[#F4F0EA] font-bold">{currentSalaObj?.nombre}</span>
                  </div>
                  <div>
                    <span className="text-[#F4F0EA]/50 block uppercase text-[10px] tracking-wider">Fecha</span>
                    <span className="text-[#F4F0EA] font-bold capitalize">
                      {formatDateSpanish(currentSelectedScreening.fecha)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#F4F0EA]/50 block uppercase text-[10px] tracking-wider">Horario</span>
                    <span className="text-[#D91E26] font-mono font-bold">
                      {currentSelectedScreening.hora} hrs
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F4F0EA]/15 flex items-center justify-between text-[11px] text-[#F4F0EA]/75">
                  <span>Validez del pase: Exclusivo para 1 persona (Personal e intransferible)</span>
                  <span className="font-mono text-[#D91E26]">CATEGORÍA: {guestCategory.toUpperCase()}</span>
                </div>
              </div>

              <div className="p-4 border border-[#D91E26] bg-[#D91E26]/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#F4F0EA] uppercase tracking-[0.14em]">
                  <AlertCircle className="w-4 h-4 text-[#D91E26]" />
                  <span>Importante: Fecha límite para confirmar asistencia</span>
                </div>
                <p className="text-xs text-[#F4F0EA]/85 leading-relaxed">
                  Tiene hasta el{' '}
                  <strong className="text-white underline decoration-[#D91E26]">
                    {currentDeadline?.deadlineFormatted}
                  </strong>{' '}
                  (exactamente <strong>24 horas antes de la función</strong>) para responder y aceptar esta invitación. Pasado este límite, el enlace y el botón de confirmación se desactivarán automáticamente.
                </p>
              </div>

              <div className="pt-2 text-center space-y-2">
                {currentDeadline?.isExpired ? (
                  <button
                    type="button"
                    disabled
                    className="px-6 py-3 bg-zinc-800 text-zinc-500 font-bold text-xs uppercase tracking-[0.18em] border border-zinc-700 cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Enlace Desactivado (Menos de 24h para la función)
                  </button>
                ) : (
                  <div className="inline-block">
                    <span className="px-7 py-3.5 bg-[#D91E26] text-white font-bold text-xs uppercase tracking-[0.2em] shadow-[4px_4px_0px_0px_#F4F0EA] inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Aceptar Invitación (Pase para 1 Persona) →
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-[#F4F0EA]/50">
                  Dirección Ejecutiva FICUNAM · {SENDER_EMAIL}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-[#F4F0EA]/15">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#F4F0EA]/80 mb-3">
            Invitaciones en Base de Datos (MongoDB)
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {courtesies.map((c) => {
              const s = screenings.find((item) => item.id === c.screeningId);
              if (!s) return null;
              const dl = getDeadlineInfo(s.fecha, s.hora, simulatedNow);
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#080808] border border-[#F4F0EA]/15 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#F4F0EA]">{c.nombre}</span>{' '}
                    <span className="text-[#F4F0EA]/50">({c.correo})</span>
                    <div className="text-[11px] text-[#F4F0EA]/60">
                      {s.pelicula} · {s.fecha} {s.hora} hrs
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${categoryBadgeStyle(c.categoria)}`}>
                      {c.categoria}
                    </span>
                    {c.token && (
                      <a
                        href={`/confirmar/${c.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 border border-[#F4F0EA]/30 text-[#F4F0EA]/80 hover:border-[#D91E26] text-[10px] uppercase"
                        title="Abrir link de confirmación del invitado"
                      >
                        Link Invitado ↗
                      </a>
                    )}
                    {c.estado === 'aceptada' ? (
                      <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold uppercase text-[10px]">
                        Aceptada
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={dl.isExpired}
                        onClick={() => onAcceptInvitation(c)}
                        className="px-2.5 py-1 bg-[#D91E26] hover:bg-[#b8161d] text-white font-bold uppercase text-[10px] transition"
                      >
                        Aceptar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}