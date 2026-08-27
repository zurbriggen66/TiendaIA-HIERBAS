import React from 'react';
import IconoWhatsapp from './IconoWhatsapp';
import { armarLinkWhatsapp } from '../utils/whatsapp';

export default function BannerMayorista({ configuracion }) {
  const linkWhatsapp = configuracion?.whatsapp
    ? armarLinkWhatsapp(configuracion.whatsapp, 'Hola! Quiero hacer un pedido mayorista de hierbas.')
    : null;

  return (
    <section className="banner-mayorista-seccion">
      <div
        className="banner-mayorista-foto"
        style={configuracion?.imagen_banner_mayorista ? { backgroundImage: `url(${configuracion.imagen_banner_mayorista})` } : undefined}
      >
        <div className="banner-mayorista-degradado" aria-hidden="true" />

        <div className="banner-mayorista-contenido">
          <div className="banner-mayorista-encabezado">
            <h2 className="fuente-impacto">
              Explorá<br /><span>nuestro catálogo</span>
            </h2>

            <ul className="banner-mayorista-pasos">
              <li>
                <span className="banner-mayorista-paso-icono material-symbols-outlined" aria-hidden="true">shopping_cart</span>
                <div>
                  <strong>Armá tu pedido</strong>
                  <p>Seleccioná los productos que necesitás de forma fácil y rápida.</p>
                </div>
              </li>
              <li>
                <span className="banner-mayorista-paso-icono banner-mayorista-paso-icono-whatsapp" aria-hidden="true">
                  <IconoWhatsapp />
                </span>
                <div>
                  <strong>Y enviálo por WhatsApp</strong>
                  <p>Nos contactamos para confirmar y coordinar la entrega.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="banner-mayorista-pie">
            {linkWhatsapp && (
              <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="banner-mayorista-boton">
                <IconoWhatsapp /> Pedir por WhatsApp
              </a>
            )}

            <div className="banner-mayorista-badges">
              <div className="banner-mayorista-badge">
                <span className="material-symbols-outlined" aria-hidden="true">eco</span>
                Productos naturales
              </div>
              <div className="banner-mayorista-badge">
                <span className="material-symbols-outlined" aria-hidden="true">verified</span>
                Calidad garantizada
              </div>
              <div className="banner-mayorista-badge">
                <span className="material-symbols-outlined" aria-hidden="true">forest</span>
                Directo de origen
              </div>
              <div className="banner-mayorista-badge">
                <span className="material-symbols-outlined" aria-hidden="true">volunteer_activism</span>
                Atención personalizada
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .banner-mayorista-seccion {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }

        .banner-mayorista-foto {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background-color: var(--accent-dark, #0e2410);
          background-size: cover;
          background-position: center;
          overflow: hidden;
        }

        .banner-mayorista-degradado {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(115deg, rgba(14, 36, 16, 0.92) 0%, rgba(14, 36, 16, 0.85) 40%, rgba(14, 36, 16, 0.35) 62%, rgba(14, 36, 16, 0.05) 85%),
            linear-gradient(180deg, rgba(14, 36, 16, 0.35) 0%, rgba(14, 36, 16, 0) 22%, rgba(14, 36, 16, 0) 68%, rgba(14, 36, 16, 0.85) 100%);
        }

        .banner-mayorista-contenido {
          position: relative;
          z-index: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
          padding: 28px 22px 22px;
        }

        .banner-mayorista-encabezado {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 82%;
        }

        .banner-mayorista-encabezado h2 {
          margin: 0;
          font-size: 1.8rem;
          line-height: 1.1;
          color: #ffffff;
        }

        .banner-mayorista-encabezado h2 span {
          color: #a7d489;
        }

        .banner-mayorista-pasos {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .banner-mayorista-pasos li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .banner-mayorista-paso-icono {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.16);
          color: #a7d489;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
        }

        .banner-mayorista-pasos strong {
          display: block;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .banner-mayorista-pasos p {
          margin: 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 0.78rem;
          line-height: 1.35;
        }

        .banner-mayorista-pie {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }

        .banner-mayorista-boton {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 13px 28px;
          border-radius: 999px;
          background: #a7d489;
          color: #0e2410;
          font-family: 'Work Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-decoration: none;
          box-shadow: 0 10px 22px -10px rgba(0, 0, 0, 0.6);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .banner-mayorista-boton:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 26px -10px rgba(0, 0, 0, 0.7);
        }

        .banner-mayorista-badges {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .banner-mayorista-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
          color: #ffffff;
          font-size: 0.6rem;
          font-weight: 700;
          line-height: 1.2;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
        }

        .banner-mayorista-badge .material-symbols-outlined {
          font-size: 18px;
          color: #a7d489;
        }

        @media (min-width: 640px) {
          .banner-mayorista-seccion {
            /* El padding/fondo de esta sección en desktop ahora los pone el
               contenedor ".destacados-inicio" (Inicio.jsx), compartido con
               "¿Quiénes somos?" — por eso acá solo queda centrar la tarjeta. */
            width: auto;
            max-width: none;
            display: flex;
            justify-content: center;
          }

          .banner-mayorista-foto {
            max-width: 480px;
            border-radius: 24px;
          }

          .banner-mayorista-badges {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (min-width: 900px) {
          /* De 900px para arriba, Inicio.jsx pone esta tarjeta en una fila de 3
             columnas junto a "¿Quiénes somos?" e Insignias.jsx — las mismas 4
             insignias de acá abajo pasan a ser esa tercera columna aparte, así
             que las de adentro de la tarjeta se ocultan para no repetirlas. */
          .banner-mayorista-badges {
            display: none;
          }

          .banner-mayorista-seccion,
          .banner-mayorista-foto {
            width: 100%;
            height: 100%;
          }

          .banner-mayorista-foto {
            aspect-ratio: auto;
            max-width: 420px;
          }
        }
      `}</style>
    </section>
  );
}
