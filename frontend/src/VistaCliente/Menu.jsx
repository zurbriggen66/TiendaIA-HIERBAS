import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReveal } from '../utils/useReveal';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const ETIQUETA_UNIDAD = { kg: 'kg', pack: 'pack', caja: 'caja', unidad: 'unidad' };
const PASO_POR_UNIDAD = { kg: 1, pack: 1, caja: 1, unidad: 1 };

function TablaEscalones({ escalones, unidad }) {
  if (!escalones || escalones.length === 0) return null;
  return (
    <div className="producto-escalones">
      {escalones.map((e) => (
        <span key={e.id}>
          Desde {e.cantidad_desde} {ETIQUETA_UNIDAD[unidad] || unidad}: <strong>{formatearPrecio(e.precio_unitario)}</strong>
        </span>
      ))}
    </div>
  );
}

function TarjetaProducto({ producto, categoria, onAgregar }) {
  const [ref, visible] = useReveal();
  const navigate = useNavigate();
  const paso = PASO_POR_UNIDAD[categoria.unidad_medida] || 1;
  const cantidadesFijas = categoria.venta_cantidad_fija
    ? [...(categoria.cantidades_fijas || [])].sort((a, b) => Number(a.cantidad) - Number(b.cantidad))
    : null;
  const [cantidad, setCantidad] = useState(cantidadesFijas?.length ? Number(cantidadesFijas[0].cantidad) : paso);
  const unidadLabel = ETIQUETA_UNIDAD[categoria.unidad_medida] || categoria.unidad_medida;
  const tieneEscalones = categoria.escalones && categoria.escalones.length > 0;

  const ajustar = (delta) => {
    setCantidad((c) => Math.max(paso, Math.round((c + delta) * 100) / 100));
  };

  const irAlDetalle = () => navigate(`/producto/${producto.id}`);

  return (
    <div ref={ref} className={`menu-tarjeta reveal ${visible ? 'reveal-visible' : ''}`}>
      <div className="menu-tarjeta-imagen" onClick={irAlDetalle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && irAlDetalle()}>
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre} />
        ) : (
          <div className="menu-tarjeta-imagen-placeholder">🌿</div>
        )}
        <div className="menu-tarjeta-imagen-degradado" aria-hidden="true" />
        <h3 className="menu-tarjeta-titulo-flotante fuente-impacto">{producto.nombre}</h3>
      </div>
      <div className="menu-tarjeta-info">
        {producto.contenido && <span className="menu-tarjeta-contenido">{producto.contenido}</span>}
        {producto.descripcion && <p className="menu-tarjeta-descripcion">{producto.descripcion}</p>}

        {tieneEscalones ? (
          <TablaEscalones escalones={categoria.escalones} unidad={categoria.unidad_medida} />
        ) : (
          producto.precio_base && (
            <span className="menu-tarjeta-precio">{formatearPrecio(producto.precio_base)} / {unidadLabel}</span>
          )
        )}

        <div className="menu-tarjeta-divisor" aria-hidden="true" />
        <div className="menu-tarjeta-footer">
          {cantidadesFijas ? (
            <div className="menu-tarjeta-cantidades-fijas">
              {cantidadesFijas.map((cf) => (
                <button
                  key={cf.id}
                  type="button"
                  className={Number(cf.cantidad) === cantidad ? 'activo' : ''}
                  onClick={() => setCantidad(Number(cf.cantidad))}
                >
                  {cf.cantidad}
                </button>
              ))}
            </div>
          ) : (
            <div className="menu-tarjeta-cantidad">
              <button type="button" onClick={() => ajustar(-paso)}>−</button>
              <span>{cantidad} {unidadLabel}</span>
              <button type="button" onClick={() => ajustar(paso)}>+</button>
            </div>
          )}
          <button type="button" className="menu-tarjeta-toppings" onClick={() => onAgregar(producto, cantidad)}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Menu({ categorias, productos, onAgregar }) {
  const categoriasConProductos = categorias.filter((c) => productos.some((p) => p.categoria === c.id));
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const activa = categoriaActiva ? categoriasConProductos.find((c) => c.id === categoriaActiva) : categoriasConProductos[0];

  const productosFiltrados = activa
    ? productos.filter((p) => p.categoria === activa.id && p.activo !== false)
    : [];

  return (
    <section className="menu-seccion" id="menu">
      <h2 className="menu-titulo fuente-impacto">Catálogo</h2>

      {categoriasConProductos.length > 0 && (
        <div className="menu-filtro-categorias">
          <div className="menu-filtro-grid" style={{ gridTemplateColumns: `repeat(${categoriasConProductos.length}, minmax(0, 160px))` }}>
            {categoriasConProductos.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`filtro-categoria-card ${activa?.id === cat.id ? 'filtro-categoria-activa' : ''}`}
                onClick={() => setCategoriaActiva(cat.id)}
              >
                <span className="filtro-categoria-imagen">{cat.imagen ? <img src={cat.imagen} alt="" /> : '🌿'}</span>
                <span className="filtro-categoria-nombre">{cat.nombre}</span>
                <span className="filtro-categoria-check">✓</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activa && Number(activa.cantidad_minima) > 0 && (
        <p className="menu-minimo-aviso">
          Compra mínima de "{activa.nombre}": {activa.cantidad_minima} {ETIQUETA_UNIDAD[activa.unidad_medida] || activa.unidad_medida}
          {' '}(podés combinar variedades hasta llegar al mínimo).
        </p>
      )}

      {productosFiltrados.length === 0 ? (
        <p className="menu-vacio">Todavía no hay productos cargados en esta categoría.</p>
      ) : (
        <div className="menu-grid">
          {productosFiltrados.map((producto) => (
            <TarjetaProducto key={producto.id} producto={producto} categoria={activa} onAgregar={onAgregar} />
          ))}
        </div>
      )}

      <style>{`
        .menu-filtro-categorias {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 20px 20px 22px;
          margin-bottom: 20px;
        }

        .menu-filtro-grid {
          display: grid;
          gap: 10px;
          justify-content: center;
        }

        .filtro-categoria-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          min-width: 0;
          background: var(--surface-2);
          border: 2px solid transparent;
          border-radius: 18px;
          padding: 16px 8px 12px;
          cursor: pointer;
          color: var(--text);
          font-family: inherit;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }

        .filtro-categoria-card:hover {
          transform: translateY(-3px);
        }

        .filtro-categoria-activa {
          border-color: var(--accent);
          background: linear-gradient(180deg, rgba(124, 154, 91, 0.22), rgba(124, 154, 91, 0.06));
          box-shadow: 0 6px 16px -10px rgba(28, 28, 22, 0.35);
        }

        /* En celular la grilla de tarjetas verticales queda apretada con varias
           categorías — se apila en una lista de filas horizontales (imagen, nombre
           y check en línea) en vez de columnas angostas. */
        @media (max-width: 640px) {
          .menu-filtro-grid {
            grid-template-columns: 1fr !important;
            gap: 10px;
          }

          .filtro-categoria-card {
            flex-direction: row;
            align-items: center;
            gap: 14px;
            padding: 10px 16px;
          }

          .filtro-categoria-imagen {
            width: 52px;
            height: 52px;
            flex-shrink: 0;
          }

          .filtro-categoria-nombre {
            flex: 1;
            text-align: left;
            font-size: 0.82rem;
          }

          .filtro-categoria-check {
            flex-shrink: 0;
          }
        }

        .filtro-categoria-imagen {
          width: clamp(40px, 100%, 56px);
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: var(--surface);
        }

        .filtro-categoria-imagen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .filtro-categoria-nombre {
          font-weight: 800;
          font-size: 0.68rem;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          text-align: center;
          line-height: 1.25;
        }

        .filtro-categoria-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.68rem;
          color: transparent;
          background: transparent;
        }

        .filtro-categoria-activa .filtro-categoria-check {
          border-color: transparent;
          background: var(--accent-gradient);
          color: #ffffff;
        }

        .menu-minimo-aviso {
          background: rgba(124, 154, 91, 0.12);
          border: 1px dashed var(--accent);
          color: var(--accent-light);
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 0.85rem;
          margin-bottom: 24px;
        }

        .menu-tarjeta-imagen {
          position: relative;
        }

        .menu-tarjeta-contenido {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--accent-light);
          background: var(--surface-2);
          padding: 3px 10px;
          border-radius: 999px;
          align-self: flex-start;
        }

        .producto-escalones {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.76rem;
          color: var(--text-muted);
          margin: 4px 0;
        }

        .menu-vacio {
          color: var(--text-muted);
          padding: 32px 0;
          text-align: center;
        }
      `}</style>
    </section>
  );
}
