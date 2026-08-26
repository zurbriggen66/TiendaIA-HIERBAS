import React from 'react';

export default function MarcasRegistradas({ configuracion }) {
  if (configuracion.imagen_quienes_somos) {
    return (
      <section className="quienes-somos-seccion">
        <img src={configuracion.imagen_quienes_somos} alt="¿Quiénes somos?" />
        <style>{`
          .quienes-somos-seccion {
            width: 100%;
          }

          .quienes-somos-seccion img {
            display: block;
            width: 100%;
            aspect-ratio: 9 / 16;
            object-fit: cover;
          }

          /* Sin este límite, en un monitor ancho la imagen (9:16 del ancho completo)
             queda gigante: en 1920px de ancho pasa a medir ~3413px de alto, una franja
             enorme que rompe el diseño. A partir de acá se centra con un ancho fijo,
             como una tarjeta vertical (mismo criterio que el banner mayorista). */
          @media (min-width: 640px) {
            .quienes-somos-seccion {
              display: flex;
              justify-content: center;
              padding: 48px 20px;
              background: var(--surface-2, #dee5da);
            }

            .quienes-somos-seccion img {
              width: min(100%, 420px);
              border-radius: 24px;
              box-shadow: 0 20px 40px -16px rgba(28, 28, 22, 0.35);
            }
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="marcas-seccion">
      <div className="marcas-fondo-decorativo" aria-hidden="true" />

      <div className="marcas-titulo">
        <span className="marcas-titulo-linea" aria-hidden="true" />
        <p className="marcas-etiqueta">Nuestras marcas registradas</p>
        <span className="marcas-titulo-linea" aria-hidden="true" />
      </div>

      <div className="marcas-fila">
        <div className="marcas-item">
          {configuracion.logo ? (
            <img src={configuracion.logo} alt="Hierbas Medicinales Cba" className="marcas-logo" />
          ) : (
            <span className="material-symbols-outlined marcas-icono" aria-hidden="true">local_florist</span>
          )}
          <span className="marcas-nombre fuente-impacto">Hierbas Medicinales Cba</span>
        </div>

        <span className="marcas-divisor" aria-hidden="true">🌿</span>

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
          position: relative;
          width: 100%;
          padding: 56px 20px 60px;
          background: #e6efe1;
          border-bottom: 1px solid var(--border, #c3c8be);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
          overflow: hidden;
        }

        .marcas-fondo-decorativo {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 420px 220px at 18% 15%, rgba(26, 54, 27, 0.07), transparent 70%),
            radial-gradient(ellipse 420px 220px at 82% 85%, rgba(140, 170, 120, 0.1), transparent 70%);
          pointer-events: none;
        }

        .marcas-titulo {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          max-width: 380px;
        }

        .marcas-titulo-linea {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, var(--border, #c3c8be));
        }

        .marcas-titulo-linea:last-child {
          background: linear-gradient(to left, transparent, var(--border, #c3c8be));
        }

        .marcas-etiqueta {
          flex-shrink: 0;
          font-family: 'Work Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-muted, #434841);
          text-align: center;
          white-space: nowrap;
        }

        .marcas-fila {
          position: relative;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 40px;
        }

        .marcas-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .marcas-logo {
          width: 190px;
          height: 190px;
          object-fit: contain;
          filter: drop-shadow(0 14px 20px rgba(26, 54, 27, 0.22));
          transition: transform 0.25s ease, filter 0.25s ease;
        }

        .marcas-item:hover .marcas-logo {
          transform: translateY(-5px);
          filter: drop-shadow(0 18px 26px rgba(26, 54, 27, 0.3));
        }

        .marcas-icono {
          font-size: 64px;
          color: var(--accent, #1a361b);
        }

        .marcas-nombre {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--accent, #1a361b);
          text-align: center;
        }

        .marcas-divisor {
          font-size: 26px;
          opacity: 0.55;
          transform: rotate(-8deg);
        }

        @media (max-width: 480px) {
          .marcas-logo {
            width: 150px;
            height: 150px;
          }

          .marcas-divisor {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
