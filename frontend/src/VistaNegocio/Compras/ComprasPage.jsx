import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import CompraModal from './CompraModal';
import { notificar, confirmar } from '../notificaciones';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearFecha = (iso) => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

const ETIQUETA_ESTADO = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado' };

export default function ComprasPage() {
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);

  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resCompras, resProveedores] = await Promise.all([
        api.get('/compras/'),
        api.get('/proveedores/'),
      ]);
      setCompras(resCompras.data);
      setProveedores(resProveedores.data);
    } catch (error) {
      console.error('Error al cargar compras:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const eliminar = async (compra) => {
    if (!(await confirmar(`¿Eliminar la compra a "${compra.proveedor_nombre || 'sin proveedor'}" del ${formatearFecha(compra.fecha)}?`))) return;
    try {
      await api.delete(`/compras/${compra.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar la compra:', error);
      notificar('No se pudo eliminar la compra.');
    }
  };

  const mesActual = new Date().toISOString().slice(0, 7);
  const totalCompras = useMemo(() => compras.reduce((acc, c) => acc + Number(c.total), 0), [compras]);
  const comprasDelMes = useMemo(
    () => compras.filter((c) => c.fecha.startsWith(mesActual)).reduce((acc, c) => acc + Number(c.total), 0),
    [compras, mesActual],
  );
  const deudaPendiente = useMemo(() => compras.reduce((acc, c) => acc + Number(c.saldo), 0), [compras]);

  const comprasFiltradas = compras.filter((c) => {
    if (proveedorFiltro && String(c.proveedor) !== proveedorFiltro) return false;
    if (desde && c.fecha < desde) return false;
    if (hasta && c.fecha > hasta) return false;
    return true;
  });

  return (
    <div className="productos-page">
      <header className="main-header">
        <h2>Compras a Proveedores</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="seccion-header">
          <h3>Filtros</h3>
          <button type="button" className="btn-vibrante" onClick={() => setModal({ compra: null })}>
            + Registrar compra
          </button>
        </div>

        <div className="form-row" style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label className="form-label">Proveedor</label>
            <select className="input-vibrante" value={proveedorFiltro} onChange={(e) => setProveedorFiltro(e.target.value)}>
              <option value="">Todos los proveedores</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Desde</label>
            <input type="date" className="input-vibrante" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Hasta</label>
            <input type="date" className="input-vibrante" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>

        {!cargando && (
          <div className="resumen-grid">
            <div className="resumen-tile resumen-tile-total">
              <span>Total compras</span>
              <strong>{formatearPrecio(totalCompras)}</strong>
            </div>
            <div className="resumen-tile resumen-tile-servicios">
              <span>Compras del mes</span>
              <strong>{formatearPrecio(comprasDelMes)}</strong>
            </div>
            <div className={`resumen-tile ${deudaPendiente > 0 ? 'resumen-tile-otros' : 'resumen-tile-servicios'}`}>
              <span>Deuda pendiente</span>
              <strong>{formatearPrecio(deudaPendiente)}</strong>
            </div>
          </div>
        )}

        <div className="seccion-header">
          <h3>Historial de compras</h3>
        </div>

        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : comprasFiltradas.length === 0 ? (
          <div className="estado-vacio">
            <p>No hay compras registradas con estos filtros.</p>
          </div>
        ) : (
          <div className="pedidos-grid">
            {comprasFiltradas.map((compra) => (
              <div key={compra.id} className="pedido-card">
                <div className="pedido-card-header">
                  <div>
                    <h4>{compra.proveedor_nombre || 'Sin proveedor'}</h4>
                    <span className="pedido-fecha-creacion">📅 {formatearFecha(compra.fecha)}{compra.numero_factura ? ` · Fact. ${compra.numero_factura}` : ''}</span>
                  </div>
                  <span className={`badge-cobro cobro-${compra.estado_pago}`}>{ETIQUETA_ESTADO[compra.estado_pago]}</span>
                </div>

                {compra.detalle && (
                  <p className="pedido-nota" style={{ background: 'var(--surface-2)', border: 'none', color: 'var(--text-muted)' }}>
                    {compra.detalle}
                  </p>
                )}

                <div className="pedido-desglose">
                  <div><span>Total</span><span>{formatearPrecio(compra.total)}</span></div>
                  <div><span>Pagado</span><span>{formatearPrecio(compra.pagado)}</span></div>
                  <div><span>Saldo</span><span>{formatearPrecio(compra.saldo)}</span></div>
                </div>

                <div className="pedido-card-footer">
                  <div className="pedido-acciones-estado">
                    <button type="button" className="btn-vibrante btn-siguiente-estado" onClick={() => setModal({ compra })}>
                      Editar / registrar pago
                    </button>
                    <button type="button" className="btn-cancelar-pedido" onClick={() => eliminar(compra)}>Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <CompraModal
          compra={modal.compra}
          proveedores={proveedores}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
