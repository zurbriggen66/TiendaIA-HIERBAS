import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTienda } from './TiendaContext';
import { precioPorEscalon } from '../utils/escalones';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const ETIQUETA_UNIDAD = { kg: 'kg', pack: 'pack', caja: 'caja', unidad: 'unidad' };

export default function CategoriaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { categorias, productos, agregarAlCarrito } = useTienda();

  const categoria = categorias.find((c) => String(c.id) === id);
  const productosCategoria = productos.filter((p) => String(p.categoria) === id && p.activo !== false);
  const unidadLabel = categoria ? (ETIQUETA_UNIDAD[categoria.unidad_medida] || categoria.unidad_medida) : '';

  if (!categoria) {
    return (
      <section className="categoria-detalle-vacio">
        <p>No encontramos esa categoría.</p>
        <button type="button" className="btn-vibrante" onClick={() => navigate('/')}>Volver al inicio</button>
      </section>
    );
  }

  return (
    <section className="categoria-detalle-seccion">
      <button type="button" className="categoria-detalle-volver" onClick={() => navigate(-1)}>
        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Volver
      </button>

      <header
        className="categoria-detalle-header"
        style={categoria.imagen ? { backgroundImage: `url(${categoria.imagen})` } : undefined}
      >
        <div className="categoria-detalle-header-degradado" aria-hidden="true" />
        <div className="categoria-detalle-header-texto">
          <h1 className="fuente-impacto">{categoria.nombre}</h1>
          {categoria.descripcion && <p>{categoria.descripcion}</p>}
          {Number(categoria.cantidad_minima) > 0 && (
            <span className="categoria-detalle-minimo">
              <span className="material-symbols-outlined" aria-hidden="true">eco</span>
              Compra mínima: {categoria.cantidad_minima} {unidadLabel} (podés combinar variedades)
            </span>
          )}
        </div>
      </header>

      <div className="categoria-detalle-subtitulo">
        <span className="material-symbols-outlined" aria-hidden="true">eco</span>
        <h2 className="fuente-impacto">Productos disponibles</h2>
        <span className="categoria-detalle-subtitulo-linea" aria-hidden="true" />
      </div>

      {productosCategoria.length === 0 ? (
        <p className="menu-vacio">Todavía no hay productos cargados en esta categoría.</p>
      ) : (
        <div className="categoria-detalle-grid">
          {productosCategoria.map((producto) => {
            // Precio minorista (sin descuento por volumen): si la categoría tiene
            // escalones, el más bajo es el que rige comprando de a poco; si no, el
            // precio propio del producto.
            const precioMinorista = categoria.escalones?.length
              ? (precioPorEscalon(categoria, 1) ?? categoria.escalones[0].precio_unitario)
              : Number(producto.precio_base) || 0;
            return (
              <button
                key={producto.id}
                type="button"
                className="categoria-detalle-producto"
                onClick={() => navigate(`/producto/${producto.id}`)}
              >
                <div className="categoria-detalle-producto-imagen">
                  {producto.imagen ? <img src={producto.imagen} alt={producto.nombre} /> : <span>🌿</span>}
                </div>
                <div className="categoria-detalle-producto-info">
                  <h3>{producto.nombre}</h3>
                  {producto.descripcion && <p className="categoria-detalle-producto-descripcion">{producto.descripcion}</p>}
                  {precioMinorista > 0 && (
                    <strong>{formatearPrecio(precioMinorista)} / {unidadLabel}</strong>
                  )}
                  {producto.contenido && <span className="categoria-detalle-producto-contenido">{producto.contenido}</span>}
                </div>
                <span
                  className="material-symbols-outlined categoria-detalle-producto-agregar"
                  aria-hidden="true"
                  onClick={(e) => { e.stopPropagation(); agregarAlCarrito(producto, 1); }}
                >
                  add_shopping_cart
                </span>
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        .categoria-detalle-seccion {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px 20px 56px;
        }

        .categoria-detalle-vacio {
          max-width: 480px;
          margin: 80px auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }

        .categoria-detalle-volver {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 8px 16px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          margin-bottom: 20px;
        }

        .categoria-detalle-header {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          min-height: 320px;
          display: flex;
          align-items: center;
          background-color: var(--surface-2);
          background-size: cover;
          background-position: center;
          margin-bottom: 32px;
        }

        .categoria-detalle-header-degradado {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, var(--surface, #f2f7ef) 0%, var(--surface, #f2f7ef) 38%, rgba(242, 247, 239, 0.75) 55%, rgba(242, 247, 239, 0) 75%);
        }

        .categoria-detalle-header-texto {
          position: relative;
          z-index: 1;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 60%;
        }

        .categoria-detalle-header-texto h1 {
          font-size: 2rem;
          line-height: 1.15;
          color: var(--accent, #1a361b);
          margin: 0;
        }

        .categoria-detalle-header-texto p {
          margin: 0;
          color: var(--text-muted, #434841);
          font-size: 0.95rem;
        }

        .categoria-detalle-minimo {
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          background: var(--accent-light, #2f4f30);
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .categoria-detalle-minimo .material-symbols-outlined {
          font-size: 16px;
        }

        @media (max-width: 640px) {
          .categoria-detalle-header-texto {
            max-width: 100%;
          }
        }

        .categoria-detalle-subtitulo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .categoria-detalle-subtitulo .material-symbols-outlined {
          color: var(--accent-light, #2f4f30);
        }

        .categoria-detalle-subtitulo h2 {
          font-size: 1.2rem;
          color: var(--text);
          margin: 0;
          white-space: nowrap;
        }

        .categoria-detalle-subtitulo-linea {
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .categoria-detalle-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .categoria-detalle-producto {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .categoria-detalle-producto:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -14px rgba(28, 28, 22, 0.35);
        }

        .categoria-detalle-producto-imagen {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          border-radius: 12px;
          overflow: hidden;
          background: var(--surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
        }

        .categoria-detalle-producto-imagen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .categoria-detalle-producto-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .categoria-detalle-producto-info h3 {
          font-size: 0.98rem;
          color: var(--text);
          margin: 0;
        }

        .categoria-detalle-producto-descripcion {
          margin: 2px 0 0;
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .categoria-detalle-producto-info strong {
          margin: 2px 0;
          color: var(--text);
          font-size: 0.9rem;
          font-weight: 700;
        }

        .categoria-detalle-producto-contenido {
          align-self: flex-start;
          font-family: 'Work Sans', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--accent);
          background: var(--surface-2);
          padding: 3px 10px;
          border-radius: 999px;
          margin-top: 4px;
        }

        .categoria-detalle-producto-agregar {
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--surface-2);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </section>
  );
}
