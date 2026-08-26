import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useReveal } from '../utils/useReveal';

const ETIQUETA_UNIDAD = { kg: 'Venta por kg', pack: 'Venta por pack', caja: 'Venta por caja', unidad: 'Venta por unidad' };
const ICONO_POR_DEFECTO = ['local_florist', 'psychiatry', 'inventory_2', 'public', 'eco', 'spa'];

function TarjetaCategoria({ categoria, indice, onElegir }) {
  const [ref, visible] = useReveal();
  const etiqueta = ETIQUETA_UNIDAD[categoria.unidad_medida] || categoria.unidad_medida;

  return (
    <button
      ref={ref}
      type="button"
      className={`categoria-tarjeta reveal ${visible ? 'reveal-visible' : ''}`}
      onClick={() => onElegir(categoria.id)}
      style={categoria.imagen ? { backgroundImage: `url(${categoria.imagen})` } : undefined}
    >
      {!categoria.imagen && (
        <span className="material-symbols-outlined categoria-tarjeta-icono-fondo" aria-hidden="true">
          {ICONO_POR_DEFECTO[indice % ICONO_POR_DEFECTO.length]}
        </span>
      )}
      <div className="categoria-tarjeta-degradado" aria-hidden="true" />
      <div className="categoria-tarjeta-contenido">
        <span className="categoria-tarjeta-badge">
          <span className="material-symbols-outlined" aria-hidden="true">
            {ICONO_POR_DEFECTO[indice % ICONO_POR_DEFECTO.length]}
          </span>
          {etiqueta}
        </span>
        <h3 className="fuente-impacto">{categoria.nombre}</h3>
        {categoria.descripcion && <p>{categoria.descripcion}</p>}
        {Number(categoria.cantidad_minima) > 0 && (
          <span className="categoria-tarjeta-minimo">
            Mínimo: {categoria.cantidad_minima} {categoria.unidad_medida}
          </span>
        )}
      </div>
    </button>
  );
}

export default function Categorias({ categorias }) {
  const navigate = useNavigate();
  if (!categorias || categorias.length === 0) return null;

  const irACategoria = (id) => navigate(`/categoria/${id}`);

  return (
    <section className="categorias-seccion" id="categorias">
      <div className="categorias-header">
        <span className="material-symbols-outlined" aria-hidden="true">local_florist</span>
        <h2 className="fuente-impacto">Explorá el Archivo Botánico</h2>
        <p>Selección premium de hierbas naturales para tu negocio o consumo personal.</p>
      </div>

      <div className="categorias-grid">
        {categorias.map((cat, i) => (
          <TarjetaCategoria key={cat.id} categoria={cat} indice={i} onElegir={irACategoria} />
        ))}
      </div>

      <style>{`
        .categorias-seccion {
          /* width:100% no es redundante con max-width: .cliente-container es flex
             column, y "margin: 0 auto" en un hijo flex desactiva el estirado por
             defecto (align-items:stretch) — sin esto la sección se achica a su
             contenido mínimo en vez de usar los 1100px disponibles en desktop. */
          width: 100%;
          padding: 56px 20px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .categorias-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          margin-bottom: 36px;
        }

        .categorias-header .material-symbols-outlined {
          color: var(--accent-light, #2f4f30);
        }

        .categorias-header h2 {
          font-size: 1.7rem;
          color: var(--text, #1c1c16);
          margin: 0;
        }

        .categorias-header p {
          margin: 0;
          max-width: 480px;
          color: var(--text-muted, #434841);
          font-size: 0.95rem;
        }

        .categorias-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        .categoria-tarjeta {
          position: relative;
          height: 280px;
          border-radius: 20px;
          overflow: hidden;
          border: none;
          padding: 0;
          cursor: pointer;
          background-color: var(--surface-2, #dee5da);
          background-size: cover;
          background-position: center;
          box-shadow: 0 8px 20px -14px rgba(28, 28, 22, 0.4);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .categoria-tarjeta:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px -14px rgba(28, 28, 22, 0.5);
        }

        .categoria-tarjeta-icono-fondo {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 96px;
          color: var(--accent-light, #2f4f30);
          opacity: 0.25;
        }

        .categoria-tarjeta-degradado {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(28, 28, 22, 0.85), rgba(28, 28, 22, 0.25) 55%, transparent);
        }

        .categoria-tarjeta-contenido {
          position: relative;
          z-index: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-start;
          gap: 8px;
          padding: 22px;
          text-align: left;
        }

        .categoria-tarjeta-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(242, 247, 239, 0.92);
          color: var(--accent, #1a361b);
          padding: 5px 12px;
          border-radius: 999px;
          font-family: 'Work Sans', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .categoria-tarjeta-badge .material-symbols-outlined {
          font-size: 15px;
        }

        .categoria-tarjeta-contenido h3 {
          font-size: 1.25rem;
          color: #ffffff;
          margin: 0;
        }

        .categoria-tarjeta-contenido p {
          margin: 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.85);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .categoria-tarjeta-minimo {
          margin-top: 2px;
          font-size: 0.72rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.92);
        }
      `}</style>
    </section>
  );
}
