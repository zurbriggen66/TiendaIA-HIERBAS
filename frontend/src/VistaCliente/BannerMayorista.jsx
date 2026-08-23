import React from 'react';

export default function BannerMayorista() {
  const irAlCatalogo = () => {
    document.getElementById('categorias')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="banner-mayorista-seccion">
      <div className="banner-mayorista-card">
        <div className="banner-mayorista-icono">
          <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
        </div>
        <div className="banner-mayorista-texto">
          <h2 className="fuente-impacto">Hierbas a Granel por Mayor</h2>
          <p>
            Abastecemos a dietéticas, herboristerías y emprendedores en todo el país. Calidad garantizada,
            fraccionamiento a medida y el mejor precio directo de origen.
          </p>
        </div>
        <button type="button" className="banner-mayorista-boton" onClick={irAlCatalogo}>
          Cotizar pedido
        </button>
      </div>

      <style>{`
        .banner-mayorista-seccion {
          width: 100%;
          padding: 48px 20px;
          background: var(--surface-2, #dee5da);
        }

        .banner-mayorista-card {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
          background: var(--surface, #f2f7ef);
          border: 1px solid var(--border, #c3c8be);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 8px 24px -16px rgba(28, 28, 22, 0.2);
        }

        .banner-mayorista-icono {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--surface-2, #dee5da);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .banner-mayorista-icono .material-symbols-outlined {
          font-size: 34px;
          color: var(--accent, #1a361b);
        }

        .banner-mayorista-texto h2 {
          font-size: 1.5rem;
          color: var(--accent, #1a361b);
          margin: 0 0 8px;
        }

        .banner-mayorista-texto p {
          margin: 0;
          font-size: 0.95rem;
          color: var(--text-muted, #434841);
          line-height: 1.5;
        }

        .banner-mayorista-boton {
          flex-shrink: 0;
          padding: 12px 28px;
          border-radius: 999px;
          border: 2px solid var(--accent, #1a361b);
          background: transparent;
          color: var(--accent, #1a361b);
          font-family: 'Work Sans', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .banner-mayorista-boton:hover {
          background: var(--accent, #1a361b);
          color: #ffffff;
        }

        @media (min-width: 768px) {
          .banner-mayorista-card {
            flex-direction: row;
            text-align: left;
            padding: 32px 40px;
          }
        }
      `}</style>
    </section>
  );
}
