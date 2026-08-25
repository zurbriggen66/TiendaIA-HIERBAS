import React from 'react';

function IconoWhatsapp(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.4 1.26 4.83L2 22l5.35-1.4a9.9 9.9 0 0 0 4.69 1.2h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm5.8 14.15c-.24.68-1.4 1.3-1.93 1.35-.5.05-1.05.24-3.5-.73-2.96-1.18-4.86-4.2-5-4.4-.15-.2-1.2-1.6-1.2-3.06s.77-2.17 1.04-2.47c.27-.3.6-.37.8-.37.2 0 .4 0 .58.01.19.01.44-.07.68.53.24.6.83 2.06.9 2.2.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.3.76 1.27 1.64 2.06 1.13 1.02 2.07 1.34 2.37 1.49.3.15.48.13.65-.08.17-.2.72-.85.92-1.14.2-.29.4-.24.66-.14.28.1 1.75.85 2.06 1 .3.15.5.23.58.36.07.13.07.75-.17 1.43Z" />
    </svg>
  );
}

export default function BannerMayorista({ configuracion }) {
  const numeroWhatsapp = configuracion?.whatsapp;
  const linkWhatsapp = numeroWhatsapp
    ? `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent('Hola! Quiero hacer un pedido mayorista de hierbas.')}`
    : null;

  return (
    <section className="banner-mayorista-seccion">
      <div
        className="banner-mayorista-foto"
        style={configuracion?.imagen_banner_mayorista ? { backgroundImage: `url(${configuracion.imagen_banner_mayorista})` } : undefined}
      >
        <div className="banner-mayorista-degradado" aria-hidden="true" />

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

      <style>{`
        .banner-mayorista-seccion {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          background: var(--accent-dark, #0e2410);
        }

        .banner-mayorista-foto {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background-color: var(--accent-dark, #0e2410);
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: flex-start;
          overflow: hidden;
        }

        .banner-mayorista-degradado {
          position: absolute;
          inset: 0;
          background: linear-gradient(115deg, rgba(14, 36, 16, 0.94) 0%, rgba(14, 36, 16, 0.94) 42%, rgba(14, 36, 16, 0.55) 62%, rgba(14, 36, 16, 0.1) 85%);
        }

        .banner-mayorista-encabezado {
          position: relative;
          z-index: 1;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          max-width: 78%;
        }

        .banner-mayorista-encabezado h2 {
          margin: 0;
          font-size: 1.9rem;
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
          gap: 16px;
        }

        .banner-mayorista-pasos li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .banner-mayorista-paso-icono {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.14);
          color: #a7d489;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .banner-mayorista-pasos strong {
          display: block;
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .banner-mayorista-pasos p {
          margin: 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .banner-mayorista-pie {
          padding: 24px 24px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }

        .banner-mayorista-boton {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 30px;
          border-radius: 999px;
          background: #a7d489;
          color: #0e2410;
          font-family: 'Work Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .banner-mayorista-boton:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.5);
        }

        .banner-mayorista-badges {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px 10px;
        }

        .banner-mayorista-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.72rem;
          font-weight: 600;
          line-height: 1.25;
        }

        .banner-mayorista-badge .material-symbols-outlined {
          font-size: 22px;
          color: #a7d489;
        }

        @media (min-width: 640px) {
          .banner-mayorista-seccion {
            max-width: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 48px 20px;
            background: var(--surface-2, #dee5da);
          }

          .banner-mayorista-foto,
          .banner-mayorista-pie {
            max-width: 560px;
          }

          .banner-mayorista-foto {
            border-radius: 24px 24px 0 0;
          }

          .banner-mayorista-pie {
            background: var(--accent-dark, #0e2410);
            border-radius: 0 0 24px 24px;
            width: 100%;
          }

          .banner-mayorista-badges {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </section>
  );
}
