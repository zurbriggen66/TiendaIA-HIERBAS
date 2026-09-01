import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTienda } from './TiendaContext';
import { precioPorEscalon } from '../utils/escalones';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const ETIQUETA_UNIDAD = { kg: 'kg', pack: 'pack', caja: 'caja', unidad: 'unidad' };

// Tarjeta con selector de peso inline (Hierbas a Granel y cualquier otra categoría con
// venta_cantidad_fija): a diferencia del resto del catálogo, acá se agrega directo
// desde la lista, sin entrar al detalle del producto — porque solo hay 3 opciones
// posibles de cantidad, no tiene sentido una pantalla aparte para elegir entre ellas.
function TarjetaProductoGranel({ producto, categoria, unidadLabel, onAgregar }) {
  const cantidadesFijas = [...(categoria.cantidades_fijas || [])].sort((a, b) => Number(a.cantidad) - Number(b.cantidad));
  const [cantidad, setCantidad] = useState(cantidadesFijas[0] ? Number(cantidadesFijas[0].cantidad) : 0);

  return (
    <div className="categoria-detalle-producto-granel">
      <div className="categoria-detalle-producto-granel-encabezado">
        <div className="categoria-detalle-producto-imagen">
          {producto.imagen ? <img src={producto.imagen} alt={producto.nombre} /> : <span>🌿</span>}
        </div>
        <div className="categoria-detalle-producto-info">
          <h3>{producto.nombre}</h3>
          {producto.precio_base > 0 && (
            <strong>{formatearPrecio(producto.precio_base)} / {unidadLabel}</strong>
          )}
        </div>
      </div>

      <p className="categoria-detalle-producto-granel-aviso">ELIGE TU PESO (Solo estas opciones):</p>

      <div className="categoria-detalle-producto-granel-pesos">
        {cantidadesFijas.map((cf) => (
          <button
            key={cf.id}
            type="button"
            className={Number(cf.cantidad) === cantidad ? 'activo' : ''}
            onClick={() => setCantidad(Number(cf.cantidad))}
          >
            {Number(cf.cantidad).toFixed(2)} {unidadLabel}
          </button>
        ))}
      </div>

      <button type="button" className="categoria-detalle-producto-granel-agregar" onClick={() => onAgregar(producto, cantidad)}>
        <span className="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
        Agregar al carrito
      </button>
    </div>
  );
}

