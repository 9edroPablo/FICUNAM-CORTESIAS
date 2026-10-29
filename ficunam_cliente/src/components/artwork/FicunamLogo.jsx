import React from 'react';

export default function FicunamLogo({ variant = 'banner', className = '' }) {
  if (variant === 'stamp') {
    return (
      <div className={`bg-white p-1.5 border border-[#F4F0EA]/40 flex items-center justify-center ${className}`}>
        <img
          src="/logo-ficunam.png"
          alt="Filmoteca UNAM · FICUNAM"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`bg-white flex items-center justify-center p-4 ${className}`}>
      <img
        src="/logo-ficunam.png"
        alt="Filmoteca UNAM · FICUNAM"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
