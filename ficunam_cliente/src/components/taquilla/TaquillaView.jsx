import React, { useState, useMemo } from 'react';
import { Search, Building2, MapPin, CheckCircle2, Clock, Check, Ticket } from 'lucide-react';
import { CATEGORIAS_CORTESIA, SALAS_CCU } from '../../constants/salas';
import { categoryBadgeStyle } from '../../utils/dateUtils';

export default function TaquillaView({ courtesies, screenings, onToggleDelivered }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterDelivery, setFilterDelivery] = useState('Todos');

  const filteredTickets = useMemo(() => {
    return courtesies
      .map((c) => {
        const screening = screenings.find((s) => s.id === c.screeningId);
        const sala = SALAS_CCU.find((sa) => sa.id === screening?.salaId);
        return { ...c, screening, sala };
      })
      .filter((item) => item.screening)
      .filter((item) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          item.nombre.toLowerCase().includes(q) ||
          (item.empresa && item.empresa.toLowerCase().includes(q)) ||
          item.correo.toLowerCase().includes(q) ||
          item.screening.pelicula.toLowerCase().includes(q);

        const matchesCategory =
          filterCategory === 'Todas' || item.categoria === filterCategory;

        const matchesDelivery =
          filterDelivery === 'Todos' ||
          (filterDelivery === 'Entregados' && item.entregado) ||
          (filterDelivery === 'Por entregar' && !item.entregado && item.estado === 'aceptada') ||
          (filterDelivery === 'Sin confirmar' && item.estado === 'pendiente');

        return matchesQuery && matchesCategory && matchesDelivery;
      });
  }, [courtesies, screenings, searchQuery, filterCategory, filterDelivery]);

  return (
    <div className="bg-[#111111] border-2 border-[#F4F0EA]/25 p-6 shadow-[6px_6px_0px_0px_#D91E26]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#F4F0EA]/15">
        <div>
          <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block">
            MÓDULO DE ACREDITACIÓN EN SEDE · CCU UNAM
          </span>
          <h2 className="font-ficunam-display text-2xl font-extrabold uppercase tracking-tight text-[#F4F0EA] mt-0.5">
            Buscador para Entrega de Boletos en Taquilla
          </h2>
          <p className="text-xs text-[#F4F0EA]/70 mt-1">
            Busca por nombre de la persona o empresa/medio para visualizar su función, sala asignada y registrar el boleto como entregado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-[#080808] border border-[#F4F0EA]/25 text-center">
            <span className="text-[10px] text-[#F4F0EA]/60 uppercase tracking-wider block">Aceptados</span>
            <span className="text-lg font-extrabold text-[#F4F0EA]">
              {courtesies.filter((c) => c.estado === 'aceptada').length}
            </span>
          </div>
          <div className="px-4 py-2 bg-[#D91E26]/15 border border-[#D91E26] text-center">
            <span className="text-[10px] text-[#F4F0EA] uppercase tracking-wider block">Entregados</span>
            <span className="text-lg font-extrabold text-[#D91E26]">
              {courtesies.filter((c) => c.estado === 'aceptada' && c.entregado).length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 my-6">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-[#D91E26] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de la persona, empresa, medio o película..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#080808] border border-[#F4F0EA]/35 text-sm text-[#F4F0EA] placeholder-[#F4F0EA]/40 focus:outline-none focus:border-[#D91E26]"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/35 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
          >
            <option value="Todas">Todas las categorías</option>
            {CATEGORIAS_CORTESIA.map((cat) => (
              <option key={cat} value={cat}>
                Categoría: {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={filterDelivery}
            onChange={(e) => setFilterDelivery(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/35 text-sm text-[#F4F0EA] focus:outline-none focus:border-[#D91E26]"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Por entregar">Aceptados por entregar</option>
            <option value="Entregados">Entregados</option>
            <option value="Sin confirmar">Sin confirmar correo</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-[#F4F0EA]/25">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#080808] border-b border-[#F4F0EA]/25 text-[11px] uppercase tracking-[0.16em] text-[#F4F0EA]/75">
              <th className="py-3.5 px-4">Nombre / Empresa</th>
              <th className="py-3.5 px-4">Categoría</th>
              <th className="py-3.5 px-4">Función</th>
              <th className="py-3.5 px-4">Sala</th>
              <th className="py-3.5 px-4">Confirmación</th>
              <th className="py-3.5 px-4 text-right">Estatus de Entrega</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F0EA]/10 text-sm">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#F4F0EA]/50">
                  No se encontraron registros que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredTickets.map((item) => (
                <tr key={item.id} className="bg-[#111111] hover:bg-[#161616] transition">
                  <td className="py-4 px-4">
                    <div className="font-bold text-[#F4F0EA]">{item.nombre}</div>
                    <div className="text-xs text-[#F4F0EA]/65 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#D91E26]" />
                      <span>{item.empresa || 'Invitado Individual'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 text-xs font-bold uppercase border ${categoryBadgeStyle(item.categoria)}`}>
                      {item.categoria}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-[#F4F0EA] uppercase">{item.screening.pelicula}</div>
                    <div className="text-xs text-[#F4F0EA]/60">
                      Dir. {item.screening.director} · {item.screening.fecha} ({item.screening.hora} hrs)
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F4F0EA] bg-[#080808] px-3 py-1.5 border border-[#F4F0EA]/25">
                      <MapPin className="w-3.5 h-3.5 text-[#D91E26]" />
                      {item.sala?.nombre}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {item.estado === 'aceptada' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase">
                        <CheckCircle2 className="w-4 h-4" />
                        Aceptada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-bold uppercase">
                        <Clock className="w-4 h-4" />
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {item.entregado ? (
                      <button
                        type="button"
                        onClick={() => onToggleDelivered(item.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-[0.14em] hover:bg-emerald-500/30 transition"
                      >
                        <Check className="w-4 h-4" />
                        Entregado
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleDelivered(item.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#D91E26] hover:bg-[#b8161d] text-white text-xs font-bold uppercase tracking-[0.14em] transition shadow-[3px_3px_0px_0px_#F4F0EA]"
                      >
                        <Ticket className="w-4 h-4" />
                        Marcar Entregado
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