// Tarjeta con selector de cantidad (+/-) para categorías que se venden por kg o por
// unidad sin lista cerrada de opciones (Hierbas Medicinales por Kg, Yuyitos Combo
// Emprendedor, etc.): se agrega directo desde la lista sin entrar al detalle.
// Arranca en el "mínimo por variedad" si la categoría lo define, si no en 1.
function TarjetaProductoSelector({ producto, categoria, unidadLabel, precio, onAgregar, onVerDetalle }) {
  const paso = 1;
  const inicial = Number(categoria.cantidad_minima_variedad) > 0 ? Number(categoria.cantidad_minima_variedad) : paso;
  const [cantidad, setCantidad] = useState(inicial);
  const ajustar = (delta) => setCantidad((c) => Math.max(paso, Math.round((c + delta) * 100) / 100));

  return (
    <div className="categoria-detalle-producto-granel">
      <div className="categoria-detalle-producto-granel-encabezado">
        <button type="button" className="categoria-detalle-producto-imagen categoria-detalle-producto-imagen-link" onClick={onVerDetalle} aria-label={`Ver ${producto.nombre}`}>
          {producto.imagen ? <img src={producto.imagen} alt={producto.nombre} /> : <span>🌿</span>}
        </button>
        <div className="categoria-detalle-producto-info">
          <button type="button" className="categoria-detalle-producto-nombre-link" onClick={onVerDetalle}>{producto.nombre}</button>
          {producto.descripcion && <p className="categoria-detalle-producto-descripcion">{producto.descripcion}</p>}
          {precio > 0 && <strong>{formatearPrecio(precio)} / {unidadLabel}</strong>}
        </div>
      </div>

      <div className="categoria-detalle-selector-fila">
        <div className="categoria-detalle-stepper">
          <button type="button" onClick={() => ajustar(-paso)} aria-label="Restar">
            <span className="material-symbols-outlined" aria-hidden="true">remove</span>
          </button>
          <span className="categoria-detalle-stepper-valor">
            <strong>{cantidad}</strong>
            <small>{unidadLabel}</small>
          </span>
          <button type="button" onClick={() => ajustar(paso)} aria-label="Sumar">
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
          </button>
        </div>
        <button type="button" className="categoria-detalle-producto-granel-agregar" onClick={() => onAgregar(producto, cantidad)}>
          <span className="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}

export default function CategoriaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { categorias, productos, agregarAlCarrito } = useTienda();

  const categoria = categorias.find((c) => String(c.id) === id);
  const productosCategoria = productos.filter((p) => String(p.categoria) === id && p.activo !== false);
  const unidadLabel = categoria ? (ETIQUETA_UNIDAD[categoria.unidad_medida] || categoria.unidad_medida) : '';

  const galeriaRef = useRef(null);
  const [galeriaIndice, setGaleriaIndice] = useState(0);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  useEffect(() => {
    if (!imagenAmpliada) return;
    const alTeclado = (e) => { if (e.key === 'Escape') setImagenAmpliada(null); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [imagenAmpliada]);

  const anchoItemGaleria = () => {
    const el = galeriaRef.current;
    const item = el?.querySelector('.categoria-detalle-galeria-item');
    if (!item) return el?.clientWidth || 0;
    // getBoundingClientRect (no offsetWidth) porque el gap del flex no lo cuenta ninguno
    // de los dos — hay que sumarlo a mano para que el "click en la flecha" avance
    // exactamente un ítem, ni un pixel más ni menos.
    const estilo = getComputedStyle(el);
    return item.getBoundingClientRect().width + parseFloat(estilo.columnGap || estilo.gap || '0');
  };

  const desplazarGaleria = (direccion) => {
    galeriaRef.current?.scrollBy({ left: direccion * anchoItemGaleria(), behavior: 'smooth' });
  };

  useEffect(() => {
    const el = galeriaRef.current;
    if (!el) return;
    const alScrollear = () => {
      const ancho = anchoItemGaleria();
      if (ancho > 0) setGaleriaIndice(Math.round(el.scrollLeft / ancho));
    };
    el.addEventListener('scroll', alScrollear, { passive: true });
    return () => el.removeEventListener('scroll', alScrollear);
  }, [categoria?.imagenes?.length]);

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

      <header className="categoria-detalle-header">
        {categoria.imagen && (
          <img className="categoria-detalle-header-foto" src={categoria.imagen} alt={categoria.nombre} />
        )}
        <div className="categoria-detalle-header-texto">
          <h1 className="fuente-impacto">{categoria.nombre}</h1>
          {Number(categoria.cantidad_minima) > 0 && (
            <span className="categoria-detalle-minimo">
              <span className="material-symbols-outlined" aria-hidden="true">eco</span>
              Compra mínima: {categoria.cantidad_minima} {unidadLabel} (podés combinar variedades)
            </span>
          )}
        </div>
      </header>

      {categoria.descripcion && (
        <div className="categoria-detalle-nota">
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
          <p>{categoria.descripcion}</p>
        </div>
      )}

      {categoria.imagenes && categoria.imagenes.length > 0 && (
        <>
          <div className="categoria-detalle-galeria-wrap">
            {categoria.imagenes.length > 1 && (
              <button type="button" className="categoria-detalle-galeria-flecha izq" onClick={() => desplazarGaleria(-1)} aria-label="Foto anterior">
                <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
              </button>
            )}

            <div className="categoria-detalle-galeria" ref={galeriaRef}>
              {categoria.imagenes.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className="categoria-detalle-galeria-item"
                  onClick={() => setImagenAmpliada(img.imagen)}
                >
                  <img src={img.imagen} alt={`${categoria.nombre} - foto`} loading="lazy" />
                </button>
              ))}
            </div>

            {categoria.imagenes.length > 1 && (
              <button type="button" className="categoria-detalle-galeria-flecha der" onClick={() => desplazarGaleria(1)} aria-label="Foto siguiente">
                <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
              </button>
            )}
          </div>

          {categoria.imagenes.length > 1 && (
            <div className="categoria-detalle-galeria-puntos">
              {categoria.imagenes.map((img, i) => (
                <span key={img.id} className={i === galeriaIndice ? 'activo' : ''} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="categoria-detalle-subtitulo">
        <span className="material-symbols-outlined" aria-hidden="true">eco</span>
        <h2 className="fuente-impacto">Productos disponibles</h2>
        <span className="categoria-detalle-subtitulo-linea" aria-hidden="true" />
      </div>

      {categoria.escalones && categoria.escalones.length > 0 && (
        <div className="categoria-detalle-escalones">
          <h3>
            <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
            Precio por volumen (según el total de {categoria.nombre}, combinando variedades)
          </h3>
          <div className="categoria-detalle-escalones-lista">
            {categoria.escalones.map((e, i) => {
              const esMejor = i === categoria.escalones.length - 1;
              return (
                <div key={e.id} className={`categoria-detalle-escalon-fila ${esMejor ? 'categoria-detalle-escalon-mejor' : ''}`}>
                  <span className="categoria-detalle-escalon-nombre">
                    {e.etiqueta || `Desde ${e.cantidad_desde} ${unidadLabel}`}
                    {esMejor && <span className="categoria-detalle-badge-mejor">Mejor precio</span>}
                  </span>
                  <span className="categoria-detalle-escalon-precio">
                    {formatearPrecio(e.precio_unitario)} <small>/ {unidadLabel}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

            if (categoria.venta_cantidad_fija) {
              return (
                <TarjetaProductoGranel
                  key={producto.id}
                  producto={producto}
                  categoria={categoria}
                  unidadLabel={unidadLabel}
                  onAgregar={agregarAlCarrito}
                />
              );
            }

            return (
              <TarjetaProductoSelector
                key={producto.id}
                producto={producto}
                categoria={categoria}
                unidadLabel={unidadLabel}
                precio={precioMinorista}
                onAgregar={agregarAlCarrito}
                onVerDetalle={() => navigate(`/producto/${producto.id}`)}
              />
            );
          })}
        </div>
      )}

      {imagenAmpliada && (
        <div
          className="categoria-detalle-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setImagenAmpliada(null)}
        >
          <button type="button" className="categoria-detalle-lightbox-cerrar" aria-label="Cerrar">✕</button>
          <img src={imagenAmpliada} alt={`${categoria.nombre} - foto ampliada`} />
        </div>
      )}

      <style>{`
        .categoria-detalle-seccion {
          /* width:100% no es redundante con max-width: .cliente-container es flex
             column, y "margin: 0 auto" en un hijo flex desactiva el estirado por
             defecto — sin esto la sección se achica a su contenido mínimo en vez de
             usar los 1100px disponibles en desktop. */
          width: 100%;
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
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 24px;
        }

        .categoria-detalle-header-foto {
          width: 100%;
          max-height: 420px;
          object-fit: cover;
          border-radius: 24px;
          background-color: var(--surface-2);
        }

        .categoria-detalle-header-texto {
          padding: 22px 24px;
          background: var(--surface, #f2f7ef);
          border-radius: 20px;
          box-shadow: 0 10px 30px -20px rgba(28, 28, 22, 0.35);
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
        }

        .categoria-detalle-header-texto h1 {
          font-size: 1.9rem;
          line-height: 1.15;
          color: var(--accent, #1a361b);
          margin: 0;
        }

        .categoria-detalle-nota {
          display: flex;
          gap: 10px;
          background: var(--surface-2, #eef3ea);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 18px;
          margin-bottom: 24px;
        }

        .categoria-detalle-nota .material-symbols-outlined {
          color: var(--accent-light, #2f4f30);
          flex-shrink: 0;
        }

        .categoria-detalle-nota p {
          margin: 0;
          color: var(--text, #2a3a2a);
          font-size: 0.95rem;
          line-height: 1.45;
          /* pre-line: el dueño puede escribir las reglas de compra en varios
             renglones desde el admin y se respetan tal cual. */
          white-space: pre-line;
        }

        .categoria-detalle-lightbox {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(12, 14, 10, 0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          cursor: zoom-out;
        }

        .categoria-detalle-lightbox img {
          max-width: 100%;
          max-height: 100%;
          border-radius: 12px;
          object-fit: contain;
        }

        .categoria-detalle-lightbox-cerrar {
          position: absolute;
          top: 16px;
          right: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 1.1rem;
          cursor: pointer;
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

        .categoria-detalle-galeria-wrap {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .categoria-detalle-galeria {
          flex: 1;
          min-width: 0;
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }

        .categoria-detalle-galeria::-webkit-scrollbar {
          display: none;
        }

        .categoria-detalle-galeria-item {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: 130px;
          height: 130px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 18px -12px rgba(28, 28, 22, 0.35);
          border: none;
          padding: 0;
          background: none;
          cursor: zoom-in;
        }

        .categoria-detalle-galeria-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .categoria-detalle-galeria-flecha {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 6px 14px -8px rgba(28, 28, 22, 0.35);
        }

        .categoria-detalle-galeria-puntos {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-bottom: 24px;
        }

        .categoria-detalle-galeria-puntos span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--border);
          transition: width 0.2s ease, background 0.2s ease;
        }

        .categoria-detalle-galeria-puntos span.activo {
          width: 18px;
          background: var(--accent, #1a361b);
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
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          align-items: start;
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

        .categoria-detalle-producto-granel {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 8px 20px -16px rgba(28, 28, 22, 0.25);
        }

        .categoria-detalle-producto-granel-encabezado {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .categoria-detalle-producto-granel-aviso {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--text-muted);
        }

        .categoria-detalle-producto-granel-pesos {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .categoria-detalle-producto-granel-pesos button {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          color: var(--text);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .categoria-detalle-producto-granel-pesos button.activo {
          border-color: var(--accent, #1a361b);
          background: var(--accent, #1a361b);
          color: #ffffff;
        }

        .categoria-detalle-producto-granel-agregar {
          width: 100%;
          height: 46px;
          border: none;
          border-radius: 999px;
          background: var(--accent, #1a361b);
          color: #ffffff;
          font-family: 'Work Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
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

        .categoria-detalle-producto-imagen-link {
          border: none;
          padding: 0;
          cursor: pointer;
        }

        .categoria-detalle-producto-nombre-link {
          align-self: flex-start;
          border: none;
          background: none;
          padding: 0;
          font-family: inherit;
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--text);
          text-align: left;
          cursor: pointer;
        }

        .categoria-detalle-producto-nombre-link:hover {
          text-decoration: underline;
        }

        .categoria-detalle-selector-fila {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .categoria-detalle-selector-fila .categoria-detalle-producto-granel-agregar {
          flex: 1;
          width: auto;
        }

        .categoria-detalle-stepper {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 4px;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 3px;
          background: var(--surface-2);
        }

        .categoria-detalle-stepper button {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 50%;
          background: var(--surface);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .categoria-detalle-stepper button .material-symbols-outlined {
          font-size: 18px;
        }

        .categoria-detalle-stepper-valor {
          min-width: 46px;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }

        .categoria-detalle-stepper-valor strong {
          font-size: 1rem;
          color: var(--text);
        }

        .categoria-detalle-stepper-valor small {
          font-size: 0.62rem;
          color: var(--text-muted);
        }

        .categoria-detalle-escalones {
          background: var(--surface-2);
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .categoria-detalle-escalones h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          color: var(--text);
          margin: 0 0 12px;
        }

        .categoria-detalle-escalones-lista {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .categoria-detalle-escalon-fila {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 10px 14px;
          border-radius: 10px;
        }

        .categoria-detalle-escalon-mejor {
          border-color: var(--accent);
          background: rgba(26, 54, 27, 0.06);
        }

        .categoria-detalle-escalon-nombre {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: var(--text);
          font-size: 0.88rem;
        }

        .categoria-detalle-badge-mejor {
          background: var(--accent);
          color: #ffffff;
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .categoria-detalle-escalon-precio {
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          font-size: 0.88rem;
        }

        .categoria-detalle-escalon-precio small {
          font-weight: 500;
          color: var(--text-muted);
        }
      `}</style>
    </section>
  );
}
