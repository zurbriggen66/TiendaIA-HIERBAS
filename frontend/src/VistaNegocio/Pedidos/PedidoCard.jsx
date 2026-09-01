import React from 'react';

const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ETIQUETA_COBRO = {
  pagado: 'Pagado',
  parcial: 'Parcial',
  pendiente: 'Pendiente',
};

const ICONO_COBRO = {
  pagado: 'task_alt',
  parcial: 'hourglass_bottom',
  pendiente: 'pending',
};

const Ico = ({ nombre }) => (
  <span className="material-symbols-outlined pedido-ico" aria-hidden="true">{nombre}</span>
);

const ETIQUETA_SIGUIENTE = {
  pendiente: 'Marcar en preparación',
  en_preparacion: 'Marcar listo',
  listo: 'Marcar entregado',
};

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export default function PedidoCard({ pedido, onCobrar, onDetalle, onImprimir, onEliminar, onAvanzarEstado, onCancelar }) {
  return (
    <div className="pedido-card">
      <div className="pedido-card-header">
        <div>
          <h4>{pedido.cliente || `Pedido #${pedido.id}`}</h4>
          <span className="pedido-fecha-creacion"><Ico nombre="schedule" /> {formatearFechaHora(pedido.creado)}</span>
        </div>
        <div className="pedido-card-header-derecha">
          <span className={`badge-estado estado-${pedido.estado}`}>{ETIQUETA_ESTADO[pedido.estado]}</span>
          <span className={`badge-cobro cobro-${pedido.estado_cobro}`}>
            <Ico nombre={ICONO_COBRO[pedido.estado_cobro]} />{ETIQUETA_COBRO[pedido.estado_cobro]}
          </span>
        </div>
      </div>

      <div className="pedido-acciones-toolbar">
        <button
          type="button"
          className={`pedido-accion pedido-accion-cobrar ${pedido.estado_cobro !== 'pagado' ? 'pedido-accion-cobrar-pendiente' : ''}`}
          title={pedido.estado_cobro === 'pagado' ? 'Ver o corregir el cobro' : 'Cobrar pedido'}
          onClick={() => onCobrar(pedido)}
        >
          <Ico nombre="payments" />
          {pedido.estado_cobro === 'pagado' ? 'Cobrado' : 'Cobrar'}
        </button>
        <button type="button" className="pedido-accion pedido-accion-detalle" title="Ver detalles del pedido" onClick={() => onDetalle(pedido)}>
          <Ico nombre="description" />Detalle
        </button>
        <button type="button" className="pedido-accion pedido-accion-imprimir" title="Imprimir ticket" onClick={() => onImprimir(pedido)}>
          <Ico nombre="print" />Imprimir
        </button>
        <button type="button" className="pedido-accion pedido-accion-eliminar" title="Eliminar pedido" onClick={() => onEliminar(pedido)}>
          <Ico nombre="delete" />Eliminar
        </button>
      </div>

      <div className="pedido-entrega-info">
        <span className={`badge-entrega badge-entrega-${pedido.tipo_entrega}`}>
          <Ico nombre={pedido.tipo_entrega === 'envio' ? 'local_shipping' : 'storefront'} />
          {pedido.tipo_entrega === 'envio' ? 'Envío' : 'Retiro en local'}
        </span>
        {pedido.telefono && <span className="pedido-entrega-dato"><Ico nombre="call" /> {pedido.telefono}</span>}
        {pedido.tipo_entrega === 'envio' && pedido.direccion && (
          <span className="pedido-entrega-dato"><Ico nombre="location_on" /> {pedido.direccion}</span>
        )}
        {pedido.localidad_nombre && (
          <span className="pedido-entrega-dato"><Ico nombre="map" /> {pedido.localidad_nombre}</span>
        )}
      </div>

      {pedido.nota && (
        <p className="pedido-nota"><Ico nombre="sticky_note_2" /> {pedido.nota}</p>
      )}

      <ul className="pedido-items-lista">
        {pedido.items.map((item) => (
          <li key={item.id}>
            <div className="pedido-item-info">
              <span>{item.cantidad} × {item.producto_nombre}</span>
            </div>
            <span>{formatearPrecio(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="pedido-card-footer">
        {(Number(pedido.costo_envio) > 0 || Number(pedido.descuento_pct) > 0) && (
          <div className="pedido-desglose">
            <div><span>Subtotal</span><span>{formatearPrecio(pedido.subtotal)}</span></div>
            {Number(pedido.costo_envio) > 0 && (
              <div><span>Envío</span><span>{formatearPrecio(pedido.costo_envio)}</span></div>
            )}
            {Number(pedido.descuento_pct) > 0 && (
              <div><span>Descuento</span><span>-{pedido.descuento_pct}%</span></div>
            )}
          </div>
        )}
        <span className="pedido-total">{formatearPrecio(pedido.total)}</span>
        <div className="pedido-acciones-estado">
          {ETIQUETA_SIGUIENTE[pedido.estado] && (
            <button type="button" className="btn-vibrante btn-siguiente-estado" onClick={() => onAvanzarEstado(pedido)}>
              {ETIQUETA_SIGUIENTE[pedido.estado]}
            </button>
          )}
          {pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && (
            <button type="button" className="btn-cancelar-pedido" onClick={() => onCancelar(pedido)}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
