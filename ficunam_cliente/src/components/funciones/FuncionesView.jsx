import React, { useState, useRef } from 'react';
import { Plus, CheckCircle2, MapPin, Calendar, Clock, Trash2, AlertTriangle, FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SALAS_CCU } from '../../constants/salas';
import { formatDateSpanish } from '../../utils/dateUtils';
import FicunamLogo from '../artwork/FicunamLogo';

// Mapea abreviaturas ("J. BRACHO", "M. COVARRUBIAS", etc.) o nombres a las salas registradas
function matchSalaId(rawSalaText, salasList) {
  const clean = String(rawSalaText || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!clean) return 'covarrubias';

  if (clean.includes('BRACHO')) return 'bracho';
  if (clean.includes('REVUELTAS')) return 'revueltas';
  if (clean.includes('COVARRUBIAS')) return 'covarrubias';
  if (clean.includes('MONSIVAIS')) return 'monsivais';
  if (clean.includes('CHAVEZ')) return 'chavez';
  if (clean.includes('ESPIGA') || clean.includes('MUAC')) return 'espiga';

  const found = salasList.find((s) => {
    const sName = s.nombre.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.id.toUpperCase() === clean || sName.includes(clean) || clean.includes(sName);
  });

  return found ? found.id : 'covarrubias';
}

// Extrae Título en Español y Director del bloque multilínea original de FICUNAM
function parseRawTitleAndDirector(rawCellText, esEvento) {
  let lines = String(rawCellText || '')
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^"+|"+$/g, '').trim())
    .filter(Boolean);

  if (lines.length === 0) return { pelicula: '', director: '' };

  if (lines[0].startsWith('–') && lines[0].endsWith('–') && lines.length > 1) {
    lines = lines.slice(1);
  }

  let titleLine = lines[0];
  let dirLine = lines[1] || '';

  if (lines[0].toLowerCase() === 'cinema kabuki' && lines.length >= 3) {
    titleLine = `${lines[0]}: ${lines[1]}`;
    dirLine = lines[2];
  }

  let spanishTitle = titleLine.split('|')[0].trim();
  spanishTitle = spanishTitle
    .replace(/\s*\([^\)]*[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]+[^\)]*\)\s*$/g, '')
    .replace(/^"+|"+$/g, '')
    .trim();

  let director = '';
  if (!esEvento && dirLine) {
    director = dirLine.split('|')[0].replace(/^"+|"+$/g, '').trim();
    if (spanishTitle.toUpperCase().includes('PELECHIAN') && (director.includes('Nosotros') || director.includes('Patrulla'))) {
      director = `Artavazd Pelechian (${director})`;
    }
  }

  return { pelicula: spanishTitle, director };
}

function normalizeExcelDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  const str = String(val).trim();
  const matchIso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchIso) return matchIso[1];
  return str.slice(0, 10);
}

function normalizeExcelTime(val) {
  if (val === null || val === undefined || val === '') return '18:00';
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof val === 'number') {
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  const matchTime = str.match(/(\d{1,2}):(\d{2})/);
  if (matchTime) {
    return `${ matchTime[1].padStart(2, '0') }:${ matchTime[2] }`;
  }
  return '18:00';
}

