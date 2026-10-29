import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SALAS_CCU } from './constants/salas';
import { INITIAL_SCREENINGS, INITIAL_COURTESIES } from './data/mockData';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import FuncionesView from './components/funciones/FuncionesView';
import CortesiasView from './components/cortesias/CortesiasView';
import TaquillaView from './components/taquilla/TaquillaView';
import ResumenView from './components/resumen/ResumenView';
import ConfirmacionInvitadoView from './components/confirmacion/ConfirmacionInvitadoView';
import {
  fetchScreenings,
  createScreening,
  removeScreening,
  fetchCourtesies,
  createCourtesy,
  acceptCourtesyByToken,
  toggleCourtesyDelivered
} from './services/api';

export default function App() {
  // Detectar si la URL actual es el link de confirmación de un invitado (/confirmar/:token)
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const confirmMatch = pathname.match(/^\/confirmar\/([^/]+)$/);
  const guestToken = confirmMatch ? confirmMatch[1] : null;

  const [activeTab, setActiveTab] = useState('funciones');
  const [screenings, setScreenings] = useState([]);
  const [courtesies, setCourtesies] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [selectedMovieTitle, setSelectedMovieTitle] = useState('');
  const [selectedScreeningId, setSelectedScreeningId] = useState('');

  const loadFromBackend = useCallback(async () => {
    try {
      const [dbScreenings, dbCourtesies] = await Promise.all([
        fetchScreenings(),
        fetchCourtesies()
      ]);
      setScreenings(dbScreenings);
      setCourtesies(dbCourtesies);
      setBackendConnected(true);

      if (dbScreenings.length > 0) {
        setSelectedMovieTitle((prev) => prev || dbScreenings[0].pelicula);
        setSelectedScreeningId((prev) => prev || dbScreenings[0].id);
      }
    } catch (err) {
      console.warn('Backend no detectado en localhost:4000, usando datos locales de respaldo:', err.message);
      setScreenings(INITIAL_SCREENINGS);
      setCourtesies(INITIAL_COURTESIES);
      setBackendConnected(false);
      setSelectedMovieTitle(INITIAL_SCREENINGS[0]?.pelicula || '');
      setSelectedScreeningId(INITIAL_SCREENINGS[0]?.id || '');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    if (!guestToken) {
      loadFromBackend();
    }
  }, [guestToken, loadFromBackend]);

  const moviesGrouped = useMemo(() => {
    const map = {};
    screenings.forEach((s) => {
      const key = s.pelicula.trim();
      if (!map[key]) {
        map[key] = {
          pelicula: s.pelicula,
          director: s.director,
          seccion: s.seccion || 'SELECCIÓN OFICIAL',
          horarios: []
        };
      }
      const sala = SALAS_CCU.find((salaItem) => salaItem.id === s.salaId);
      map[key].horarios.push({
        ...s,
        salaNombre: sala ? sala.nombre : 'Sala',
        salaAforo: sala ? sala.aforo : null,
        salaTipo: sala ? sala.tipo : 'fijo'
      });
    });

    Object.values(map).forEach((group) => {
      group.horarios.sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
    });

    return map;
  }, [screenings]);

  const movieTitles = useMemo(() => Object.keys(moviesGrouped), [moviesGrouped]);

  const occupancyByScreening = useMemo(() => {
    const counts = {};
    screenings.forEach((s) => {
      const sala = SALAS_CCU.find((item) => item.id === s.salaId);
      const totalEnviadas = courtesies.filter((c) => c.screeningId === s.id).length;
      const totalAceptadas = courtesies.filter(
        (c) => c.screeningId === s.id && c.estado === 'aceptada'
      ).length;
      const totalPendientes = courtesies.filter(
        (c) => c.screeningId === s.id && c.estado === 'pendiente'
      ).length;
      const boletosComprometidos = totalAceptadas + totalPendientes;
      const aforoMax = sala ? sala.aforo : null;
      const cupoLleno = aforoMax !== null && boletosComprometidos >= aforoMax;
      const disponibles = aforoMax !== null ? Math.max(0, aforoMax - boletosComprometidos) : null;

      counts[s.id] = {
        totalEnviadas,
        totalAceptadas,
        totalPendientes,
        boletosComprometidos,
        aforoMax,
        cupoLleno,
        disponibles
      };
    });
    return counts;
  }, [screenings, courtesies]);

  if (guestToken) {
    return <ConfirmacionInvitadoView token={guestToken} />;
  }

  const handleSelectMovie = (title) => {
    setSelectedMovieTitle(title);
    const schedules = moviesGrouped[title]?.horarios || [];
    if (schedules.length > 0) {
      setSelectedScreeningId(schedules[0].id);
    } else {
      setSelectedScreeningId('');
    }
  };

  const handleAddScreening = async (newScreeningData) => {
    if (backendConnected) {
      const created = await createScreening(newScreeningData);
      setScreenings((prev) => [...prev, created]);
      setSelectedMovieTitle(created.pelicula);
      setSelectedScreeningId(created.id);
    } else {
      const newItem = { id: `func-${Date.now()}`, ...newScreeningData };
      setScreenings((prev) => [...prev, newItem]);
      setSelectedMovieTitle(newItem.pelicula);
      setSelectedScreeningId(newItem.id);
    }
  };

  const handleDeleteScreening = async (id) => {
    if (backendConnected) {
      await removeScreening(id);
    }
    setScreenings((prev) => prev.filter((s) => s.id !== id));
    setCourtesies((prev) => prev.filter((c) => c.screeningId !== id));
  };

  const handleSendCourtesy = async (courtesyData) => {
    if (backendConnected) {
      const res = await createCourtesy(courtesyData);
      setCourtesies((prev) => [res.courtesy, ...prev]);
      return res;
    } else {
      const newCourtesy = {
        id: `cort-${Date.now()}`,
        ...courtesyData,
        estado: 'pendiente',
        entregado: false,
        fechaEnvio: new Date().toISOString()
      };
      setCourtesies((prev) => [newCourtesy, ...prev]);
      return { courtesy: newCourtesy, emailEnviado: true };
    }
  };

  const handleAcceptInvitation = async (courtesy) => {
    if (backendConnected && courtesy.token) {
      const res = await acceptCourtesyByToken(courtesy.token);
      setCourtesies((prev) =>
        prev.map((c) => (c.id === courtesy.id ? res.courtesy : c))
      );
    } else {
      setCourtesies((prev) =>
        prev.map((c) =>
          c.id === courtesy.id
            ? { ...c, estado: 'aceptada', fechaRespuesta: new Date().toISOString() }
            : c
        )
      );
    }
  };

  const handleToggleDelivered = async (courtesyId) => {
    if (backendConnected) {
      const updated = await toggleCourtesyDelivered(courtesyId);
      setCourtesies((prev) =>
        prev.map((c) => (c.id === courtesyId ? updated : c))
      );
    } else {
      setCourtesies((prev) =>
        prev.map((c) => {
          if (c.id !== courtesyId) return c;
          const nextDelivered = !c.entregado;
          return {
            ...c,
            estado: nextDelivered ? 'aceptada' : c.estado,
            entregado: nextDelivered
          };
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F4F0EA] font-ficunam-sans selection:bg-[#D91E26] selection:text-white">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 no-print">
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#111111] border border-[#F4F0EA]/20 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {loadingInitial
                ? 'Conectando con el servidor...'
                : backendConnected
                ? 'Conectado en tiempo real a MongoDB Atlas (http://localhost:4000/api)'
                : 'Modo sin conexión (Inicia ficunam-backend en puerto 4000 para guardar en MongoDB)'}
            </span>
          </div>
          {backendConnected && (
            <button
              type="button"
              onClick={loadFromBackend}
              className="text-[11px] uppercase tracking-wider text-[#D91E26] hover:underline font-bold"
            >
              Sincronizar ahora ↻
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'funciones' && (
          <FuncionesView
            screenings={screenings}
            moviesGrouped={moviesGrouped}
            occupancyByScreening={occupancyByScreening}
            onAddScreening={handleAddScreening}
            onDeleteScreening={handleDeleteScreening}
            onGoToCourtesyForMovie={(movieTitle) => {
              handleSelectMovie(movieTitle);
              setActiveTab('cortesias');
            }}
          />
        )}

        {activeTab === 'cortesias' && (
          <CortesiasView
            screenings={screenings}
            courtesies={courtesies}
            moviesGrouped={moviesGrouped}
            movieTitles={movieTitles}
            selectedMovieTitle={selectedMovieTitle}
            selectedScreeningId={selectedScreeningId}
            onSelectMovie={handleSelectMovie}
            onSelectScreeningId={setSelectedScreeningId}
            occupancyByScreening={occupancyByScreening}
            simulatedNow={new Date().toISOString()}
            onSendCourtesy={handleSendCourtesy}
            onAcceptInvitation={handleAcceptInvitation}
          />
        )}

        {activeTab === 'taquilla' && (
          <TaquillaView
            courtesies={courtesies}
            screenings={screenings}
            onToggleDelivered={handleToggleDelivered}
          />
        )}

        {activeTab === 'resumen' && (
          <ResumenView screenings={screenings} courtesies={courtesies} />
        )}
      </main>

      <Footer />
    </div>
  );
}