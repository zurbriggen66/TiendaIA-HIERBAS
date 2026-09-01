import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PedidoModal from '../Pedidos/PedidoModal';
import PedidoCard from '../Pedidos/PedidoCard';
import PedidoPagoModal from '../Pedidos/PedidoPagoModal';
import PedidoEnvioDescuentoModal from '../Pedidos/PedidoEnvioDescuentoModal';
import { imprimirPedido } from '../../utils/impresion';
import GraficoVentas from '../Estadisticas/GraficoVentas';
import BarrasDesglose from '../Estadisticas/BarrasDesglose';
import { notificar, confirmar } from '../notificaciones';

const pad2 = (n) => String(n).padStart(2, '0');
// OJO: no usar toISOString() acá — convierte a UTC y en Argentina (UTC-3) eso hace
// que "hoy" salte al día siguiente a partir de las 21:00 hora local.
const isoMasDias = (deltaDias) => {
  const d = new Date();
  d.setDate(d.getDate() + deltaDias);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const hoyISO = () => isoMasDias(0);

// Variación de hoy contra ayer para las tarjetas del resumen. Si ayer fue 0 no se
// puede calcular un %, así que solo marca "nuevo" cuando hoy hay algo.
const compararConAyer = (valorHoy, valorAyer) => {
  const ayer = Number(valorAyer) || 0;
  const hoy = Number(valorHoy) || 0;
  if (ayer === 0) return hoy > 0 ? { signo: 'sube', texto: 'nuevo' } : null;
  const pct = Math.round(((hoy - ayer) / ayer) * 100);
  if (pct === 0) return { signo: 'igual', texto: 'igual que ayer' };
  return { signo: pct > 0 ? 'sube' : 'baja', texto: `${pct > 0 ? '+' : ''}${pct}% vs ayer` };
};

const formatearPrecio = (valor) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(valor);

const formatearHora = (fecha) =>
  new Date(fecha).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const ORDEN_ESTADOS = ['pendiente', 'en_preparacion', 'listo', 'entregado'];

const ICONO_DELTA = { sube: 'trending_up', baja: 'trending_down', igual: 'trending_flat' };

function DeltaResumen({ dato }) {
  if (!dato) return null;
  return (
    <span className={`resumen-delta resumen-delta-${dato.signo}`}>
      <span className="material-symbols-outlined" aria-hidden="true">{ICONO_DELTA[dato.signo]}</span>
      {dato.texto}
    </span>
  );
}

export default function Inicio() {
  const [reloj, setReloj] = useState(new Date());
  const [pedidosRecientes, setPedidosRecientes] = useState([]);
  const [porConfirmar, setPorConfirmar] = useState([]);
  const [confirmando, setConfirmando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [gastosFijos, setGastosFijos] = useState([]);
  const [totalGastosFijos, setTotalGastosFijos] = useState(0);

  const [estadisticasHoy, setEstadisticasHoy] = useState(null);
  const [estadisticasAyer, setEstadisticasAyer] = useState(null);
  const [ventasUltimos7, setVentasUltimos7] = useState([]);
  const [ventasPorCategoria, setVentasPorCategoria] = useState([]);

  const [configId, setConfigId] = useState(null);
  const [tiendaAbierta, setTiendaAbierta] = useState(true);
  const [mensajeCerrado, setMensajeCerrado] = useState('');
  const [guardandoEstadoTienda, setGuardandoEstadoTienda] = useState(false);

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [mostrarNuevoPedido, setMostrarNuevoPedido] = useState(false);
  const [modalPago, setModalPago] = useState(null);
  const [modalEnvio, setModalEnvio] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setReloj(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const cargarInicio = async () => {
    setCargando(true);
    try {
      const hoy = hoyISO();
      const ayer = isoMasDias(-1);
      const hace7 = isoMasDias(-6);
      const [resPorConfirmar, resRecientes, resProductos, resCategorias, resLocalidades, resFijos, resConfig, resHoy, resAyer, resSemana] = await Promise.all([
        // page_size alto: ambas listas se muestran enteras, no queremos que un día
        // movido las recorte a los 20 por defecto de la paginación.
        api.get('/pedidos/', { params: { confirmado: 'false', origen: 'web', page_size: 100 } }),
        api.get('/pedidos/', { params: { ultimas_horas: 24, confirmado: 'true', page_size: 100 } }),
        api.get('/productos/'),
        api.get('/categorias/'),
        api.get('/localidades/'),
        api.get('/gastos-fijos/alertas/'),
        api.get('/configuracion/'),
        api.get('/estadisticas/', { params: { desde: hoy, hasta: hoy } }),
        api.get('/estadisticas/', { params: { desde: ayer, hasta: ayer } }),
        api.get('/estadisticas/', { params: { desde: hace7, hasta: hoy } }),
      ]);
      setEstadisticasHoy(resHoy.data);
      setEstadisticasAyer(resAyer.data);
      setVentasUltimos7((resSemana.data.ventas_por_dia || []).slice(-7));
      setVentasPorCategoria(resSemana.data.ventas_por_categoria || []);
      if (resConfig.data && resConfig.data.length > 0) {
        const ultimaConfig = resConfig.data[resConfig.data.length - 1];
        setConfigId(ultimaConfig.id);
        setTiendaAbierta(ultimaConfig.tienda_abierta ?? true);
        setMensajeCerrado(ultimaConfig.mensaje_cerrado || '');
      }
      setPorConfirmar((resPorConfirmar.data.results || []).filter((p) => p.estado !== 'cancelado'));
      setPedidosRecientes(resRecientes.data.results || []);
      setProductos(resProductos.data);
      setCategorias(resCategorias.data);
      setLocalidades(resLocalidades.data);
      setGastosFijos(resFijos.data.gastos || []);
      setTotalGastosFijos(Number(resFijos.data.total_pendiente) || 0);
      setError(null);
    } catch (err) {
      console.error('Error cargando datos de Inicio:', err);
      setError('No se pudieron cargar los datos de hoy.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInicio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmarPedido = async (pedido) => {
    setConfirmando(pedido.id);
    try {
      await api.post(`/pedidos/${pedido.id}/confirmar/`);
      await cargarInicio();
    } catch (err) {
      console.error('Error al confirmar el pedido:', err);
      notificar('No se pudo confirmar el pedido.');
    } finally {
      setConfirmando(null);
    }
  };

  const cancelarPedido = async (pedido) => {
    if (!(await confirmar(`¿Cancelar el pedido de ${pedido.cliente || 'este cliente'}? Esto asume que nunca llegó por WhatsApp.`))) return;
    setConfirmando(pedido.id);
    try {
      await api.patch(`/pedidos/${pedido.id}/`, { estado: 'cancelado' });
      await cargarInicio();
    } catch (err) {
      console.error('Error al cancelar el pedido:', err);
      notificar('No se pudo cancelar el pedido.');
    } finally {
      setConfirmando(null);
    }
  };

  const cambiarEstadoTienda = async (abierta) => {
    const anterior = tiendaAbierta;
    setTiendaAbierta(abierta); // optimista: la UI responde al toque, no espera al servidor
    setGuardandoEstadoTienda(true);
    try {
      if (configId) {
        await api.patch(`/configuracion/${configId}/`, { tienda_abierta: abierta });
      } else {
        const { data } = await api.post('/configuracion/', { tienda_abierta: abierta });
        setConfigId(data.id);
      }
    } catch (err) {
      console.error('Error al cambiar el estado de la tienda:', err);
      setTiendaAbierta(anterior);
      notificar('No se pudo guardar el cambio. Probá de nuevo.');
    } finally {
      setGuardandoEstadoTienda(false);
    }
  };

  const guardarMensajeCerrado = async () => {
    if (!configId) return;
    try {
      await api.patch(`/configuracion/${configId}/`, { mensaje_cerrado: mensajeCerrado });
    } catch (err) {
      console.error('Error al guardar el mensaje de cierre:', err);
    }
  };

  const avanzarEstadoReciente = async (pedido) => {
    const siguiente = ORDEN_ESTADOS[ORDEN_ESTADOS.indexOf(pedido.estado) + 1];
    if (!siguiente) return;
    try {
      const { data } = await api.patch(`/pedidos/${pedido.id}/`, { estado: siguiente });
      setPedidosRecientes((prev) => prev.map((p) => (p.id === pedido.id ? data : p)));
    } catch (err) {
      console.error('Error al cambiar el estado del pedido:', err);
      notificar('No se pudo cambiar el estado del pedido.');
    }
  };

  const cancelarPedidoReciente = async (pedido) => {
    if (!(await confirmar('¿Cancelar este pedido?'))) return;
    try {
      const { data } = await api.patch(`/pedidos/${pedido.id}/`, { estado: 'cancelado' });
      setPedidosRecientes((prev) => prev.map((p) => (p.id === pedido.id ? data : p)));
    } catch (err) {
      console.error('Error al cancelar el pedido:', err);
      notificar('No se pudo cancelar el pedido.');
    }
  };

  const eliminarPedidoReciente = async (pedido) => {
    if (!(await confirmar(`¿Eliminar definitivamente el pedido de "${pedido.cliente || `Pedido #${pedido.id}`}"? Esta acción no se puede deshacer.`))) return;
    try {
      await api.delete(`/pedidos/${pedido.id}/`);
      setPedidosRecientes((prev) => prev.filter((p) => p.id !== pedido.id));
    } catch (err) {
      console.error('Error al eliminar el pedido:', err);
      notificar('No se pudo eliminar el pedido.');
    }
  };

  const porVencer = gastosFijos.filter((g) => g.esta_por_vencer);
  const hayVencidos = gastosFijos.some((g) => g.dias_restantes < 0);

  const horas = String(reloj.getHours()).padStart(2, '0');
  const minutos = String(reloj.getMinutes()).padStart(2, '0');
  const segundos = String(reloj.getSeconds()).padStart(2, '0');
  const fechaLegible = reloj.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <header className="main-header">
        <h2>Inicio</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className={`inicio-tienda-toggle ${tiendaAbierta ? 'inicio-tienda-toggle-abierta' : 'inicio-tienda-toggle-cerrada'}`}>
          <div className="inicio-tienda-toggle-info">
            <span className="inicio-tienda-toggle-punto" aria-hidden="true" />
            <div>
              <strong>{tiendaAbierta ? 'Tienda abierta' : 'Tienda cerrada'}</strong>
              <p>
                {tiendaAbierta
                  ? 'Tus clientes pueden pedir desde la web ahora mismo.'
                  : 'La web no va a dejar entrar pedidos nuevos hasta que la vuelvas a abrir.'}
              </p>
            </div>
          </div>
          <label className="inicio-switch" aria-label={tiendaAbierta ? 'Cerrar la tienda' : 'Abrir la tienda'}>
            <input
              type="checkbox"
              checked={tiendaAbierta}
              disabled={guardandoEstadoTienda}
              onChange={(e) => cambiarEstadoTienda(e.target.checked)}
            />
            <span className="inicio-switch-riel">
              <span className="inicio-switch-perilla" />
            </span>
          </label>
        </div>

        {!tiendaAbierta && (
          <div className="inicio-tienda-mensaje">
            <label htmlFor="mensaje-cerrado">Mensaje para tus clientes mientras está cerrada</label>
            <input
              id="mensaje-cerrado"
              type="text"
              className="input-vibrante"
              value={mensajeCerrado}
              onChange={(e) => setMensajeCerrado(e.target.value)}
              onBlur={guardarMensajeCerrado}
              placeholder="Volvemos mañana a las 11hs"
              maxLength={200}
            />
          </div>
        )}

        <div className="inicio-resumen-grid">
          {/* Tarjeta: Reloj en vivo, o Pedidos por confirmar cuando hay alguno esperando */}
          {!cargando && !error && porConfirmar.length > 0 ? (
            <div className="inicio-card inicio-card-confirmar">
              <div className="inicio-card-encabezado">
                <span className="material-symbols-outlined inicio-card-icono">move_to_inbox</span>
                <h3 className="inicio-card-titulo">Pedidos por confirmar</h3>
                <span className="inicio-contador-pedidos inicio-contador-confirmar">{porConfirmar.length}</span>
              </div>
              <p className="inicio-card-subtexto inicio-confirmar-aviso">
                Llegaron desde la tienda web. Confirmalos cuando el cliente te haya mandado el WhatsApp — recién ahí se suman a la caja.
              </p>

              <div className="inicio-pedidos-lista inicio-confirmar-lista">
                {porConfirmar.map((pedido) => (
                  <div key={pedido.id} className="inicio-pedido-confirmar-item">
                    <div className="inicio-pedido-info">
                      <div className="inicio-pedido-info-top">
                        <h4>{pedido.cliente || `Pedido #${pedido.id}`}</h4>
                      </div>
                      <div className="inicio-pedido-info-bottom">
                        <span><span className="material-symbols-outlined inicio-inline-ico" aria-hidden="true">schedule</span>{formatearHora(pedido.creado)}</span>
                        <span>
                          <span className="material-symbols-outlined inicio-inline-ico" aria-hidden="true">
                            {pedido.tipo_entrega === 'envio' ? 'local_shipping' : 'storefront'}
                          </span>
                          {pedido.tipo_entrega === 'envio' ? 'Envío' : 'Retiro'}
                        </span>
                        <span>{formatearPrecio(pedido.total)}</span>
                      </div>
                    </div>
                    <div className="inicio-pedido-confirmar-acciones">
                      <button
                        type="button"
                        className="inicio-btn-cancelar"
                        onClick={() => cancelarPedido(pedido)}
                        disabled={confirmando === pedido.id}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn-vibrante inicio-btn-confirmar"
                        onClick={() => confirmarPedido(pedido)}
                        disabled={confirmando === pedido.id}
                      >
                        {confirmando === pedido.id ? 'Confirmando...' : '✓ Confirmar pedido'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="inicio-card inicio-card-reloj">
              <div className="inicio-card-encabezado">
                <span className="material-symbols-outlined inicio-card-icono">schedule</span>
                <h3 className="inicio-card-titulo">Reloj en vivo</h3>
              </div>
              <div className="inicio-reloj-numeros">
                <span>{horas}</span>
                <span className="inicio-reloj-separador">:</span>
                <span>{minutos}</span>
                <span className="inicio-reloj-separador">:</span>
                <span className="inicio-reloj-segundos">{segundos}</span>
              </div>
              <p className="inicio-card-subtexto inicio-fecha-capitalizada">{fechaLegible}</p>
            </div>
          )}

          {/* Tarjeta: Gastos fijos por pagar — solo si hay alguno cargado */}
          {!cargando && !error && gastosFijos.length > 0 && (
            <div className={`inicio-card inicio-card-gastos-fijos ${hayVencidos ? 'inicio-card-alerta' : ''}`}>
              <div className="inicio-card-encabezado">
                <span className="material-symbols-outlined inicio-card-icono">event</span>
                <h3 className="inicio-card-titulo">Gastos fijos por pagar</h3>
                {porVencer.length > 0 && (
                  <span className="inicio-contador-pedidos inicio-contador-alerta">{porVencer.length}</span>
                )}
              </div>

              <p className="inicio-monto-grande">{formatearPrecio(totalGastosFijos)}</p>

              <div className="inicio-gastos-fijos-lista">
                {gastosFijos.slice(0, 4).map((fijo) => (
                  <div key={fijo.id} className="inicio-gasto-fijo-item">
                    <div className="inicio-gasto-fijo-info">
                      <strong>{fijo.nombre}</strong>
                      <span className={fijo.esta_por_vencer ? 'inicio-gasto-fijo-alerta' : ''}>
                        {fijo.dias_restantes < 0
                          ? `¡Vencido hace ${Math.abs(fijo.dias_restantes)} ${Math.abs(fijo.dias_restantes) === 1 ? 'día' : 'días'}!`
                          : fijo.dias_restantes === 0
                            ? '¡Vence hoy!'
                            : fijo.dias_restantes === 1
                              ? 'Vence mañana'
                              : `Faltan ${fijo.dias_restantes} días`}
                      </span>
                    </div>
                    <span className="inicio-gasto-fijo-monto">{formatearPrecio(fijo.monto)}</span>
                  </div>
                ))}
              </div>

              <p className="inicio-card-subtexto">
                <Link to="/admin/gastos" className="inicio-link-caja">gestionar gastos fijos →</Link>
              </p>
            </div>
          )}
        </div>

        <button type="button" className="btn-vibrante inicio-btn-nuevo-pedido-top" onClick={() => setMostrarNuevoPedido(true)}>
          <span className="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>
          Nuevo pedido
        </button>

        {!cargando && !error && estadisticasHoy && (
          <>
            <div className="resumen-grid">
              <div className="resumen-tile resumen-tile-servicios">
                <span>Ventas de hoy</span>
                <strong>{formatearPrecio(estadisticasHoy.ventas_totales)}</strong>
                {estadisticasAyer && <DeltaResumen dato={compararConAyer(estadisticasHoy.ventas_totales, estadisticasAyer.ventas_totales)} />}
              </div>
              <div className="resumen-tile resumen-tile-total">
                <span>Pedidos de hoy</span>
                <strong>{estadisticasHoy.total_pedidos}</strong>
                {estadisticasAyer && <DeltaResumen dato={compararConAyer(estadisticasHoy.total_pedidos, estadisticasAyer.total_pedidos)} />}
              </div>
              <div className="resumen-tile resumen-tile-insumos">
                <span>Ticket promedio</span>
                <strong>{formatearPrecio(estadisticasHoy.ticket_promedio)}</strong>
              </div>
              <div className="resumen-tile resumen-tile-otros">
                <span>Gastos de hoy</span>
                <strong>{formatearPrecio(estadisticasHoy.gastos_totales)}</strong>
              </div>
              <div className={`resumen-tile ${estadisticasHoy.ganancia_neta >= 0 ? 'resumen-tile-ganancia-positiva' : 'resumen-tile-ganancia-negativa'}`}>
                <span>Balance del día</span>
                <strong>{formatearPrecio(estadisticasHoy.ganancia_neta)}</strong>
              </div>
            </div>

            <div className="seccion-header">
              <h3>Ventas de los últimos 7 días</h3>
              <Link to="/admin/estadisticas" className="inicio-link-caja">ver todas las estadísticas →</Link>
            </div>
            <GraficoVentas datos={ventasUltimos7} />

            <div className="seccion-header">
              <h3>Ventas por categoría (últimos 7 días)</h3>
            </div>
            {ventasPorCategoria.length === 0 ? (
              <p className="estado-vacio-chico">Todavía no hay ventas en los últimos 7 días.</p>
            ) : (
              <BarrasDesglose
                filas={ventasPorCategoria.map((c) => ({
                  clave: c.categoria_id,
                  etiqueta: c.categoria_nombre,
                  total: c.total,
                }))}
                total={ventasPorCategoria.reduce((suma, c) => suma + Number(c.total), 0)}
              />
            )}

            <div className="gastos-desglose-grid">
              <div>
                <h4 className="gastos-desglose-titulo">Cómo cobraste hoy</h4>
                {(estadisticasHoy.ventas_por_metodo || []).length === 0 ? (
                  <p className="estado-vacio-chico">Todavía no hay ventas cobradas hoy.</p>
                ) : (
                  <BarrasDesglose
                    filas={estadisticasHoy.ventas_por_metodo.map((f) => ({
                      clave: f.metodo,
                      etiqueta: f.metodo_label,
                      total: f.total,
                    }))}
                    total={Number(estadisticasHoy.ventas_totales)}
                  />
                )}
              </div>
              <div>
                <h4 className="gastos-desglose-titulo">Lo más vendido hoy</h4>
                {estadisticasHoy.productos_mas_vendidos.length === 0 ? (
                  <p className="estado-vacio-chico">Todavía no hay ventas hoy.</p>
                ) : (
                  <div className="ranking-productos">
                    {estadisticasHoy.productos_mas_vendidos.slice(0, 5).map((p, i, top5) => {
                      const maxCantidad = top5[0].cantidad_total;
                      const porcentaje = Math.max((p.cantidad_total / maxCantidad) * 100, 6);
                      return (
                        <div key={p.producto_id} className="ranking-fila">
                          <span className="ranking-puesto">#{i + 1}</span>
                          <div className="ranking-info">
                            <div className="ranking-nombre-linea">
                              <strong>{p.producto_nombre}</strong>
                              <span>{p.cantidad_total} vendidos · {formatearPrecio(p.total)}</span>
                            </div>
                            <div className="ranking-barra-fondo">
                              <div className="ranking-barra" style={{ '--bar-width': `${porcentaje}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="inicio-card inicio-card-pedidos">
          <div className="inicio-card-encabezado">
            <span className="material-symbols-outlined inicio-card-icono">receipt_long</span>
            <h3 className="inicio-card-titulo">Pedidos de las últimas 24 horas</h3>
            {!cargando && !error && pedidosRecientes.length > 0 && (
              <span className="inicio-contador-pedidos">{pedidosRecientes.length}</span>
            )}
          </div>

          {cargando ? (
            <p className="estado-vacio">Cargando...</p>
          ) : error ? (
            <p className="estado-vacio">{error}</p>
          ) : pedidosRecientes.length === 0 ? (
            <div className="estado-vacio">
              <p>Todavía no entró ningún pedido en las últimas 24 horas.</p>
            </div>
          ) : (
            <div className="pedidos-grid inicio-pedidos-grid">
              {pedidosRecientes.map((pedido) => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  onCobrar={(p) => setModalPago(p.id)}
                  onDetalle={setModalEnvio}
                  onImprimir={imprimirPedido}
                  onEliminar={eliminarPedidoReciente}
                  onAvanzarEstado={avanzarEstadoReciente}
                  onCancelar={cancelarPedidoReciente}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {mostrarNuevoPedido && (
        <PedidoModal
          productos={productos}
          categorias={categorias}
          localidades={localidades}
          onClose={() => setMostrarNuevoPedido(false)}
          onSaved={() => { setMostrarNuevoPedido(false); cargarInicio(); }}
        />
      )}

      {modalPago && (
        <PedidoPagoModal
          pedidoId={modalPago}
          onClose={() => setModalPago(null)}
          onSaved={cargarInicio}
        />
      )}

      {modalEnvio && (
        <PedidoEnvioDescuentoModal
          pedido={modalEnvio}
          localidades={localidades}
          onClose={() => setModalEnvio(null)}
          onSaved={() => { setModalEnvio(null); cargarInicio(); }}
        />
      )}

      <style>
        {`
          .inicio-tienda-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            background: var(--surface, #324a3a);
            border: 1px solid var(--border, #4c6b54);
            border-radius: 16px;
            padding: 18px 22px;
            margin-bottom: 16px;
            transition: border-color 0.2s ease;
          }

          .inicio-tienda-toggle-info {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .inicio-tienda-toggle-punto {
            flex-shrink: 0;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4ade80;
            box-shadow: 0 0 10px rgba(74, 222, 128, 0.7);
          }

          .inicio-tienda-toggle-cerrada .inicio-tienda-toggle-punto {
            background: #f87171;
            box-shadow: 0 0 10px rgba(248, 113, 113, 0.7);
          }

          .inicio-tienda-toggle-cerrada {
            border-color: rgba(248, 113, 113, 0.4);
          }

          .inicio-tienda-toggle-info strong {
            font-size: 1rem;
          }

          .inicio-tienda-toggle-info p {
            margin: 2px 0 0;
            font-size: 0.82rem;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-switch {
            flex-shrink: 0;
            position: relative;
            display: inline-block;
            width: 50px;
            height: 28px;
            cursor: pointer;
          }

          .inicio-switch input {
            position: absolute;
            opacity: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            cursor: pointer;
          }

          .inicio-switch-riel {
            position: absolute;
            inset: 0;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.15);
            transition: background 0.2s ease;
          }

          .inicio-switch input:checked + .inicio-switch-riel {
            background: linear-gradient(135deg, #aac398, #8caa78);
          }

          .inicio-switch-perilla {
            position: absolute;
            top: 3px;
            left: 3px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #fff;
            transition: transform 0.2s ease;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }

          .inicio-switch input:checked + .inicio-switch-riel .inicio-switch-perilla {
            transform: translateX(22px);
          }

          .inicio-switch input:disabled + .inicio-switch-riel {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .inicio-tienda-mensaje {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 20px;
          }

          .inicio-tienda-mensaje label {
            font-size: 0.82rem;
            font-weight: 600;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-resumen-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }

          .inicio-card {
            position: relative;
            background: linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 60%),
                        var(--card-bg, #324a3a);
            border: 1px solid rgba(140, 170, 120, 0.15);
            border-radius: 16px;
            padding: 24px 26px;
            overflow: hidden;
            transition: border-color 0.25s ease, transform 0.25s ease;
          }

          .inicio-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, rgba(255,158,0,0.9), rgba(255,158,0,0.1));
          }

          .inicio-card:hover {
            border-color: rgba(140, 170, 120, 0.35);
          }

          .inicio-card-encabezado {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 4px;
          }

          .inicio-card-icono {
            font-size: 1.4rem;
            color: #aac398;
            filter: drop-shadow(0 0 6px rgba(140, 170, 120, 0.35));
          }

          .inicio-inline-ico {
            font-size: 0.95rem;
            margin-right: 4px;
            position: relative;
            top: 2px;
            color: rgba(255, 255, 255, 0.4);
          }

          .inicio-btn-nuevo-pedido-top {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .inicio-btn-nuevo-pedido-top .material-symbols-outlined {
            font-size: 1.15rem;
          }

          /* Chip de variación vs. ayer en las tarjetas del resumen del día. */
          .resumen-delta {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            align-self: flex-start;
            margin-top: 2px;
            padding: 2px 8px 2px 5px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 700;
            background: rgba(0, 0, 0, 0.18);
          }

          .resumen-delta .material-symbols-outlined {
            font-size: 0.95rem;
          }

          .resumen-delta-sube { color: #dcfce7; }
          .resumen-delta-baja { color: #fee2e2; }
          .resumen-delta-igual { color: rgba(255, 255, 255, 0.75); }

          .inicio-card-titulo {
            margin: 0;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.65);
          }

          .inicio-card-subtexto {
            color: var(--text-muted, rgba(255,255,255,0.5));
            margin-top: 10px;
            font-size: 0.85rem;
          }

          .inicio-fecha-capitalizada {
            text-transform: capitalize;
          }

          .inicio-reloj-numeros {
            font-family: 'Courier New', ui-monospace, monospace;
            font-size: 1.9rem;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            letter-spacing: 1px;
            margin: 12px 0 0;
            color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: baseline;
          }

          .inicio-reloj-separador {
            color: rgba(255, 255, 255, 0.35);
            margin: 0 1px;
          }

          .inicio-reloj-segundos {
            font-size: 1.9rem;
            color: rgba(255, 255, 255, 0.9);
          }

          .inicio-monto-grande {
            font-size: 2.4rem;
            font-weight: 800;
            margin: 12px 0 0;
            background: linear-gradient(90deg, #aac398, #8caa78);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .inicio-sin-caja {
            font-size: 1.5rem;
            font-weight: 800;
            margin: 12px 0 0;
            color: rgba(255, 255, 255, 0.55);
          }

          .inicio-btn-caja {
            margin-top: 16px;
            font-size: 0.85rem;
            padding: 10px 18px;
          }

          .inicio-caja-acciones {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-top: 16px;
          }

          .inicio-btn-cerrar-caja {
            background: none;
            border: none;
            color: var(--text-muted, rgba(255,255,255,0.5));
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            padding: 6px 4px;
          }
          .inicio-btn-cerrar-caja:hover {
            color: #f87171;
          }

          .inicio-link-caja {
            color: #8caa78;
            text-decoration: none;
            font-weight: 600;
          }
          .inicio-link-caja:hover {
            text-decoration: underline;
          }

          .inicio-punteo-cargando::after {
            content: '...';
            animation: inicioPunteo 1.2s steps(4, end) infinite;
          }

          .inicio-caja-stats {
            display: flex;
            gap: 24px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .inicio-caja-stats div {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .inicio-caja-stats span {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-caja-stats strong {
            font-size: 1.05rem;
            color: rgba(255, 255, 255, 0.9);
          }

          .inicio-card-confirmar {
            border-color: rgba(251, 191, 36, 0.35);
          }

          .inicio-contador-confirmar {
            background: rgba(251, 191, 36, 0.18);
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.4);
          }

          .inicio-confirmar-aviso {
            margin-top: 4px;
            margin-bottom: 18px;
          }

          .inicio-pedido-confirmar-item {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 14px 18px;
          }

          .inicio-pedido-confirmar-acciones {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .inicio-btn-cancelar {
            background: none;
            border: none;
            color: var(--text-muted, rgba(255,255,255,0.5));
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            padding: 6px 8px;
          }
          .inicio-btn-cancelar:hover {
            color: #f87171;
          }

          .inicio-btn-confirmar {
            font-size: 0.85rem;
            padding: 9px 16px;
          }

          @keyframes inicioPunteo {
            0% { content: ''; }
            25% { content: '.'; }
            50% { content: '..'; }
            75% { content: '...'; }
            100% { content: ''; }
          }

          .inicio-card-pedidos .inicio-card-encabezado {
            margin-bottom: 18px;
          }

          .inicio-btn-nuevo-pedido {
            margin-left: auto;
            font-size: 0.8rem;
            padding: 8px 16px;
          }

          .inicio-btn-nuevo-pedido-top {
            width: 100%;
            padding: 14px;
            font-size: 0.9rem;
            margin-bottom: 20px;
          }

          .inicio-contador-pedidos {
            margin-left: auto;
            background: rgba(140, 170, 120, 0.15);
            color: #8caa78;
            border: 1px solid rgba(140, 170, 120, 0.35);
            border-radius: 20px;
            padding: 2px 12px;
            font-size: 0.8rem;
            font-weight: 700;
          }

          .inicio-pedidos-lista {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .inicio-pedido-info {
            flex: 1;
            min-width: 0;
          }

          .inicio-pedido-info-top {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .inicio-pedido-info-top h4 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .inicio-pedido-info-bottom {
            display: flex;
            gap: 14px;
            margin-top: 4px;
            font-size: 0.8rem;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-pedidos-grid {
            margin-top: 4px;
          }

          .inicio-confirmar-lista {
            max-height: 420px;
            overflow-y: auto;
            padding-right: 4px;
          }

          .inicio-card-alerta {
            border-color: rgba(239, 68, 68, 0.4);
          }
          .inicio-card-alerta::before {
            background: linear-gradient(180deg, rgba(239,68,68,0.9), rgba(239,68,68,0.1));
          }

          .inicio-contador-alerta {
            background: rgba(239, 68, 68, 0.18);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.4);
          }

          .inicio-falta-juntar {
            color: #fbbf24;
          }
          .inicio-falta-juntar strong {
            color: #fbbf24;
          }

          .inicio-cubierto {
            color: #4ade80;
          }

          .inicio-gastos-fijos-lista {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .inicio-gasto-fijo-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .inicio-gasto-fijo-info {
            display: flex;
            flex-direction: column;
            gap: 1px;
            min-width: 0;
          }

          .inicio-gasto-fijo-info strong {
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .inicio-gasto-fijo-info span {
            font-size: 0.76rem;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-gasto-fijo-alerta {
            color: #f87171 !important;
            font-weight: 700;
          }

          .inicio-gasto-fijo-monto {
            font-size: 0.9rem;
            font-weight: 700;
            white-space: nowrap;
          }
        `}
      </style>
    </>
  );
}