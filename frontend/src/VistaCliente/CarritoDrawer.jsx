import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { resumenPorCategoria, precioUnitarioItem } from '../utils/escalones';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const ETIQUETA_UNIDAD = { kg: 'kg', pack: 'packs', caja: 'cajas', unidad: 'unidades' };

function armarMensajeWhatsapp({ nombre, telefono, tipoEntrega, direccion, items, resumen, total }) {
  const lineas = [
    '🌿 *Nuevo pedido mayorista*',
    '',
    `Cliente: ${nombre}`,
    `Teléfono: ${telefono}`,
    `Entrega: ${tipoEntrega === 'envio' ? 'Envío' : 'Retiro en local'}`,
  ];
  if (tipoEntrega === 'envio') {
    lineas.push(`Dirección: ${direccion}`);
    lineas.push('(El costo de envío se coordina por WhatsApp)');
  }
  lineas.push('', 'Productos:');
  items.forEach((item) => {
    const precio = precioUnitarioItem(item, resumen);
    lineas.push(`${item.cantidad}x ${item.producto.nombre} - ${formatearPrecio(precio * item.cantidad)}`);
  });
  lineas.push('', `*Total: ${formatearPrecio(total)}*`);
  return lineas.join('\n');
}

export default function CarritoDrawer({ items, categorias, logoPrecarga, whatsapp, onClose, onCambiarCantidad, onQuitar, onVaciar, cliente, onClienteActualizado, tiendaAbierta = true, mensajeCerrado }) {
  const [nombre, setNombre] = useState(cliente?.nombre || '');
  const [telefono, setTelefono] = useState(cliente?.telefono || '');
  const [usarPuntos, setUsarPuntos] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [direccion, setDireccion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [linkWhatsapp, setLinkWhatsapp] = useState(null);

  useEffect(() => {
    const scrollY = window.scrollY;
    const { body } = document;
    const html = document.documentElement;
    const previoBody = { position: body.style.position, top: body.style.top, width: body.style.width };
    const previoOverflowHtml = html.style.overflow;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    return () => {
      body.style.position = previoBody.position;
      body.style.top = previoBody.top;
      body.style.width = previoBody.width;
      html.style.overflow = previoOverflowHtml;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const categoriasPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const resumen = useMemo(() => resumenPorCategoria(items, categoriasPorId), [items, categoriasPorId]);
  const faltaAlgunMinimo = resumen.some((g) => g.faltante > 0 || g.variedadesBajoMinimo.length > 0);

  const total = items.reduce((acc, item) => acc + precioUnitarioItem(item, resumen) * item.cantidad, 0);
  const descuentoPuntos = Math.min(Number(cliente?.puntos_en_pesos) || 0, total);

  const enviarPedido = async (e) => {
    e.preventDefault();
    if (items.length === 0 || !tiendaAbierta || faltaAlgunMinimo) return;

    const nuevosErrores = {};
    if (!nombre.trim()) nuevosErrores.nombre = 'Falta tu nombre';
    if (!telefono.trim()) nuevosErrores.telefono = 'Falta tu teléfono';
    if (tipoEntrega === 'envio' && !direccion.trim()) nuevosErrores.direccion = 'Falta la dirección de envío';

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    setErrores({});
    setErrorEnvio('');
    setEnviando(true);

    const mensaje = armarMensajeWhatsapp({ nombre, telefono, tipoEntrega, direccion, items, resumen, total });
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
    const ventana = window.open(url, '_blank', 'noopener,noreferrer');
    setLinkWhatsapp(!ventana || ventana.closed ? url : null);

    try {
      await api.post('/pedidos/', {
        usar_puntos: usarPuntos,
        cliente: nombre.trim(),
        telefono: telefono.trim(),
        tipo_entrega: tipoEntrega,
        direccion: tipoEntrega === 'envio' ? direccion.trim() : '',
        origen: 'web',
        items: items.map((item) => ({ producto: item.producto.id, cantidad: item.cantidad })),
      });
      if (usarPuntos && cliente) {
        api.get('/clientes/mi-cuenta/').then((r) => onClienteActualizado?.(r.data)).catch(() => {});
      }
      setExito(true);
      onVaciar();
    } catch (error) {
      // El mínimo por categoría también lo valida el backend: si algo cambió (ej. otro
      // cliente pidió justo antes), este mensaje explica por qué no se pudo registrar
      // aunque el WhatsApp ya se haya abierto.
      const detalle = error.response?.data?.non_field_errors?.[0] || error.response?.data?.detail;
      setErrorEnvio(detalle || 'El pedido se envió por WhatsApp, pero no pudimos registrarlo en el sistema. Te contactamos igual.');
      console.error('Error al registrar el pedido:', error);
    }

    setEnviando(false);
  };

  return (
    <div className="pedido-overlay" onClick={onClose}>
      <aside className="pedido-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="pedido-header">
          <div className="pedido-header-titulo">
            {logoPrecarga ? (
              <img src={logoPrecarga} alt="" className="pedido-header-logo" />
            ) : (
              <span className="pedido-header-icono">🌿</span>
            )}
            <div>
              <h3>Tu pedido</h3>
              {items.length > 0 && !exito && (
                <p className="pedido-header-subtitulo">
                  {items.length} producto{items.length === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>
          <button type="button" className="pedido-cerrar" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {exito ? (
          <div className="pedido-exito">
            <span className="pedido-exito-icono">✅</span>
            <p>¡Pedido enviado! Te vamos a contactar por WhatsApp para confirmarlo.</p>
            {linkWhatsapp && (
              <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="pedido-btn-whatsapp pedido-link-whatsapp">
                📲 Tu navegador bloqueó la ventana, tocá acá para abrir WhatsApp
              </a>
            )}
            <button type="button" className="pedido-btn-primario" onClick={onClose}>Cerrar</button>
          </div>
        ) : items.length === 0 ? (
          <div className="pedido-vacio">
            <span className="pedido-vacio-icono">🛒</span>
            <p style={{ margin: 0 }}>Todavía no agregaste productos.</p>
          </div>
        ) : (
          <form onSubmit={enviarPedido} className="pedido-form">
            {resumen.map((grupo) => {
              const unidadEtiqueta = ETIQUETA_UNIDAD[grupo.categoria.unidad_medida] || grupo.categoria.unidad_medida;
              const tieneAviso = grupo.faltante > 0 || grupo.variedadesBajoMinimo.length > 0;
              return (
                <div key={grupo.categoria.id} className={`categoria-resumen ${tieneAviso ? 'categoria-resumen-falta' : 'categoria-resumen-ok'}`}>
                  <div className="categoria-resumen-fila">
                    <strong>{grupo.categoria.nombre}</strong>
                    <span>{grupo.cantidadTotal} {unidadEtiqueta}</span>
                  </div>
                  {grupo.faltante > 0 && (
                    <span className="categoria-resumen-aviso">
                      Faltan {grupo.faltante} {unidadEtiqueta} para el mínimo de {grupo.categoria.cantidad_minima}
                    </span>
                  )}
                  {grupo.variedadesBajoMinimo.map((v) => (
                    <span key={v.nombre} className="categoria-resumen-aviso">
                      Faltan {v.falta} {unidadEtiqueta} de {v.nombre} (mínimo {grupo.minimoVariedad} por variedad)
                    </span>
                  ))}
                  {!tieneAviso && grupo.precioEscalon != null && (
                    <span className="categoria-resumen-precio">Precio vigente: {formatearPrecio(grupo.precioEscalon)} c/u</span>
                  )}
                  {grupo.granelMinimoTotal > 0 && (
                    grupo.enModoGranel ? (
                      <span className="categoria-resumen-precio">🎉 ¡Llegaste al precio a granel!</span>
                    ) : grupo.faltaParaGranel > 0 ? (
                      <span className="categoria-resumen-tip">
                        Sumá {grupo.faltaParaGranel} {unidadEtiqueta} más (con al menos {grupo.granelMinimoVariedad} {unidadEtiqueta} de cada variedad) para el precio a granel
                      </span>
                    ) : grupo.variedadesBajoMinimoGranel.length > 0 ? (
                      <span className="categoria-resumen-tip">
                        Ya juntaste el total para precio a granel: llevá al menos {grupo.granelMinimoVariedad} {unidadEtiqueta} de cada variedad elegida para que se aplique
                      </span>
                    ) : null
                  )}
                </div>
              );
            })}

            <div className="pedido-items">
              {items.map((item) => {
                const precioUnitario = precioUnitarioItem(item, resumen);
                const subtotalItem = precioUnitario * item.cantidad;
                return (
                  <div key={item.lineaId} className="pedido-item">
                    <div className="pedido-item-imagen">
                      {item.producto.imagen ? <img src={item.producto.imagen} alt={item.producto.nombre} /> : <span>🌿</span>}
                    </div>

                    <div className="pedido-item-info">
                      <div className="pedido-item-titulo">
                        <strong>{item.producto.nombre}</strong>
                      </div>
                      {item.producto.contenido && <span className="pedido-item-extras">{item.producto.contenido}</span>}
                      <span className="pedido-item-precio">{formatearPrecio(precioUnitario)} c/u</span>
                    </div>

                    <div className="pedido-item-acciones">
                      <button type="button" className="pedido-item-quitar" onClick={() => onQuitar(item.lineaId)} aria-label="Quitar producto">🗑</button>
                      <div className="pedido-item-cantidad">
                        <button type="button" onClick={() => onCambiarCantidad(item.lineaId, item.cantidad - 1)} aria-label="Restar">−</button>
                        <span>{item.cantidad}</span>
                        <button type="button" onClick={() => onCambiarCantidad(item.lineaId, item.cantidad + 1)} aria-label="Sumar">+</button>
                      </div>
                      <span className="pedido-item-subtotal">{formatearPrecio(subtotalItem)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {cliente && cliente.puntos > 0 && (
              <label className="carrito-puntos">
                <input type="checkbox" checked={usarPuntos} onChange={(e) => setUsarPuntos(e.target.checked)} />
                <span>
                  ⭐ Usar mis {cliente.puntos} puntos
                  <small> (hasta −{formatearPrecio(descuentoPuntos)})</small>
                </span>
              </label>
            )}

            <div className="pedido-resumen">
              <div className="pedido-resumen-fila">
                <span>Subtotal</span>
                <span>{formatearPrecio(total)}</span>
              </div>
              {usarPuntos && descuentoPuntos > 0 && (
                <div className="pedido-resumen-fila pedido-resumen-descuento">
                  <span>Descuento por puntos</span>
                  <span>−{formatearPrecio(descuentoPuntos)}</span>
                </div>
              )}
              <div className="pedido-resumen-fila pedido-resumen-total">
                <span>Total</span>
                <strong>{formatearPrecio(Math.max(total - (usarPuntos ? descuentoPuntos : 0), 0))}</strong>
              </div>
            </div>

            <div className="pedido-seccion">
              <div className="pedido-seccion-titulo">
                <span className="pedido-seccion-icono pedido-seccion-icono-contacto">👤</span>
                <span>Datos de contacto</span>
              </div>
              <div className="pedido-campo">
                <input
                  type="text"
                  className={`pedido-input ${errores.nombre ? 'pedido-input-error' : ''}`}
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); setErrores((prev) => ({ ...prev, nombre: undefined })); }}
                  placeholder="Tu nombre"
                />
                {errores.nombre && <span className="pedido-error-texto">{errores.nombre}</span>}
              </div>
              <div className="pedido-campo">
                <input
                  type="tel"
                  className={`pedido-input ${errores.telefono ? 'pedido-input-error' : ''}`}
                  value={telefono}
                  onChange={(e) => { setTelefono(e.target.value); setErrores((prev) => ({ ...prev, telefono: undefined })); }}
                  placeholder="Tu WhatsApp o teléfono"
                />
                {errores.telefono && <span className="pedido-error-texto">{errores.telefono}</span>}
              </div>
            </div>

            <div className="pedido-seccion">
              <div className="pedido-seccion-titulo">
                <span className="pedido-seccion-icono">📍</span>
                <span>¿Cómo lo recibís?</span>
              </div>
              <div className="pedido-entrega-opciones">
                <button
                  type="button"
                  className={`pedido-entrega-opcion ${tipoEntrega === 'retiro' ? 'pedido-entrega-activa' : ''}`}
                  onClick={() => { setTipoEntrega('retiro'); setErrores((prev) => ({ ...prev, direccion: undefined })); }}
                >
                  {tipoEntrega === 'retiro' && <span className="pedido-entrega-check">✓</span>}
                  <span className="pedido-entrega-icono">🏬</span>
                  <span className="pedido-entrega-nombre">Retiro en local</span>
                  <span className="pedido-entrega-desc">Retirás tu pedido en el local</span>
                </button>
                <button
                  type="button"
                  className={`pedido-entrega-opcion ${tipoEntrega === 'envio' ? 'pedido-entrega-activa' : ''}`}
                  onClick={() => { setTipoEntrega('envio'); setErrores((prev) => ({ ...prev, direccion: undefined })); }}
                >
                  {tipoEntrega === 'envio' && <span className="pedido-entrega-check">✓</span>}
                  <span className="pedido-entrega-icono">🚚</span>
                  <span className="pedido-entrega-nombre">Envío</span>
                  <span className="pedido-entrega-desc">Te lo enviamos a todo el país</span>
                </button>
              </div>
            </div>

            {tipoEntrega === 'envio' && (
              <>
                <div className="pedido-campo">
                  <input
                    type="text"
                    className={`pedido-input ${errores.direccion ? 'pedido-input-error' : ''}`}
                    value={direccion}
                    onChange={(e) => { setDireccion(e.target.value); setErrores((prev) => ({ ...prev, direccion: undefined })); }}
                    placeholder="Dirección y localidad"
                  />
                  {errores.direccion && <span className="pedido-error-texto">{errores.direccion}</span>}
                </div>
                <p className="pedido-aviso">🚚 El costo de envío se coordina por WhatsApp.</p>
              </>
            )}

            {errorEnvio && <p className="pedido-error-texto pedido-error-envio">{errorEnvio}</p>}

            {!tiendaAbierta ? (
              <p className="pedido-cerrado-aviso">
                😴 Estamos cerrados en este momento — {mensajeCerrado || 'volvemos pronto'}. Guardá tu carrito y volvé a intentar más tarde.
              </p>
            ) : faltaAlgunMinimo ? (
              <p className="pedido-cerrado-aviso">
                Todavía falta llegar al mínimo de compra en alguna categoría (ver arriba) para poder enviar el pedido.
              </p>
            ) : (
              <>
                <button type="submit" className="pedido-btn-finalizar" disabled={enviando}>
                  {enviando ? 'Enviando...' : '📲 Enviar pedido por WhatsApp'}
                </button>
                <p className="pedido-confianza">Te confirmamos el pedido por WhatsApp antes de despacharlo.</p>
              </>
            )}
          </form>
        )}
      </aside>

      <style>{`
        .pedido-overlay {
          position: fixed;
          inset: 0;
          height: 100vh;
          height: 100dvh;
          background: rgba(17, 24, 39, 0.55);
          z-index: 10000;
          display: flex;
          justify-content: flex-end;
          animation: pedidoFondoAparece 0.2s ease-out;
          overscroll-behavior: contain;
        }

        @keyframes pedidoFondoAparece {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .pedido-drawer {
          width: 100%;
          max-width: 440px;
          height: 100vh;
          height: 100dvh;
          background: #ffffff;
          padding: 0 22px 22px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          box-shadow: -24px 0 48px -12px rgba(0, 0, 0, 0.5);
          animation: pedidoDrawerAparece 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes pedidoDrawerAparece {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .pedido-overlay, .pedido-drawer { animation: none; }
        }

        .pedido-header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0 16px;
          margin: 0 0 20px;
          background: #ffffff;
          border-bottom: 1px solid #f0f1f4;
        }

        .pedido-header-titulo { display: flex; align-items: center; gap: 12px; }

        .pedido-header-icono {
          width: 38px; height: 38px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          background: linear-gradient(135deg, #aac398, #8caa78);
          box-shadow: 0 6px 14px -6px rgba(140, 170, 120, 0.55);
        }

        .pedido-header-logo {
          width: 38px; height: 38px; border-radius: 11px;
          object-fit: contain;
          background: linear-gradient(135deg, #aac398, #8caa78);
          box-shadow: 0 6px 14px -6px rgba(140, 170, 120, 0.55);
        }

        .pedido-header h3 { margin: 0; color: #14181f; font-size: 1.18rem; font-weight: 800; letter-spacing: -0.01em; }
        .pedido-header-subtitulo { margin: 1px 0 0; font-size: 0.76rem; color: #94a3b8; font-weight: 600; }

        .pedido-cerrar {
          width: 34px; height: 34px; border-radius: 50%; border: none;
          background: #f4f5f7; color: #6b7684; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .pedido-cerrar:hover { background: #e4e7ec; color: #1a2333; }

        .pedido-vacio {
          text-align: center; color: #94a3b8; padding: 64px 0;
          display: flex; flex-direction: column; align-items: center; gap: 12px; font-weight: 600;
        }
        .pedido-vacio-icono {
          width: 64px; height: 64px; border-radius: 50%; background: #f4f5f7;
          display: flex; align-items: center; justify-content: center; font-size: 1.8rem;
        }

        .categoria-resumen {
          display: flex; flex-direction: column; gap: 4px;
          border-radius: 12px; padding: 10px 14px; margin-bottom: 8px;
        }
        .categoria-resumen-ok { background: #eef7e6; border: 1px solid #cfe8ba; }
        .categoria-resumen-falta { background: #fff4e5; border: 1px solid #f3c67a; }
        .categoria-resumen-fila { display: flex; justify-content: space-between; font-size: 0.85rem; color: #1a2333; }
        .categoria-resumen-aviso { font-size: 0.76rem; font-weight: 700; color: #b45309; }
        .categoria-resumen-precio { font-size: 0.76rem; font-weight: 700; color: #3f6212; }
        .categoria-resumen-tip { font-size: 0.76rem; font-weight: 600; color: #6b7684; }

        .pedido-items { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

        .pedido-item {
          display: flex; align-items: flex-start; gap: 12px; padding: 12px;
          border-radius: 16px; border: 1px solid #f0f1f4; background: #fbfbfc;
        }

        .pedido-item-imagen {
          flex-shrink: 0; width: 60px; height: 60px; border-radius: 12px; overflow: hidden;
          background: #eef3e6; display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.15);
        }
        .pedido-item-imagen img { width: 100%; height: 100%; object-fit: cover; }

        .pedido-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .pedido-item-titulo { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .pedido-item-titulo strong { font-size: 0.92rem; color: #1a2333; }
        .pedido-item-extras { font-size: 0.78rem; color: #8a7c70; }
        .pedido-item-precio { font-size: 0.78rem; color: #64748b; }

        .pedido-item-acciones { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
        .pedido-item-quitar {
          width: 26px; height: 26px; border-radius: 50%; border: none; background: #fdeceb;
          color: #ef4444; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .pedido-item-quitar:hover { background: #fbdad7; }

        .pedido-item-cantidad { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e6eb; border-radius: 999px; padding: 3px 4px; }
        .pedido-item-cantidad button {
          width: 22px; height: 22px; border-radius: 50%; border: none; background: #f1f3f6;
          color: #1a2333; font-size: 0.85rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .pedido-item-cantidad button:hover { background: #e4e7ec; }
        .pedido-item-cantidad span { min-width: 14px; text-align: center; font-size: 0.82rem; font-weight: 700; color: #1a2333; }

        .pedido-item-subtotal { font-size: 0.85rem; font-weight: 800; color: #1a2333; }

        .carrito-puntos {
          display: flex; align-items: center; gap: 10px; background: #fffaeb; border: 1px solid #fde68a;
          border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; cursor: pointer;
          font-size: 0.86rem; font-weight: 600; color: #1a2333;
        }
        .carrito-puntos small { color: #92722f; font-weight: 500; }

        .pedido-resumen {
          display: flex; flex-direction: column; gap: 8px; background: #fafbfc; border: 1px solid #f0f1f4;
          border-radius: 16px; padding: 16px 18px; margin-bottom: 22px;
        }
        .pedido-resumen-fila { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600; color: #6b7684; }
        .pedido-resumen-descuento { color: #16a34a; }
        .pedido-resumen-total { padding-top: 10px; margin-top: 2px; border-top: 1px dashed #e2e6eb; font-weight: 800; font-size: 0.98rem; color: #14181f; }
        .pedido-resumen-total strong { font-size: 1.3rem; color: #8caa78; }

        .pedido-seccion { margin-bottom: 16px; padding: 16px; border-radius: 16px; border: 1px solid #f0f1f4; background: #fbfbfc; }
        .pedido-seccion-titulo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; font-weight: 700; font-size: 0.92rem; color: #1a2333; }
        .pedido-seccion-icono { width: 30px; height: 30px; border-radius: 50%; background: #eef3e6; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
        .pedido-seccion-icono-contacto { background: #ede9fe; }

        .pedido-campo { margin-bottom: 10px; }
        .pedido-input {
          width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #eef0f3;
          background: #ffffff; font-size: 0.9rem; font-family: inherit; color: #1a2333;
        }
        .pedido-input::placeholder { color: #9aa4b2; }
        .pedido-input:focus { outline: none; border-color: #8caa78; box-shadow: 0 0 0 3px rgba(140, 170, 120, 0.14); }
        .pedido-input-error { border-color: #ef4444; background: #fef4f3; }
        .pedido-error-texto { display: block; margin-top: 6px; font-size: 0.76rem; color: #ef4444; font-weight: 600; }
        .pedido-error-envio { margin: 0 0 12px; }

        .pedido-entrega-opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pedido-entrega-opcion {
          position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
          text-align: left; padding: 14px 14px 12px; border-radius: 14px; border: 1.5px solid #eef0f3;
          background: #ffffff; cursor: pointer; font-family: inherit;
        }
        .pedido-entrega-opcion:hover { border-color: #cfe0bd; }
        .pedido-entrega-activa { border-color: #8caa78; background: linear-gradient(180deg, rgba(140, 170, 120, 0.08), rgba(157, 185, 126, 0.02)); }
        .pedido-entrega-check {
          position: absolute; top: 10px; right: 10px; width: 20px; height: 20px; border-radius: 50%;
          background: linear-gradient(135deg, #aac398, #8caa78); color: #ffffff; font-size: 0.65rem;
          display: flex; align-items: center; justify-content: center;
        }
        .pedido-entrega-icono { font-size: 1.3rem; }
        .pedido-entrega-nombre { font-weight: 700; font-size: 0.85rem; color: #1a2333; }
        .pedido-entrega-desc { font-size: 0.72rem; color: #8a7c70; line-height: 1.3; }

        .pedido-aviso { font-size: 0.8rem; color: #4d6b32; background: #eef3e6; border: 1px dashed #b7cf9c; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; }
        .pedido-cerrado-aviso { font-size: 0.88rem; font-weight: 600; color: #78350f; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 12px; padding: 14px 16px; margin: 0; line-height: 1.4; }

        .pedido-btn-whatsapp {
          width: 100%; background: linear-gradient(135deg, #25d366, #128c7e); color: #ffffff; border: none;
          padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; font-family: inherit; cursor: pointer;
        }
        .pedido-btn-whatsapp:hover { transform: translateY(-1px); box-shadow: 0 8px 16px -6px rgba(37, 211, 102, 0.5); }

        .pedido-btn-finalizar {
          width: 100%; background: #14181f; color: #ffffff; border: none; padding: 15px 24px;
          border-radius: 999px; font-weight: 700; font-size: 0.95rem; letter-spacing: 0.01em; font-family: inherit;
          cursor: pointer; box-shadow: 0 10px 24px -10px rgba(20, 24, 31, 0.5);
        }
        .pedido-btn-finalizar:hover { transform: translateY(-1px); }
        .pedido-btn-finalizar:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

        .pedido-btn-primario {
          background: linear-gradient(135deg, #aac398, #8caa78); color: #ffffff; border: none;
          padding: 12px 24px; border-radius: 10px; font-weight: 700; font-family: inherit; cursor: pointer;
        }

        .pedido-confianza { text-align: center; font-size: 0.75rem; color: #a89a8f; margin: 14px 0 0; }

        .pedido-exito { text-align: center; padding: 48px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; color: #1a2333; }
        .pedido-exito-icono { width: 72px; height: 72px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; font-size: 2.1rem; }
        .pedido-exito p { max-width: 300px; line-height: 1.5; color: #4b5563; }
        .pedido-link-whatsapp { display: inline-block; width: auto; text-decoration: none; text-align: center; }
      `}</style>
    </div>
  );
}
