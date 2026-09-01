import React, { useState } from 'react';
import api from '../../services/api';
import { METODOS_PAGO } from '../../utils/metodosPago';
import { notificar } from '../notificaciones';

const pad2 = (n) => String(n).padStart(2, '0');
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export default function CompraModal({ compra, proveedores, onClose, onSaved }) {
  const [proveedorId, setProveedorId] = useState(compra ? (compra.proveedor || '') : '');
  const [detalle, setDetalle] = useState(compra?.detalle || '');
  const [numeroFactura, setNumeroFactura] = useState(compra?.numero_factura || '');
  const [fecha, setFecha] = useState(compra?.fecha || hoyISO());
  const [metodoPago, setMetodoPago] = useState(compra?.metodo_pago || 'efectivo');
  const [total, setTotal] = useState(compra?.total ?? '');
  const [pagado, setPagado] = useState(compra?.pagado ?? 0);
  const [nota, setNota] = useState(compra?.nota || '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!total) {
      notificar('Cargá el total de la compra.');
      return;
    }

    const datos = {
      proveedor: proveedorId || null,
      detalle,
      numero_factura: numeroFactura,
      fecha,
      metodo_pago: metodoPago,
      total,
      pagado: pagado || 0,
      nota,
    };

    setGuardando(true);
    try {
      if (compra) {
        await api.patch(`/compras/${compra.id}/`, datos);
      } else {
        await api.post('/compras/', datos);
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar la compra:', error);
      notificar('Hubo un problema al guardar la compra.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{compra ? 'Editar compra' : 'Registrar compra'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Proveedor (opcional)</label>
              <select className="input-vibrante" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                <option value="">Sin proveedor asignado</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">N° de factura</label>
              <input type="text" className="input-vibrante" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Detalle</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Qué se compró (ej: bolsas, etiquetas, 25 kg de manzanilla...)"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input type="date" className="input-vibrante" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Método de pago</label>
              <select className="input-vibrante" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total</label>
              <input type="number" min="0" step="0.01" className="input-vibrante" value={total} onChange={(e) => setTotal(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Pagado</label>
              <input type="number" min="0" step="0.01" className="input-vibrante" value={pagado} onChange={(e) => setPagado(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nota</label>
            <textarea className="input-vibrante" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
