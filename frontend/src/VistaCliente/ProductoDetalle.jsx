import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTienda } from './TiendaContext';
import { precioPorEscalon } from '../utils/escalones';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const ETIQUETA_UNIDAD = { kg: 'kg', pack: 'pack', caja: 'caja', unidad: 'unidad' };
const PASO_POR_UNIDAD = { kg: 1, pack: 1, caja: 1, unidad: 1 };

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { categorias, productos, agregarAlCarrito, totalItems } = useTienda();

  const producto = productos.find((p) => String(p.id) === id);
  const categoria = producto ? categorias.find((c) => c.id === producto.categoria) : null;
  const paso = categoria ? (PASO_POR_UNIDAD[categoria.unidad_medida] || 1) : 1;
  const unidadLabel = categoria ? (ETIQUETA_UNIDAD[categoria.unidad_medida] || categoria.unidad_medida) : '';

  const [cantidad, setCantidad] = useState(() => (categoria && Number(categoria.cantidad_minima) > paso ? Number(categoria.cantidad_minima) : paso));

  if (!producto || !categoria) {
    return (
      <section className="producto-detalle-vacio">
        <p>No encontramos ese producto.</p>
        <button type="button" className="btn-vibrante" onClick={() => navigate('/')}>Volver al inicio</button>
      </section>
    );
  }

  const tieneEscalones = categoria.escalones && categoria.escalones.length > 0;
  const precioActual = tieneEscalones
    ? (precioPorEscalon(categoria, cantidad) ?? categoria.escalones[0].precio_unitario)
    : Number(producto.precio_base) || 0;

  const ajustar = (delta) => {
    setCantidad((c) => Math.max(paso, Math.round((c + delta) * 100) / 100));
  };

  const agregar = () => {
    agregarAlCarrito(producto, cantidad);
  };

  return (
    <section
      className="producto-detalle-seccion"
      style={totalItems > 0 ? { paddingBottom: 'calc(110px + var(--altura-barra-carrito, 0px) + 10px)' } : null}
    >
      <button type="button" className="producto-detalle-volver" onClick={() => navigate(-1)} aria-label="Volver">
        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </button>

      <div className="producto-detalle-imagen">
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre} />
        ) : (
          <span className="producto-detalle-imagen-placeholder">🌿</span>
        )}
      </div>

      <div className="producto-detalle-info">
        <div className="producto-detalle-titulo-fila">
          <h1 className="fuente-impacto">{producto.nombre}</h1>
          <span className="producto-detalle-precio">{formatearPrecio(precioActual)}</span>
        </div>

        <div className="producto-detalle-tags">
          {producto.contenido && <span className="producto-detalle-tag producto-detalle-tag-destacado">{producto.contenido}</span>}
          <span className="producto-detalle-tag">
            <span className="material-symbols-outlined" aria-hidden="true">eco</span>
            {categoria.nombre}
          </span>
        </div>

        {producto.descripcion && <p className="producto-detalle-descripcion">{producto.descripcion}</p>}
      </div>

      {tieneEscalones && (
        <div className="producto-detalle-escalones">
          <h2>
            <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
            Escalones mayoristas
          </h2>
          <div className="producto-detalle-escalones-lista">
            {categoria.escalones.map((e, i) => {
              const esMejor = i === categoria.escalones.length - 1;
              return (
                <div key={e.id} className={`producto-detalle-escalon-fila ${esMejor ? 'producto-detalle-escalon-mejor' : ''}`}>
                  <span className="producto-detalle-escalon-nombre">
                    {e.etiqueta || `Desde ${e.cantidad_desde} ${unidadLabel}`}
                    {esMejor && <span className="producto-detalle-badge-mejor">Mejor precio</span>}
                  </span>
                  <span className="producto-detalle-escalon-precio">
                    {formatearPrecio(e.precio_unitario)} <small>/ {unidadLabel}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Number(categoria.cantidad_minima) > 0 && (
        <p className="producto-detalle-minimo">
          Compra mínima de "{categoria.nombre}": {categoria.cantidad_minima} {unidadLabel} (podés combinar con otras variedades de la misma categoría).
        </p>
      )}

      <div className={`producto-detalle-barra-inferior ${totalItems > 0 ? 'producto-detalle-barra-inferior-con-carrito' : ''}`}>
        <div className="producto-detalle-stepper">
          <button type="button" onClick={() => ajustar(-paso)} aria-label="Restar">
            <span className="material-symbols-outlined" aria-hidden="true">remove</span>
          </button>
          <span>{cantidad}</span>
          <button type="button" onClick={() => ajustar(paso)} aria-label="Sumar">
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
          </button>
        </div>
        <button type="button" className="producto-detalle-agregar" onClick={agregar}>
          <span className="material-symbols-outlined" aria-hidden="true">shopping_basket</span>
          Agregar al carrito
        </button>
      </div>

      <style>{`
        .producto-detalle-seccion {
          max-width: 640px;
          margin: 0 auto;
          padding: 16px 20px 110px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .producto-detalle-vacio {
          max-width: 480px;
          margin: 80px auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }

        .producto-detalle-volver {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .producto-detalle-imagen {
          width: 100%;
          aspect-ratio: 4 / 5;
          border-radius: 24px;
          overflow: hidden;
          background: var(--surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 24px -16px rgba(28, 28, 22, 0.4);
        }

        .producto-detalle-imagen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .producto-detalle-imagen-placeholder {
          font-size: 4rem;
        }

        .producto-detalle-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .producto-detalle-titulo-fila {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .producto-detalle-titulo-fila h1 {
          font-size: 1.5rem;
          color: var(--text);
          margin: 0;
        }

        .producto-detalle-precio {
          flex-shrink: 0;
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--accent);
          white-space: nowrap;
        }

        .producto-detalle-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .producto-detalle-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--surface-2);
          color: var(--text-muted);
          padding: 5px 12px;
          border-radius: 6px;
          font-family: 'Work Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .producto-detalle-tag .material-symbols-outlined {
          font-size: 14px;
        }

        .producto-detalle-tag-destacado {
          background: var(--accent);
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .producto-detalle-descripcion {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .producto-detalle-escalones {
          background: var(--surface-2);
          border-radius: 16px;
          padding: 20px;
        }

        .producto-detalle-escalones h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          color: var(--text);
          margin: 0 0 14px;
        }

        .producto-detalle-escalones-lista {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .producto-detalle-escalon-fila {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 10px 14px;
          border-radius: 10px;
        }

        .producto-detalle-escalon-mejor {
          border-color: var(--accent);
          background: rgba(26, 54, 27, 0.06);
        }

        .producto-detalle-escalon-nombre {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: var(--text);
          font-size: 0.9rem;
        }

        .producto-detalle-badge-mejor {
          background: var(--accent);
          color: #ffffff;
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .producto-detalle-escalon-precio {
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          font-size: 0.9rem;
        }

        .producto-detalle-escalon-precio small {
          font-weight: 500;
          color: var(--text-muted);
        }

        .producto-detalle-minimo {
          margin: 0;
          font-size: 0.85rem;
          color: var(--accent-light);
          background: rgba(26, 54, 27, 0.08);
          border: 1px dashed var(--accent);
          border-radius: 12px;
          padding: 10px 16px;
        }

        .producto-detalle-barra-inferior {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          padding-bottom: max(14px, env(safe-area-inset-bottom));
          background: var(--surface);
          border-top: 1px solid var(--border);
          box-shadow: 0 -8px 20px -12px rgba(28, 28, 22, 0.25);
        }

        .producto-detalle-stepper {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          background: var(--surface-2);
          border-radius: 999px;
          overflow: hidden;
        }

        .producto-detalle-stepper button {
          width: 40px;
          height: 48px;
          border: none;
          background: transparent;
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .producto-detalle-stepper span {
          min-width: 32px;
          text-align: center;
          font-weight: 700;
          color: var(--text);
        }

        .producto-detalle-agregar {
          flex: 1;
          height: 48px;
          border: none;
          border-radius: 999px;
          background: var(--accent);
          color: #ffffff;
          font-family: 'Work Sans', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }

        /* Cuando ya hay algo en el carrito, ClienteLayout muestra su propia barra
           flotante "Ver mi pedido" pegada abajo (z-index 40, por encima de esta) — esta
           barra sube el alto REAL de esa barra (medido en ClienteLayout, no adivinado)
           más un margen chico, para quedar apiladas en vez de superpuestas. */
        .producto-detalle-barra-inferior-con-carrito {
          bottom: calc(var(--altura-barra-carrito, 0px) + 10px);
        }

        @media (min-width: 700px) {
          .producto-detalle-barra-inferior {
            max-width: 640px;
            left: 50%;
            transform: translateX(-50%);
            border-radius: 999px;
            border: 1px solid var(--border);
            bottom: 24px;
          }

          .producto-detalle-barra-inferior-con-carrito {
            bottom: calc(24px + var(--altura-barra-carrito, 0px) + 10px);
          }
        }
      `}</style>
    </section>
  );
}
