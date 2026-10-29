import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, AlertCircle, Calendar, Clock, MapPin, User, Ticket } from 'lucide-react';
import FicunamLogo from '../artwork/FicunamLogo';
import { verifyCourtesyToken, acceptCourtesyByToken } from '../../services/api';
import { formatDateSpanish, categoryBadgeStyle } from '../../utils/dateUtils';
import { SENDER_EMAIL } from '../../constants/salas';

export default function ConfirmacionInvitadoView({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    verifyCourtesyToken(token)
      .then((res) => {
        if (!mounted) return;
        setData(res);
        if (res.courtesy?.estado === 'aceptada') {
          setConfirmedSuccess(true);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await acceptCourtesyByToken(token);
      setConfirmedSuccess(true);
      setData((prev) =>
        prev
          ? {
              ...prev,
              courtesy: { ...prev.courtesy, estado: 'aceptada' }
            }
          : prev
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F4F0EA] font-ficunam-sans flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-xl w-full mx-auto my-auto">
        <div className="bg-[#111111] border-2 border-[#F4F0EA] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#D91E26]">
          <div className="border-2 border-[#F4F0EA] bg-white p-3 mb-6">
            <FicunamLogo variant="banner" className="w-full h-24" />
          </div>

          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#D91E26] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs uppercase tracking-[0.2em] text-[#F4F0EA]/70">
                Verificando pase en el servidor de FICUNAM...
              </p>
            </div>
          ) : error && !data ? (
            <div className="p-5 border border-rose-500 bg-rose-950/30 text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold uppercase text-xs tracking-wider">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Enlace no válido</span>
              </div>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            data && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#F4F0EA]/20 pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#D91E26] font-bold block">
                      PASE INDIVIDUAL INTRANSFERIBLE
                    </span>
                    <h1 className="font-ficunam-display text-2xl font-extrabold uppercase tracking-tight text-[#F4F0EA] mt-0.5">
                      Confirmación de Cortesía
                    </h1>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-bold uppercase border ${categoryBadgeStyle(
                      data.courtesy.categoria
                    )}`}
                  >
                    {data.courtesy.categoria}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[#F4F0EA]/80">
                    <User className="w-4 h-4 text-[#D91E26]" />
                    <span>Invitado(a):</span>
                    <strong className="text-white">{data.courtesy.nombre}</strong>
                  </div>
                  {data.courtesy.empresa && (
                    <p className="text-xs text-[#F4F0EA]/60 pl-6">
                      Institución / Medio: {data.courtesy.empresa}
                    </p>
                  )}
                </div>

                <div className="bg-[#080808] border-l-4 border-[#D91E26] p-5 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-[#D91E26] font-bold">
                      FUNCIÓN SELECCIONADA
                    </span>
                    <h2 className="font-ficunam-display text-xl font-extrabold text-[#F4F0EA] uppercase mt-0.5">
                      {data.screening.pelicula}
                    </h2>
                    <p className="text-xs text-[#F4F0EA]/70 uppercase tracking-[0.14em]">
                      Dir. {data.screening.director}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#F4F0EA]/15 text-xs">
                    <div>
                      <span className="text-[#F4F0EA]/50 block uppercase text-[10px]">Sala</span>
                      <span className="font-bold text-[#F4F0EA] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#D91E26]" />
                        {data.screening.salaNombre}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#F4F0EA]/50 block uppercase text-[10px]">Fecha</span>
                      <span className="font-bold text-[#F4F0EA] capitalize flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#D91E26]" />
                        {formatDateSpanish(data.screening.fecha)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#F4F0EA]/50 block uppercase text-[10px]">Hora</span>
                      <span className="font-mono font-bold text-[#D91E26] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        {data.screening.hora} hrs
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 border border-rose-500 bg-rose-950/40 text-rose-200 text-xs">
                    {error}
                  </div>
                )}

                {confirmedSuccess ? (
                  <div className="p-5 border-2 border-emerald-500 bg-emerald-500/10 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h3 className="font-ficunam-display text-lg font-extrabold uppercase text-emerald-300">
                      ¡Invitación Confirmada!
                    </h3>
                    <p className="text-xs text-[#F4F0EA]/85 leading-relaxed">
                      Tu boleto personal para <strong>{data.screening.pelicula}</strong> ha quedado reservado en nuestra base de datos. Preséntate con tu nombre en el módulo de cortesías de{' '}
                      <strong>{data.screening.salaNombre}</strong> antes de la función.
                    </p>
                  </div>
                ) : data.isExpired ? (
                  <div className="p-5 border border-zinc-700 bg-zinc-900 text-center space-y-2">
                    <Lock className="w-7 h-7 text-rose-400 mx-auto" />
                    <h3 className="font-bold uppercase text-sm text-rose-300 tracking-wider">
                      Enlace de confirmación cerrado
                    </h3>
                    <p className="text-xs text-[#F4F0EA]/70">
                      El plazo límite para confirmar esta invitación venció 24 horas antes de la función ({data.deadlineFormatted}).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 border border-[#D91E26]/60 bg-[#D91E26]/10 text-xs text-[#F4F0EA]/85">
                      Fecha límite para aceptar: <strong>{data.deadlineFormatted}</strong> (24 horas antes de la función).
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirm}
                      className="w-full py-4 px-6 bg-[#D91E26] hover:bg-[#b8161d] text-white font-bold uppercase tracking-[0.2em] text-xs transition flex items-center justify-center gap-2 border border-[#F4F0EA] shadow-[4px_4px_0px_0px_#F4F0EA]"
                    >
                      <Ticket className="w-4 h-4" />
                      {submitting
                        ? 'Confirmando asistencia...'
                        : 'Aceptar Invitación (Reservar 1 Boleto) →'}
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-[#F4F0EA]/15 text-center text-[11px] text-[#F4F0EA]/50">
                  Dirección Ejecutiva FICUNAM · {SENDER_EMAIL}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}