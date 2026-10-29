import React from 'react';
import FicunamLogo from '../artwork/FicunamLogo';
import { SENDER_EMAIL } from '../../constants/salas';

export default function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-[#F4F0EA]/20 bg-[#050505] py-8 no-print font-ficunam-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F4F0EA]/60">
        <div className="flex items-center gap-4">
          <FicunamLogo variant="stamp" className="w-24 h-10" />
          <div>
            <p className="font-bold text-[#F4F0EA] tracking-[0.2em] uppercase">
              FICUNAM · FESTIVAL INTERNACIONAL DE CINE UNAM
            </p>
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#F4F0EA]/50">
              CENTRO CULTURAL UNIVERSITARIO · FILMOTECA UNAM
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-[11px]">
          <p className="text-[#D91E26]">{SENDER_EMAIL}</p>
          <p>© 2026 FICUNAM · Filmoteca UNAM</p>
        </div>
      </div>
    </footer>
  );
}
