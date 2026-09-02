import React from 'react';
import { notificar } from '../notificaciones';

// Los pedidos solo se confirman (o se cancelan). No hay flujo de preparación
// (en preparación / listo / entregado): esta tabla muestra fecha, cliente, qué
// pidió, el total y el estado de cobro, más las acciones de cada pedido.

const ETIQUETA_COBRO = { pagado: 'Pagado', parcial: 'Parcial', pendiente: 'Pendiente' };
const ICONO_COBRO = { pagado: 'task_alt', parcial: 'hourglass_bottom', pendiente: 'pending' };

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

const Ico = ({ nombre }) => (
  <span className="material-symbols-outlined" aria-hidden="true">{nombre}</span>
);

// Los productos del pedido se agrupan por categoría para que se lea de qué rubro es
// cada línea (ej: "Hierbas Medicinales por Kg — 46 × Manzanilla").
function ResumenProductos({ items }) {
  const LIMITE = 6;
  const visibles = items.slice(0, LIMITE);
  const resto = items.length - visibles.length;

  const grupos = [];
  for (const it of visibles) {
    const cat = it.categoria_nombre || 'Sin categoría';
    const grupo = grupos.find((g) => g.cat === cat);
    if (grupo) grupo.items.push(it);
    else grupos.push({ cat, items: [it] });
  }

  return (
    <div className="tp-productos">
      {grupos.map((g) => (
        <div key={g.cat} className="tp-prod-grupo">
          <span className="tp-prod-cat">{g.cat}</span>
          {g.items.map((it) => (
            <span key={it.id} className="tp-prod-item">{Number(it.cantidad)} × {it.producto_nombre}</span>
          ))}
        </div>
      ))}
      {resto > 0 && <span className="tp-productos-mas">+{resto} producto{resto > 1 ? 's' : ''} más</span>}
    </div>
  );
}

export default function TablaPedidos({
  pedidos,
  onCobrar,
  onDetalle,
  onEditar,
  onImprimir,
  onEliminar,
  onConfirmar,
  onCancelar,
}) {
  return (
    <div className="tabla-pedidos-scroll">
      <table className="tabla-pedidos">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Fecha / Hora</th>
            <th>Cliente</th>
            <th>Productos</th>
            <th className="num">Total</th>
            <th>Cobro</th>
            <th className="tp-col-acciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => {
            const cancelado = pedido.estado === 'cancelado';
            const sinConfirmar = pedido.confirmado === false;
            return (
              <tr key={pedido.id} className={`${cancelado ? 'tp-fila-cancelada' : ''} ${sinConfirmar ? 'tp-fila-espera' : ''}`}>
                <td data-label="Pedido" className="tp-id">
                  #{pedido.id}
                  {cancelado && <span className="tp-tag tp-tag-cancelado">Cancelado</span>}
                  {sinConfirmar && !cancelado && <span className="tp-tag tp-tag-espera">En espera</span>}
                </td>
                <td data-label="Fecha / Hora">
                  <span>{formatearFechaHora(pedido.creado)}</span>
                  <span className={`tp-entrega tp-entrega-${pedido.tipo_entrega}`}>
                    <Ico nombre={pedido.tipo_entrega === 'envio' ? 'local_shipping' : 'storefront'} />
                    {pedido.tipo_entrega === 'envio' ? 'Envío' : 'Retiro en local'}
                  </span>
                </td>
                <td data-label="Cliente">
                  <span className="tp-cliente">{pedido.cliente || `Pedido #${pedido.id}`}</span>
                  {pedido.telefono && <span className="tp-sub">{pedido.telefono}</span>}
                  {pedido.localidad_nombre && <span className="tp-sub">{pedido.localidad_nombre}</span>}
                </td>
                <td data-label="Productos">
                  <ResumenProductos items={pedido.items} />
                  {pedido.nota && <span className="tp-sub tp-nota">Nota: {pedido.nota}</span>}
                </td>
                <td data-label="Total" className="num tp-total">{formatearPrecio(pedido.total)}</td>
                <td data-label="Cobro">
                  <span className={`badge-cobro cobro-${pedido.estado_cobro}`}>
                    <span className="material-symbols-outlined pedido-ico" aria-hidden="true">{ICONO_COBRO[pedido.estado_cobro]}</span>
                    {ETIQUETA_COBRO[pedido.estado_cobro]}
                  </span>
                </td>
                <td data-label="Acciones">
                  <div className="tp-acciones">
                    {sinConfirmar && !cancelado && onConfirmar && (
                      <button type="button" className="tp-accion tp-accion-confirmar" onClick={() => onConfirmar(pedido)}>
                        <Ico nombre="check_circle" />Confirmar
                      </button>
                    )}
                    <button
                      type="button"
                      className={`tp-accion tp-accion-cobrar ${pedido.estado_cobro !== 'pagado' ? 'tp-accion-cobrar-pendiente' : ''}`}
                      onClick={() => onCobrar(pedido)}
                    >
                      <Ico nombre="payments" />{pedido.estado_cobro === 'pagado' ? 'Cobrado' : 'Cobrar'}
                    </button>
                    {onEditar && !cancelado && (
                      <button type="button" className="tp-accion" onClick={() => onEditar(pedido)}>
                        <Ico nombre="edit" />Editar
                      </button>
                    )}
                    <button type="button" className="tp-accion" onClick={() => onDetalle(pedido)}>
                      <Ico nombre="description" />Detalle
                    </button>
                    <button type="button" className="tp-accion" onClick={() => onImprimir(pedido)}>
                      <Ico nombre="print" />Imprimir
                    </button>
                    <button
                      type="button"
                      className="tp-accion"
                      onClick={() => notificar('La facturación todavía no está disponible — próximamente.')}
                    >
                      <Ico nombre="request_quote" />Facturar
                    </button>
                    {onCancelar && !cancelado && (
                      <button type="button" className="tp-accion tp-accion-peligro" onClick={() => onCancelar(pedido)}>
                        <Ico nombre="block" />Cancelar
                      </button>
                    )}
                    <button type="button" className="tp-accion tp-accion-peligro" onClick={() => onEliminar(pedido)}>
                      <Ico nombre="delete" />Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
