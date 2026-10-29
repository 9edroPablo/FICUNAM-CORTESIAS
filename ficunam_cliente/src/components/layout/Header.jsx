import React from 'react';
import { Film, Send, Ticket, BarChart3, Mail, Clock, ArrowUpRight } from 'lucide-react';
import FicunamLogo from '../artwork/FicunamLogo';
import { SENDER_EMAIL } from '../../constants/salas';

export default function Header({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'funciones', label: 'Funciones', icon: Film },
    { id: 'cortesias', label: 'Asignar Cortesías y Correo', icon: Send },
    { id: 'taquilla', label: 'Entrega de Boletos', icon: Ticket },
    { id: 'resumen', label: 'Resumen Ejecutivo', icon: BarChart3 }
  ];

  return (
    <>
      <div className="bg-[#050505] border-b border-white/15 text-[11px] tracking-[0.22em] uppercase text-[#F4F0EA]/70 no-print font-ficunam-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="font-bold text-[#F4F0EA]">UNAM</span>
            <span className="text-[#D91E26]">/</span>
            <span>CULTURA UNAM</span>
            <span className="text-[#D91E26]">/</span>
            <span>FILMOTECA UNAM</span>
            <span className="hidden md:inline text-[#D91E26]">/</span>
            <span className="hidden md:inline text-[#F4F0EA]/90">
              FESTIVAL INTERNACIONAL DE CINE UNAM
            </span>
          </div>
          <div className="text-[10px] tracking-[0.25em] text-[#D91E26] font-bold">
            CENTRO CULTURAL UNIVERSITARIO · UNAM
          </div>
        </div>
      </div>

      <header className="border-b-2 border-[#F4F0EA]/20 bg-[#0B0B0B] relative overflow-hidden no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-[#080808] border border-[#F4F0EA]/30 text-[11px] tracking-[0.25em] uppercase font-ficunam-sans">
                <span className="w-2 h-2 bg-[#D91E26] inline-block" />
                <span>DIRECCIÓN EJECUTIVA · GESTIÓN DE CORTESÍAS</span>
              </div>

              <div className="flex items-baseline gap-4 flex-wrap">
                <h1 className="font-ficunam-display text-4xl sm:text-6xl font-extrabold tracking-tighter uppercase leading-none text-[#F4F0EA]">
                  FIC<span className="text-[#D91E26]">UNAM</span>
                </h1>
                <span className="text-xs sm:text-sm tracking-[0.3em] uppercase text-[#F4F0EA]/80 font-ficunam-sans border-l-2 border-[#D91E26] pl-3">
                  FILMOTECA UNAM
                </span>
              </div>

              <p className="text-sm sm:text-base text-[#F4F0EA]/85 max-w-2xl font-ficunam-sans leading-relaxed">
                Sistema oficial de programación de funciones, acreditación de cortesías personalizadas y control de acceso en sedes del{' '}
                <strong className="text-white underline decoration-[#D91E26] underline-offset-4">
                  Centro Cultural Universitario UNAM
                </strong>
                .
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-ficunam-sans">
                <div className="px-3 py-1.5 bg-[#080808]/90 border border-[#F4F0EA]/25 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#D91E26]" />
                  <span className="text-[#F4F0EA]/70">Emisor oficial:</span>
                  <span className="font-mono text-[#F4F0EA] font-medium">{SENDER_EMAIL}</span>
                </div>
                <div className="px-3 py-1.5 bg-[#080808]/90 border border-[#F4F0EA]/25 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#D91E26]" />
                  <span className="text-[#F4F0EA]/80">Cierre automático: -24 hrs antes de cada función</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="border-2 border-[#F4F0EA] bg-[#080808] p-2 shadow-[8px_8px_0px_0px_#D91E26]">
                <FicunamLogo variant="banner" className="w-full h-36 sm:h-40" />
                <div className="pt-2 px-1 flex items-center justify-between text-[10px] tracking-[0.2em] uppercase font-ficunam-sans text-[#F4F0EA]/80">
                  <span>FILMOTECA UNAM · FICUNAM</span>
                  <span className="text-[#D91E26] font-bold">CCU · UNAM</span>
                </div>
              </div>
            </div>
          </div>

          <nav className="mt-7 pt-4 border-t border-[#F4F0EA]/20 flex flex-wrap gap-2 sm:gap-3 font-ficunam-sans">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.14em] transition-all flex items-center gap-2.5 border-2 ${
                    active
                      ? 'bg-[#F4F0EA] text-[#080808] border-[#F4F0EA] shadow-[4px_4px_0px_0px_#D91E26]'
                      : 'bg-[#080808]/80 text-[#F4F0EA] border-[#F4F0EA]/30 hover:border-[#D91E26] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#D91E26]" />
                  <span>{tab.label}</span>
                  <ArrowUpRight className={`w-3.5 h-3.5 ${active ? 'opacity-100 text-[#080808]' : 'opacity-40'}`} />
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
