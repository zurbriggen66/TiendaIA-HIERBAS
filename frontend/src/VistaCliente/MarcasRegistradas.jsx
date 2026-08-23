import React from 'react';

export default function MarcasRegistradas({ configuracion }) {
  return (
    <section className="marcas-seccion">
      <p className="marcas-etiqueta">Nuestras marcas registradas</p>
      <div className="marcas-fila">
        <div className="marcas-item">
          {configuracion.logo ? (
            <img src={configuracion.logo} alt="Hierbas Medicinales Cba" className="marcas-logo" />
          ) : (
            <span className="material-symbols-outlined marcas-icono" aria-hidden="true">local_florist</span>
          )}
          <span className="marcas-nombre fuente-impacto">Hierbas Medicinales Cba</span>
        </div>
        <div className="marcas-divisor" aria-hidden="true" />
        <div className="marcas-item">
          {configuracion.logo_secundario ? (
            <img src={configuracion.logo_secundario} alt="La Paz Hierbas Serranas" className="marcas-logo" />
          ) : (
            <span className="material-symbols-outlined marcas-icono" aria-hidden="true">eco</span>
          )}
          <span className="marcas-nombre fuente-impacto">La Paz Hierbas Serranas</span>
        </div>
      </div>

      <style>{`
        .marcas-seccion {
          width: 100%;
          padding: 44px 20px;
          background: var(--surface-2, #dee5da);
          border-bottom: 1px solid var(--border, #c3c8be);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }

        .marcas-etiqueta {
          font-family: 'Work Sans', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-muted, #434841);
          text-align: center;
        }

        .marcas-fila {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 32px;
        }

        .marcas-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .marcas-logo {
          width: 48px;
          height: 48px;
          object-fit: contain;
        }

        .marcas-icono {
          font-size: 40px;
          color: var(--accent, #1a361b);
        }

        .marcas-nombre {
          font-size: 1.05rem;
          color: var(--accent, #1a361b);
        }

        .marcas-divisor {
          width: 1px;
          height: 48px;
          background: var(--border, #c3c8be);
        }

        @media (max-width: 480px) {
          .marcas-divisor {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
