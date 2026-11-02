import React, { useMemo } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CATEGORIAS_CORTESIA, SALAS_CCU } from '../../constants/salas';

export default function ResumenView({ screenings, salas = SALAS_CCU, courtesies }) {
  const summaryRows = useMemo(() => {
    return screenings.map((s) => {
      const sala = salas.find((sa) => sa.id === s.salaId);
      const allForScreening = courtesies.filter((c) => c.screeningId === s.id);
      const acceptedForScreening = allForScreening.filter((c) => c.estado === 'aceptada');
      const deliveredAndAccepted = allForScreening.filter(
        (c) => c.estado === 'aceptada' && c.entregado === true
      );

      const categoryCounts = {
        Invitados: 0,
        Aliados: 0,
        Prensa: 0,
        Medios: 0
      };

      deliveredAndAccepted.forEach((c) => {
        if (categoryCounts[c.categoria] !== undefined) {
          categoryCounts[c.categoria] += 1;
        }
      });

      return {
        screening: s,
        sala,
        aforoTexto: sala?.tipo === 'libre' ? 'Aire libre (Sin aforo fijo)' : `${sala?.aforo || '-'} lugares`,
        boletosReservados: acceptedForScreening.length,
        categoryCounts,
        totalEntregados: deliveredAndAccepted.length
      };
    });
  }, [screenings, salas, courtesies]);

  const handleExportExcel = () => {
    const resumenSheetData = summaryRows.map((row) => ({
      Tipo: row.screening.tipo === 'evento' ? 'EVENTO' : 'PELÍCULA',
      Título: row.screening.pelicula,
      Director: row.screening.tipo === 'evento' ? 'N/A' : row.screening.director,
      Fecha: row.screening.fecha,
      Horario: `${row.screening.hora} hrs`,
      Sala: row.sala?.nombre || row.screening.salaId,
      Aforo: row.aforoTexto,
      'Boletos Reservados (Aceptados)': row.boletosReservados,
      Invitados: row.categoryCounts.Invitados,
      Aliados: row.categoryCounts.Aliados,
      Prensa: row.categoryCounts.Prensa,
      Medios: row.categoryCounts.Medios,
      'Total Entregadas': row.totalEntregados
    }));

    const wb = XLSX.utils.book_new();
    const wsResumen = XLSX.utils.json_to_sheet(resumenSheetData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');
    XLSX.writeFile(wb, `Resumen_Ejecutivo_FICUNAM_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="bg-[#111111] border-2 border-[#F4F0EA]/25 p-6 shadow-[6px_6px_0px_0px_#D91E26] print-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F4F0EA]/20">
        <div>
          <span className="text-[10px] tracking-[0.25em] uppercase text-[#D91E26] font-bold block print-text-dark">
            REPORTE DIRECCIÓN EJECUTIVA · FICUNAM
          </span>
          <h2 className="font-ficunam-display text-2xl font-extrabold uppercase tracking-tight text-[#F4F0EA] print-text-dark mt-0.5">
            Resumen de Funciones, Aforos y Cortesías Entregadas
          </h2>
          <p className="text-xs text-[#F4F0EA]/70 mt-1 print-text-dark">
            Las columnas por categoría (<strong>Invitados, Aliados, Prensa y Medios</strong>) contabilizan únicamente las cortesías <strong>aceptadas y efectivamente entregadas</strong> en taquilla (mostrando <strong>0</strong> si no se entregó ninguna).
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#080808] hover:bg-[#181818] text-[#F4F0EA] font-bold text-xs uppercase tracking-[0.18em] transition border-2 border-[#F4F0EA] shadow-[4px_4px_0px_0px_#D91E26]"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#D91E26]" />
            Exportar en Excel →
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F4F0EA] hover:bg-white text-[#080808] font-bold text-xs uppercase tracking-[0.18em] transition border border-[#F4F0EA] shadow-[4px_4px_0px_0px_#D91E26]"
          >
            <FileDown className="w-4 h-4 text-[#D91E26]" />
            Exportar en PDF →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto mt-6 border border-[#F4F0EA]/25">
        <table className="w-full text-left border-collapse print-table">
          <thead>
            <tr className="bg-[#080808] border-b border-[#F4F0EA]/25 text-[11px] uppercase tracking-[0.14em] text-[#F4F0EA]/80">
              <th className="py-3.5 px-4">Función (Película / Evento y Horario)</th>
              <th className="py-3.5 px-4">Sala y Aforo</th>
              <th className="py-3.5 px-4 text-center">
                Boletos Reservados
                <span className="block text-[10px] text-[#D91E26] font-normal">(Total Aceptados)</span>
              </th>
              <th className="py-3.5 px-3 text-center">Invitados</th>
              <th className="py-3.5 px-3 text-center">Aliados</th>
              <th className="py-3.5 px-3 text-center">Prensa</th>
              <th className="py-3.5 px-3 text-center">Medios</th>
              <th className="py-3.5 px-4 text-center">Total Entregadas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F0EA]/15 text-sm">
            {summaryRows.map((row) => {
              const esEvento = row.screening.tipo === 'evento';
              return (
                <tr key={row.screening.id} className="bg-[#111111] hover:bg-[#161616]">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#D91E26] text-white font-bold uppercase">
                        {esEvento ? 'EVENTO' : 'PELÍCULA'}
                      </span>
                      <span className="font-bold text-[#F4F0EA] uppercase print-text-dark">
                        {row.screening.pelicula}
                      </span>
                    </div>
                    {!esEvento && row.screening.director && (
                      <div className="text-xs text-[#F4F0EA]/65 print-text-dark mt-0.5">
                        Dir. {row.screening.director}
                      </div>
                    )}
                    <div className="text-xs text-[#D91E26] font-mono mt-0.5 print-text-dark">
                      {row.screening.fecha} · {row.screening.hora} hrs
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-[#F4F0EA] text-xs uppercase print-text-dark">
                      {row.sala?.nombre || row.screening.salaId}
                    </div>
                    <div className="text-xs text-[#F4F0EA]/70 print-text-dark">{row.aforoTexto}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-[#080808] border border-[#F4F0EA]/30 font-extrabold text-[#F4F0EA] print-text-dark">
                      {row.boletosReservados}
                    </span>
                  </td>
                  {CATEGORIAS_CORTESIA.map((cat) => (
                    <td key={cat} className="py-4 px-3 text-center font-mono font-bold">
                      <span
                        className={`inline-block min-w-[2.2rem] py-1 px-2 border ${
                          row.categoryCounts[cat] > 0
                            ? 'bg-[#D91E26]/20 border-[#D91E26] text-[#F4F0EA] print-text-dark'
                            : 'bg-[#080808] border-[#F4F0EA]/15 text-[#F4F0EA]/40 print-text-dark'
                        }`}
                      >
                        {row.categoryCounts[cat]}
                      </span>
                    </td>
                  ))}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-[#D91E26] text-white font-extrabold print-text-dark">
                      {row.totalEntregados}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}