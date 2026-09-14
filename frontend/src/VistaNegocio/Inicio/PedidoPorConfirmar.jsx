import React, { useState } from 'react';
import { armarLinkWhatsapp } from '../../utils/whatsapp';
import {
  UNIDAD_CORTA,
  formatearCantidad,
  formatearHora,
  formatearPrecio,
} from '../../utils/formato';

/**
 * Un pedido de la tienda web esperando confirmación.
 *
 * Colapsada (el estado por defecto) muestra lo justo para decidir de un
 * vistazo: quién, cuándo, cómo lo recibe, cuántos productos y el total — así
 * entran varios pedidos en la pantalla sin scrollear. El detalle completo
 * (líneas, desglose, teléfono, dirección, nota) se despliega con "Ver
 * detalle", para cuando hay que cotejarlo contra el WhatsApp del cliente.
 *
 * Todo esto ya venía en la respuesta de /pedidos/ (el viewset hace prefetch de
 * items y categoría), así que no agrega ni un request.
 */
export default function PedidoPorConfirmar({ pedido, ocupado, onConfirmar, onCancelar }) {
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const items = pedido.items || [];
  const esEnvio = pedido.tipo_entrega === 'envio';

  const subtotal = Number(pedido.subtotal) || 0;
  const total = Number(pedido.total) || 0;
  const envio = Number(pedido.costo_envio) || 0;
  const descuentoPuntos = Number(pedido.descuento_puntos) || 0;
  const descuentoPct = Number(pedido.descuento_pct) || 0;
  const montoDescuentoPct = descuentoPct ? (subtotal * descuentoPct) / 100 : 0;
  // El desglose sólo aporta si hay algo que explique la diferencia con el total.
  const hayDesglose = envio > 0 || descuentoPuntos > 0 || montoDescuentoPct > 0;

  const linkWa = armarLinkWhatsapp(pedido.telefono);
  const destino = [pedido.direccion, pedido.localidad_nombre].filter(Boolean).join(', ');

  return (
    <article className="ipc-item">
      <header className="ipc-cabecera">
        <div className="ipc-quien">
          <h4 className="ipc-nombre">{pedido.cliente || `Pedido #${pedido.id}`}</h4>
          <div className="ipc-meta">
            <span className="ipc-meta-dato">
              <span className="material-symbols-outlined ipc-ico" aria-hidden="true">schedule</span>
              {formatearHora(pedido.creado)}
            </span>
            <span className={`ipc-chip ${esEnvio ? 'ipc-chip-envio' : 'ipc-chip-retiro'}`}>
              <span className="material-symbols-outlined ipc-ico" aria-hidden="true">
                {esEnvio ? 'local_shipping' : 'storefront'}
              </span>
              {esEnvio ? 'Envío' : 'Retiro'}
            </span>
            {items.length > 0 && (
              <span className="ipc-meta-dato">
                {items.length} producto{items.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <p className="ipc-total">{formatearPrecio(total)}</p>
      </header>

      <button
        type="button"
        className="ipc-toggle-detalle"
        onClick={() => setDetalleAbierto((v) => !v)}
        aria-expanded={detalleAbierto}
      >
        {detalleAbierto ? 'Ocultar detalle' : 'Ver detalle'}
        <span className="material-symbols-outlined ipc-ico" aria-hidden="true">
          {detalleAbierto ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {detalleAbierto && (
        <>
          {items.length > 0 ? (
            <ul className="ipc-items">
              {items.map((item) => (
                <li key={item.id} className="ipc-linea">
                  <span className="ipc-cant">
                    {formatearCantidad(item.cantidad)}
                    {UNIDAD_CORTA[item.unidad_medida] ? (
                      <span className="ipc-unidad">{UNIDAD_CORTA[item.unidad_medida]}</span>
                    ) : null}
                  </span>
                  <span className="ipc-producto">
                    <span className="ipc-producto-nombre">{item.producto_nombre}</span>
                    <span className="ipc-precio-unit">{formatearPrecio(item.precio_unitario)} c/u</span>
                  </span>
                  <span className="ipc-subtotal">{formatearPrecio(item.subtotal)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ipc-sin-items">Este pedido llegó sin líneas cargadas.</p>
          )}

          {hayDesglose && (
            <dl className="ipc-desglose">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatearPrecio(subtotal)}</dd>
              </div>
              {envio > 0 && (
                <div>
                  <dt>Envío</dt>
                  <dd>{formatearPrecio(envio)}</dd>
                </div>
              )}
              {montoDescuentoPct > 0 && (
                <div className="ipc-desglose-resta">
                  <dt>{`Descuento ${descuentoPct}%`}</dt>
                  <dd>{`− ${formatearPrecio(montoDescuentoPct)}`}</dd>
                </div>
              )}
              {descuentoPuntos > 0 && (
                <div className="ipc-desglose-resta">
                  <dt>Puntos canjeados</dt>
                  <dd>{`− ${formatearPrecio(descuentoPuntos)}`}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="ipc-datos">
            {pedido.telefono && (
              <span className="ipc-dato">
                <span className="material-symbols-outlined ipc-ico" aria-hidden="true">call</span>
                {linkWa ? (
                  <a href={linkWa} target="_blank" rel="noreferrer" className="ipc-link-wa">
                    {pedido.telefono}
                  </a>
                ) : (
                  pedido.telefono
                )}
              </span>
            )}
            {pedido.dni && (
              <span className="ipc-dato">
                <span className="material-symbols-outlined ipc-ico" aria-hidden="true">badge</span>
                DNI {pedido.dni}
              </span>
            )}
            {(pedido.ciudad || pedido.codigo_postal) && (
              <span className="ipc-dato">
                <span className="material-symbols-outlined ipc-ico" aria-hidden="true">location_city</span>
                {[pedido.ciudad, pedido.codigo_postal && `CP ${pedido.codigo_postal}`].filter(Boolean).join(' · ')}
              </span>
            )}
            {esEnvio && destino && (
              <span className="ipc-dato">
                <span className="material-symbols-outlined ipc-ico" aria-hidden="true">location_on</span>
                {destino}
              </span>
            )}
            {pedido.nota && (
              <span className="ipc-dato ipc-dato-nota">
                <span className="material-symbols-outlined ipc-ico" aria-hidden="true">sticky_note_2</span>
                {pedido.nota}
              </span>
            )}
          </div>
        </>
      )}

      <div className="ipc-acciones">
        <button type="button" className="ipc-btn-cancelar" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-vibrante ipc-btn-confirmar"
          onClick={onConfirmar}
          disabled={ocupado}
        >
          {ocupado ? 'Confirmando...' : '✓ Confirmar pedido'}
        </button>
      </div>
    </article>
  );
}