export default function FuncionesView({
  screenings,
  salas = SALAS_CCU,
  moviesGrouped,
  occupancyByScreening,
  onAddScreening,
  onBulkAddScreenings,
  onAddExtraVenue,
  onDeleteScreening,
  onGoToCourtesyForMovie
}) {
  const [newTipo, setNewTipo] = useState('pelicula');
  const [newPelicula, setNewPelicula] = useState('');
  const [newDirector, setNewDirector] = useState('');
  const [newSalaId, setNewSalaId] = useState('covarrubias');
  const [newFecha, setNewFecha] = useState('2026-11-09');
  const [newHora, setNewHora] = useState('18:00');
  const [newLimiteCortesias, setNewLimiteCortesias] = useState('50');
  const [funcionFeedback, setFuncionFeedback] = useState(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const fileInputRef = useRef(null);

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

  // Procesa tanto la Plantilla Limpia como el archivo crudo "Copia de FIC16_Cortesías.xlsx"
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingExcel(true);
    setFuncionFeedback(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

      // Buscar en qué fila están los encabezados ("TÍTULO DE LA PELÍCULA" o "Título en Español")
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const rowStr = rawRows[i].map((c) => String(c).toUpperCase()).join(' ');
        if (rowStr.includes('TITULO') || rowStr.includes('TÍTULO') || rowStr.includes('PELICULA') || rowStr.includes('PELÍCULA')) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawRows[headerRowIndex].map((h) => String(h || '').trim().toUpperCase());
      const findCol = (...keywords) =>
        headers.findIndex((h) => keywords.some((k) => h.includes(k)));

      const colTitulo = findCol('TITULO EN ESPAÑOL', 'TÍTULO EN ESPAÑOL', 'TÍTULO DE LA PELÍCULA', 'TITULO');
      const colDirector = findCol('DIRECTOR');
      const colFecha = findCol('FECHA');
      const colHora = findCol('HORA');
      const colSala = findCol('SALA');
      const colPlataforma = findCol('PLATAFORMA', 'LÍMITE', 'LIMITE');
      const colEvento = findCol('EVENTO');

      const parsedItems = [];

      for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const rawTitleCell = colTitulo >= 0 ? row[colTitulo] : '';
        if (!rawTitleCell || String(rawTitleCell).toUpperCase().includes('TOTAL FUNCIONES')) continue;

        // Regla: Límite de cortesías es la columna Plataforma. Si es <= 0 o vacío, NO se agrega.
        const rawPlat = colPlataforma >= 0 ? row[colPlataforma] : null;
        const limiteNum = Number(rawPlat);
        if (rawPlat === '' || rawPlat === null || Number.isNaN(limiteNum) || limiteNum <= 0) {
          continue;
        }

        // Regla: Si en la columna Evento dice "S", es un evento (sin director); si no, es película.
        const rawEvento = colEvento >= 0 ? String(row[colEvento] || '').trim().toUpperCase() : '';
        const esEvento = rawEvento === 'S' || rawEvento === 'EVENTO' || rawEvento === 'SI' || rawEvento === 'SÍ';

        let pelicula = '';
        let director = '';

        if (colDirector >= 0 && String(row[colDirector] || '').trim() !== '') {
          // Viene de la plantilla con columnas separadas
          pelicula = String(rawTitleCell).split('|')[0].trim();
          director = esEvento ? '' : String(row[colDirector]).split('|')[0].trim();
        } else {
          // Viene del Excel original de FICUNAM con título + director en la misma celda
          const extracted = parseRawTitleAndDirector(rawTitleCell, esEvento);
          pelicula = extracted.pelicula;
          director = extracted.director;
        }

        if (!pelicula) continue;

        const salaRaw = colSala >= 0 ? row[colSala] : '';
        const salaId = matchSalaId(salaRaw, salas);
        const fecha = normalizeExcelDate(colFecha >= 0 ? row[colFecha] : '');
        const hora = normalizeExcelTime(colHora >= 0 ? row[colHora] : '');

        if (!fecha) continue;

        parsedItems.push({
          tipo: esEvento ? 'evento' : 'pelicula',
          pelicula,
          director: esEvento ? '' : director,
          salaId,
          fecha,
          hora,
          limiteCortesias: Math.round(limiteNum)
        });
      }

      if (parsedItems.length === 0) {
        throw new Error('No se encontraron funciones con cupo en Plataforma mayor a 0 en el archivo.');
      }

      if (onBulkAddScreenings) {
        await onBulkAddScreenings(parsedItems);
      } else {
        for (const item of parsedItems) {
          await onAddScreening(item);
        }
      }

      setFuncionFeedback({
        message: `¡Importación exitosa! Se cargaron ${parsedItems.length} funciones y eventos (con Plataforma > 0) desde el archivo Excel.`
      });
    } catch (err) {
      alert(`Error al importar Excel: ${err.message}`);
    } finally {
      setImportingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

        {/* CARGA MASIVA DESDE EXCEL (Punto 3) */}
        <div className="mb-6 p-4 bg-[#080808] border border-[#D91E26]/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D91E26] flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Carga Masiva desde Excel (.xlsx)
            </span>
          </div>
          <p className="text-[11px] text-[#F4F0EA]/70 leading-relaxed">
            Sube la plantilla o el archivo de programación. Extrae títulos en español, directores, salas abreviadas, eventos (<strong>S</strong>) y filtra automáticamente donde <strong>Plataforma &gt; 0</strong>.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={importingExcel}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 bg-[#F4F0EA] hover:bg-white text-[#080808] font-bold uppercase tracking-[0.16em] text-xs transition flex items-center justify-center gap-2 border border-[#F4F0EA] shadow-[3px_3px_0px_0px_#D91E26]"
          >
            <Upload className="w-4 h-4 text-[#D91E26]" />
            {importingExcel ? 'Procesando archivo Excel...' : 'Subir Archivo Excel de Funciones →'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder={newTipo === 'evento' ? 'Ej. Competencia Umbrales • 1' : 'Ej. El mal no existe'}
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
                placeholder="Ej. Ryūsuke Hamaguchi"
                className="w-full px-3.5 py-2.5 bg-[#080808] border border-[#F4F0EA]/30 text-sm text-[#F4F0EA] placeholder-[#F4F0EA]/35 focus:outline-none focus:border-[#D91E26]"
              />
            </div>
          )}

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
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4F0EA]/80 mb-1.5">
                Límite Cortesías
              </label>
              <input
                type="number"
                min="1"
                value={newLimiteCortesias}
                onChange={(e) => setNewLimiteCortesias(e.target.value)}
                placeholder="Ej. 25"
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