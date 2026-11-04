import React, { useState } from 'react';
import { Plus, CheckCircle2, MapPin, Calendar, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { SALAS_CCU } from '../../constants/salas';
import { formatDateSpanish } from '../../utils/dateUtils';
import FicunamLogo from '../artwork/FicunamLogo';

export default function FuncionesView({
  screenings,
  salas = SALAS_CCU,
  moviesGrouped,
  occupancyByScreening,
  onAddScreening,
  onAddExtraVenue,
  onDeleteScreening,
  onGoToCourtesyForMovie
}) {
  const [newTipo, setNewTipo] = useState('pelicula'); // 'pelicula' | 'evento'
  const [newPelicula, setNewPelicula] = useState('');
  const [newDirector, setNewDirector] = useState('');
  const [newSalaId, setNewSalaId] = useState('covarrubias');
  const [newFecha, setNewFecha] = useState('2026-11-09');
  const [newHora, setNewHora] = useState('18:00');
  const [newLimiteCortesias, setNewLimiteCortesias] = useState('50');
  const [funcionFeedback, setFuncionFeedback] = useState(null);

  // Estado para agregar Sala Extra inline (Punto 4)
  const [showAddSala, setShowAddSala] = useState(false);
  const [extraSalaNombre, setExtraSalaNombre] = useState('');
  const [extraSalaAforo, setExtraSalaAforo] = useState('100');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPelicula.trim() || (newTipo === 'pelicula' && !newDirector.trim()) || !newFecha || !newHora) return;

    const existingCount = (moviesGrouped[newPelicula.trim()]?.horarios?.length || 0) + 1;

    onAddScreening({
      tipo: newTipo,
      pelicula: newPelicula.trim(),
      director: newTipo === 'evento' ? '' : newDirector.trim(),
      salaId: newSalaId,
      fecha: newFecha,
      hora: newHora,
      limiteCortesias: newLimiteCortesias ? Number(newLimiteCortesias) : null
    });

    setFuncionFeedback({
      message:
        existingCount > 1
          ? `Se agregó un nuevo horario para "${newPelicula.trim()}". Ahora cuenta con ${existingCount} horarios en la semana.`
          : `${newTipo === 'evento' ? 'Evento' : 'Función'} "${newPelicula.trim()}" registrado correctamente.`
    });

    setTimeout(() => setFuncionFeedback(null), 5000);
  };

  const handleCreateExtraSala = async () => {
    if (!extraSalaNombre.trim() || !onAddExtraVenue) return;
    try {
      const created = await onAddExtraVenue({
        nombre: extraSalaNombre.trim(),
        aforo: extraSalaAforo ? Number(extraSalaAforo) : null,
        tipo: extraSalaAforo && Number(extraSalaAforo) > 0 ? 'fijo' : 'libre'
      });
      setNewSalaId(created.id);
      setExtraSalaNombre('');
      setShowAddSala(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFillExistingMovie = (group) => {
    setNewTipo(group.tipo || 'pelicula');
    setNewPelicula(group.pelicula);
    setNewDirector(group.director || '');
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
          Si registras el mismo título de película o evento con otra fecha u hora, el sistema agrupa automáticamente sus horarios de la semana.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector Película vs Evento (Punto 3) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
              Tipo de Registro
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewTipo('pelicula')}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-[0.14em] border transition ${
                  newTipo === 'pelicula'
                    ? 'bg-[#D91E26] text-white border-[#F4F0EA]'
                    : 'bg-[#080808] text-[#F4F0EA]/70 border-[#F4F0EA]/25 hover:border-[#D91E26]'
                }`}
              >
                Película
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTipo('evento');
                  setNewDirector('');
                }}
                className={`py-2 px-3 text-xs font-bold uppercase tracking-[0.14em] border transition ${
                  newTipo === 'evento'
                    ? 'bg-[#D91E26] text-white border-[#F4F0EA]'
                    : 'bg-[#080808] text-[#F4F0EA]/70 border-[#F4F0EA]/25 hover:border-[#D91E26]'
                }`}
              >
                Evento (Sin Director)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
              {newTipo === 'evento' ? 'Nombre del Evento' : 'Nombre de la Película / Función'}
            </label>
            <input
              type="text"
              required
              value={newPelicula}
              onChange={(e) => setNewPelicula(e.target.value)}
              placeholder={newTipo === 'evento' ? 'Ej. Inauguración FICUNAM / Conversatorio' : 'Ej. El samurái y el prisionero'}
              className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] placeholder-[#F4F0EA]/35 focus:outline-none focus:border-[#D91E26]"
            />
          </div>

          {newTipo === 'pelicula' && (
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
          )}

          {/* Selector de Sala + Botón Sala Extra (Punto 4) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80">
                Sala (Centro Cultural Universitario UNAM)
              </label>
              <button
                type="button"
                onClick={() => setShowAddSala(!showAddSala)}
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D91E26] hover:underline"
              >
                {showAddSala ? '✕ Cancelar' : '+ Agregar Sala Extra'}
              </button>
            </div>

            {showAddSala && (
              <div className="mb-3 p-3 bg-[#080808] border border-[#D91E26] space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D91E26]">
                  Nueva Sala o Sede Extra
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre de la sala"
                    value={extraSalaNombre}
                    onChange={(e) => setExtraSalaNombre(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 bg-[#111111] border border-[#F4F0EA]/30 text-xs text-[#F4F0EA]"
                  />
                  <input
                    type="number"
                    placeholder="Aforo (ej. 120)"
                    value={extraSalaAforo}
                    onChange={(e) => setExtraSalaAforo(e.target.value)}
                    className="px-3 py-2 bg-[#111111] border border-[#F4F0EA]/30 text-xs text-[#F4F0EA]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateExtraSala}
                  className="w-full py-2 bg-[#F4F0EA] text-[#080808] font-bold text-[10px] uppercase tracking-[0.18em]"
                >
                  Guardar Sala Extra
                </button>
              </div>
            )}

            <select
              value={newSalaId}
              onChange={(e) => setNewSalaId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
            >
              {salas.map((sala) => (
                <option key={sala.id} value={sala.id}>
                  {sala.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Fecha de Función
              </label>
              <input
                type="date"
                required
                value={newFecha}
                onChange={(e) => setNewFecha(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
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
                className="w-full px-3 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
              />
            </div>
            {/* Límite de Cortesías Configurable (Punto 2) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Límite Cortesías
              </label>
              <input
                type="number"
                min="1"
                value={newLimiteCortesias}
                onChange={(e) => setNewLimiteCortesias(e.target.value)}
                placeholder="Ej. 50"
                className="w-full px-3 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#D91E26] hover:bg-[#b8161d] text-white font-bold uppercase tracking-[0.18em] text-xs transition flex items-center justify-center gap-2 border border-[#F4F0EA]/30 shadow-[4px_4px_0px_0px_#F4F0EA]"
          >
            <Plus className="w-4 h-4" />
            Guardar {newTipo === 'evento' ? 'Evento' : 'Función'} / Agregar Horario →
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
          {Object.values(moviesGrouped).map((group, idx) => {
            const esEvento = group.tipo === 'evento';
            return (
              <div
                key={group.pelicula}
                className="border border-[#F4F0EA]/25 bg-[#080808] p-5 hover:border-[#D91E26] transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold tracking-[0.22em] uppercase px-2 py-0.5 bg-[#D91E26] text-white">
                        0{idx + 1} · {esEvento ? 'EVENTO ESPECIAL' : 'PELÍCULA'}
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
                    {!esEvento && group.director && (
                      <p className="text-xs text-[#F4F0EA]/70 uppercase tracking-[0.14em] mt-0.5">
                        Dirección: <span className="text-[#F4F0EA] font-semibold">{group.director}</span>
                      </p>
                    )}
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
                          <div className="flex items-center gap-2 text-xs text-[#F4F0EA]/75 flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-[#F4F0EA]/50" />
                            <span className="font-mono font-bold text-[#F4F0EA]">{h.hora} hrs</span>
                            {occ?.limiteCortesias && (
                              <span className="text-[10px] font-mono text-[#F4F0EA]/60">
                                ({occ.totalEnviadas}/{occ.limiteCortesias} cortesías)
                              </span>
                            )}
                            {occ?.limiteAlcanzado && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 border border-amber-500 text-amber-300 font-bold uppercase inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Límite
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
            );
          })}
        </div>
      </div>
    </div>
  );
}