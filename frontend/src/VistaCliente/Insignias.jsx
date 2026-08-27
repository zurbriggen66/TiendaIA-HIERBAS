import React from 'react';

const INSIGNIAS = [
  { icono: 'eco', texto: 'Productos naturales' },
  { icono: 'verified', texto: 'Calidad garantizada' },
  { icono: 'forest', texto: 'Directo de origen' },
  { icono: 'volunteer_activism', texto: 'Atención personalizada' },
];

// Solo se ve en la fila de 3 columnas de escritorio (Inicio.jsx): en mobile y
// tablet estas mismas 4 insignias ya se muestran adentro de la tarjeta del
// banner mayorista (BannerMayorista.jsx), no hace falta repetirlas ahí también.
export default function Insignias() {
  return (
    <div className="insignias-card">
      {INSIGNIAS.map((i) => (
        <div key={i.texto} className="insignias-item">
          <span className="material-symbols-outlined" aria-hidden="true">{i.icono}</span>
          <span>{i.texto}</span>
        </div>
      ))}

      <style>{`
        .insignias-card {
          display: none;
        }

        @media (min-width: 900px) {
          .insignias-card {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            align-content: center;
            background: var(--surface, #f2f7ef);
            border-radius: 24px;
            padding: 32px 24px;
            box-shadow: 0 20px 40px -16px rgba(28, 28, 22, 0.2);
          }

          .insignias-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            text-align: center;
          }

          .insignias-item .material-symbols-outlined {
            font-size: 30px;
            color: var(--accent-light, #2f4f30);
          }

          .insignias-item span:last-child {
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--accent, #1a361b);
            line-height: 1.25;
          }
        }
      `}</style>
    </div>
  );
}
