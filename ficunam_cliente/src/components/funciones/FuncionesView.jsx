import React, { useState } from 'react';
import { Plus, CheckCircle2, MapPin, Calendar, Clock, Trash2 } from 'lucide-react';
import { SALAS_CCU } from '../../constants/salas';
import { formatDateSpanish } from '../../utils/dateUtils';
import FicunamLogo from '../artwork/FicunamLogo';

export default function FuncionesView({
  screenings,
  moviesGrouped,
  occupancyByScreening,
  onAddScreening,
  onDeleteScreening,
  onGoToCourtesyForMovie
}) {
  const [newPelicula, setNewPelicula] = useState('');
  const [newDirector, setNewDirector] = useState('');
  const [newSeccion, setNewSeccion] = useState('SELECCIÓN OFICIAL');
  const [newSalaId, setNewSalaId] = useState('covarrubias');
  const [newFecha, setNewFecha] = useState('2026-11-09');
  const [newHora, setNewHora] = useState('18:00');
  const [funcionFeedback, setFuncionFeedback] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPelicula.trim() || !newDirector.trim() || !newFecha || !newHora) return;

    const existingCount = (moviesGrouped[newPelicula.trim()]?.horarios?.length || 0) + 1;

    onAddScreening({
      pelicula: newPelicula.trim(),
      director: newDirector.trim(),
      seccion: newSeccion,
      salaId: newSalaId,
      fecha: newFecha,
      hora: newHora
    });

    setFuncionFeedback({
      message:
        existingCount > 1
          ? `Se agregó un nuevo horario para "${newPelicula.trim()}". Ahora cuenta con ${existingCount} funciones en la semana.`
          : `Función "${newPelicula.trim()} (${newDirector.trim()})" registrada correctamente.`
    });

    setTimeout(() => setFuncionFeedback(null), 5000);
  };

  const handleFillExistingMovie = (group) => {
    setNewPelicula(group.pelicula);
    setNewDirector(group.director);
    if (group.seccion) setNewSeccion(group.seccion);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-5 bg-[#111111] border-2 border-[#F4F0EA]/25 p-6 shadow-[6px_6px_0px_0px_#D91E26]">
        <div className="flex items-center justify-between border-b border-[#F4F0EA]/15 pb-4 mb-5">
          <div>
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
              PROGRAMACIÓN OFICIAL · CCU UNAM
            </span>
            <h2 className="font-ficunam-display text-xl font-extrabold uppercase tracking-tight text-[#F4F0EA] mt-0.5">
              Registrar Función y Horario
            </h2>
          </div>
          <FicunamLogo variant="stamp" className="w-20 h-10 shrink-0" />
        </div>

        <p className="text-xs text-[#F4F0EA]/70 mb-5 leading-relaxed">
          Si registras el mismo título de película con otra fecha u hora, el sistema agrupa automáticamente sus horarios de la semana. El control de aforo por sala se aplica de forma interna.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
              Nombre de la Película / Función
            </label>
            <input
              type="text"
              required
              value={newPelicula}
              onChange={(e) => setNewPelicula(e.target.value)}
              placeholder="Ej. El samurái y el prisionero"
              className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] placeholder-[#F4F0EA]/35 focus:outline-none focus:border-[#D91E26]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Director(a)
              </label>
              <input
                type="text"
                required
                value={newDirector}
                onChange={(e) => setNewDirector(e.target.value)}
                placeholder="Ej. Kiyoshi Kurosawa"
                className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] placeholder-[#F4F0EA]/35 focus:outline-none focus:border-[#D91E26]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Sección FICUNAM
              </label>
              <select
                value={newSeccion}
                onChange={(e) => setNewSeccion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
              >
                <option value="SELECCIÓN OFICIAL">SELECCIÓN OFICIAL</option>
                <option value="AHORA MÉXICO">AHORA MÉXICO</option>
                <option value="PREMIERES FICUNAM">PREMIERES FICUNAM</option>
                <option value="TRIBUTO · MEDALLA FILMOTECA UNAM">TRIBUTO</option>
                <option value="COMPETENCIA UMBRALES">UMBRALES</option>
                <option value="ACIERTOS">ACIERTOS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
              Sala (Centro Cultural Universitario UNAM)
            </label>
            <select
              value={newSalaId}
              onChange={(e) => setNewSalaId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
            >
              {SALAS_CCU.map((sala) => (
                <option key={sala.id} value={sala.id}>
                  {sala.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Fecha de Función
              </label>
              <input
                type="date"
                required
                value={newFecha}
                onChange={(e) => setNewFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Hora
              </label>
              <input
                type="time"
                required
                value={newHora}
                onChange={(e) => setNewHora(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#D91E26] hover:bg-[#b8161d] text-white font-bold uppercase tracking-[0.18em] text-xs transition flex items-center justify-center gap-2 border border-[#F4F0EA]/30 shadow-[4px_4px_0px_0px_#F4F0EA]"
          >
            <Plus className="w-4 h-4" />
            Guardar Función / Agregar Horario →
          </button>
        </form>

        {funcionFeedback && (
          <div className="mt-4 p-3.5 border border-[#D91E26] bg-[#D91E26]/15 text-[#F4F0EA] text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#D91E26] shrink-0 mt-0.5" />
            <span>{funcionFeedback.message}</span>
          </div>
        )}
      </div>

      <div className="lg:col-span-7 bg-[#111111] border-2 border-[#F4F0EA]/25 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-[#F4F0EA]/15">
          <div>
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
              CARTELERA ACTIVA · FICUNAM
            </span>
            <h2 className="font-ficunam-display text-xl font-extrabold uppercase tracking-tight text-[#F4F0EA]">
              Funciones y Horarios de la Semana
            </h2>
          </div>
          <span className="text-xs px-3 py-1 bg-[#080808] border border-[#F4F0EA]/30 text-[#F4F0EA] uppercase tracking-[0.15em]">
            {screenings.length} horarios programados
          </span>
        </div>

        <div className="space-y-5">
          {Object.values(moviesGrouped).map((group, idx) => (
            <div
              key={group.pelicula}
              className="border border-[#F4F0EA]/25 bg-[#080808] p-5 hover:border-[#D91E26] transition"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold tracking-[0.22em] uppercase px-2 py-0.5 bg-[#D91E26] text-white">
                      0{idx + 1} · {group.seccion || 'SELECCIÓN OFICIAL'}
                    </span>
                    {group.horarios.length > 1 ? (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] bg-[#F4F0EA] text-[#080808]">
                        {group.horarios.length} horarios en la semana
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] border border-[#F4F0EA]/30 text-[#F4F0EA]/70">
                        1 horario único
                      </span>
                    )}
                  </div>
                  <h3 className="font-ficunam-display text-xl font-extrabold text-[#F4F0EA] uppercase tracking-tight mt-2">
                    {group.pelicula}
                  </h3>
                  <p className="text-xs text-[#F4F0EA]/70 uppercase tracking-[0.14em] mt-0.5">
                    Dirección: <span className="text-[#F4F0EA] font-semibold">{group.director}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillExistingMovie(group)}
                    className="text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 border border-[#F4F0EA]/30 hover:border-[#D91E26] text-[#F4F0EA] transition"
                  >
                    + Otro horario
                  </button>
                  <button
                    type="button"
                    onClick={() => onGoToCourtesyForMovie(group.pelicula)}
                    className="text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 bg-[#D91E26] hover:bg-[#b8161d] text-white font-bold transition"
                  >
                    Dar cortesías →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#F4F0EA]/10">
                {group.horarios.map((h) => {
                  const occ = occupancyByScreening[h.id];
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-3 bg-[#111111] border border-[#F4F0EA]/15"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[#D91E26]">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{h.salaNombre}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#F4F0EA]/90">
                          <Calendar className="w-3.5 h-3.5 text-[#F4F0EA]/50" />
                          <span className="capitalize">{formatDateSpanish(h.fecha)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#F4F0EA]/75">
                          <Clock className="w-3.5 h-3.5 text-[#F4F0EA]/50" />
                          <span className="font-mono font-bold text-[#F4F0EA]">{h.hora} hrs</span>
                          {occ?.cupoLleno && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-[#D91E26] text-white font-bold uppercase">
                              Sala Llena
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteScreening(h.id)}
                        title="Eliminar horario"
                        className="p-1.5 text-[#F4F0EA]/40 hover:text-[#D91E26] transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
