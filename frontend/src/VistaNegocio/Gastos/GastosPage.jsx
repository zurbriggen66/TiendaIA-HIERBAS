import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import GastoModal from './GastoModal';
import GastoFijoModal from './GastoFijoModal';
import GastoFijoPagarModal from './GastoFijoPagarModal';
import { notificar, confirmar } from '../notificaciones';

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function GastosPage() {
  const [gastos, setGastos] = useState([]);
  const [gastosFijos, setGastosFijos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarGastoModal, setMostrarGastoModal] = useState(false);
  const [modalGastoFijo, setModalGastoFijo] = useState(null);
  const [modalPagar, setModalPagar] = useState(null);
  const [tab, setTab] = useState('gastos');
  const [mes, setMes] = useState(mesActual());

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resGastos, resFijos] = await Promise.all([
        api.get('/gastos/'),
        api.get('/gastos-fijos/'),
      ]);
      setGastos(resGastos.data);
      setGastosFijos(resFijos.data);
    } catch (error) {
      console.error('Error al cargar gastos:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // El filtro de mes es del lado del cliente: la lista de gastos es chica y así el
  // resumen (total y por rubro) se recalcula al toque sin ir al servidor.
  const gastosDelMes = gastos.filter((g) => (g.fecha || '').slice(0, 7) === mes);
  const totalMes = gastosDelMes.reduce((s, g) => s + Number(g.monto), 0);
  const porRubro = Object.entries(
    gastosDelMes.reduce((acc, g) => {
      const rubro = g.categoria || 'Sin categoría';
      acc[rubro] = (acc[rubro] || 0) + Number(g.monto);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const eliminarGasto = async (gasto) => {
    if (!(await confirmar(`¿Eliminar el gasto "${gasto.descripcion || `de ${formatearPrecio(gasto.monto)}`}"?`))) return;
    try {
      await api.delete(`/gastos/${gasto.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar el gasto:', error);
      notificar('No se pudo eliminar el gasto.');
    }
  };

  const eliminarGastoFijo = async (gastoFijo) => {
    if (!(await confirmar(`¿Eliminar el gasto fijo "${gastoFijo.nombre}"? Los gastos ya registrados no se borran.`))) return;
    try {
      await api.delete(`/gastos-fijos/${gastoFijo.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar el gasto fijo:', error);
      notificar('No se pudo eliminar el gasto fijo.');
    }
  };

  const textoVencimiento = (dias) => {
    if (dias < 0) return `¡Vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}!`;
    if (dias === 0) return '¡Vence hoy!';
    if (dias === 1) return 'Vence mañana';
    return `Faltan ${dias} días`;
  };

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="gastos-page">
      <header className="main-header">
        <h2>Gastos</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="form-group gastos-filtro-mes">
          <label className="form-label">Mes</label>
          <input
            type="month"
            className="input-vibrante"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
        </div>

        {/* Resumen de egresos del mes */}
        <div className="resumen-grid">
          <div className="resumen-tile resumen-tile-total">
            <span>Total gastado (mes)</span>
            <strong>{formatearPrecio(totalMes)}</strong>
          </div>
          {porRubro.map(([nombre, total]) => (
            <div key={nombre} className="resumen-tile resumen-tile-rubro">
              <span>{nombre}</span>
              <strong>{formatearPrecio(total)}</strong>
            </div>
          ))}
        </div>

        {/* Pestañas */}
        <div className="tabs-bar">
          <button
            type="button"
            className={`tab-boton ${tab === 'gastos' ? 'tab-activo' : ''}`}
            onClick={() => setTab('gastos')}
          >
            Gastos
          </button>
          <button
            type="button"
            className={`tab-boton ${tab === 'fijos' ? 'tab-activo' : ''}`}
            onClick={() => setTab('fijos')}
          >
            Gastos fijos
          </button>
        </div>

        {tab === 'gastos' && (
          <>
            <div className="seccion-header">
              <h3>Gastos</h3>
              <button type="button" className="btn-vibrante" onClick={() => setMostrarGastoModal(true)}>
                + Nuevo gasto
              </button>
            </div>

            {cargando ? (
              <p className="estado-vacio">Cargando...</p>
            ) : gastosDelMes.length === 0 ? (
              <div className="estado-vacio">
                <p>No hay gastos cargados en este mes.</p>
                <button type="button" className="btn-vibrante" onClick={() => setMostrarGastoModal(true)}>
                  Cargar un gasto
                </button>
              </div>
            ) : (
              <div className="gastos-tabla">
                {gastosDelMes.map((gasto) => (
                  <div key={gasto.id} className="gasto-fila">
                    <span className="badge-categoria">{gasto.categoria || "Sin categoría"}</span>
                    <div className="gasto-fila-info">
                      <strong>{gasto.descripcion || 'Gasto sin descripción'}</strong>
                      <span className="gasto-fila-insumo">💳 {gasto.metodo_pago_label}</span>
                    </div>
                    <span className="gasto-fila-fecha">{formatearFecha(gasto.fecha)}</span>
                    <span className="gasto-fila-monto">{formatearPrecio(gasto.monto)}</span>
                    <button type="button" className="gasto-fila-borrar" onClick={() => eliminarGasto(gasto)}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'fijos' && (
          <>
            <div className="seccion-header">
              <h3>Gastos fijos</h3>
              <button type="button" className="btn-vibrante" onClick={() => setModalGastoFijo({ gastoFijo: null })}>
                + Nuevo gasto fijo
              </button>
            </div>

            {cargando ? (
              <p className="estado-vacio">Cargando...</p>
            ) : gastosFijos.length === 0 ? (
              <div className="estado-vacio">
                <p>Todavía no cargaste gastos fijos (alquiler, sueldos, servicios...).</p>
                <button type="button" className="btn-vibrante" onClick={() => setModalGastoFijo({ gastoFijo: null })}>
                  Cargar el primer gasto fijo
                </button>
              </div>
            ) : (
              <div className="gastos-tabla">
                {gastosFijos.map((fijo) => (
                  <div key={fijo.id} className={`gasto-fila gasto-fila-fijo ${fijo.esta_por_vencer ? 'gasto-fila-vence' : ''}`}>
                    <span className="badge-categoria">{fijo.categoria || "Sin categoría"}</span>
                    <div className="gasto-fila-info">
                      <strong>{fijo.nombre}</strong>
                      <span className="gasto-fila-insumo">
                        {fijo.frecuencia_label} · vence {formatearFecha(fijo.proximo_vencimiento)}
                      </span>
                    </div>
                    <span className={`gasto-fila-fecha ${fijo.esta_por_vencer ? 'gasto-fila-vence-texto' : ''}`}>
                      {textoVencimiento(fijo.dias_restantes)}
                    </span>
                    <span className="gasto-fila-monto">{formatearPrecio(fijo.monto)}</span>
                    <button
                      type="button"
                      className="btn-vibrante gasto-fijo-pagar"
                      onClick={() => setModalPagar(fijo)}
                      title="Marcar como pagado"
                    >
                      ✓ Pagar
                    </button>
                    <button type="button" className="gasto-fila-borrar" onClick={() => setModalGastoFijo({ gastoFijo: fijo })} title="Editar">✎</button>
                    <button type="button" className="gasto-fila-borrar" onClick={() => eliminarGastoFijo(fijo)} title="Eliminar">🗑</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {mostrarGastoModal && (
        <GastoModal
          onClose={() => setMostrarGastoModal(false)}
          onSaved={() => { setMostrarGastoModal(false); cargarDatos(); }}
        />
      )}

      {modalGastoFijo && (
        <GastoFijoModal
          gastoFijo={modalGastoFijo.gastoFijo}
          onClose={() => setModalGastoFijo(null)}
          onSaved={() => { setModalGastoFijo(null); cargarDatos(); }}
        />
      )}

      {modalPagar && (
        <GastoFijoPagarModal
          gastoFijo={modalPagar}
          onClose={() => setModalPagar(null)}
          onSaved={() => { setModalPagar(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
