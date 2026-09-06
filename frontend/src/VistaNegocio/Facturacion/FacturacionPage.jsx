import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { METODOS_PAGO } from '../../utils/metodosPago';
import { notificar, confirmar } from '../notificaciones';

// Facturación electrónica contra ARCA (ex AFIP). Tres cosas, en orden de uso:
// 1) los datos fiscales del negocio (una vez), 2) cuándo facturar solo, y
// 3) la cola de comprobantes, para ver qué se emitió y reintentar lo que falló.

const CONDICIONES_IVA = [
  { value: 'monotributo', label: 'Monotributo (Factura C)' },
  { value: 'responsable_inscripto', label: 'Responsable Inscripto (Factura A/B)' },
  { value: 'exento', label: 'Exento' },
];

const FORM_VACIO = {
  cuit: '',
  razon_social: '',
  punto_venta: '',
  condicion_iva: 'monotributo',
  cert_ref: '',
  homologacion: true,
  activo: true,
  facturar_automatico: false,
  facturar_medios: [],
  facturar_monto_minimo: '0',
};

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio || 0);

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

const mensajeDeError = (error, porDefecto) => {
  const data = error.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  const primero = data && Object.values(data)[0];
  if (Array.isArray(primero)) return primero[0];
  return porDefecto;
};

export default function FacturacionPage() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [comprobantes, setComprobantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [reintentando, setReintentando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [resConfig, resCola] = await Promise.all([
        api.get('/fiscal/config/'),
        api.get('/fiscal/comprobantes/'),
      ]);
      const actual = resConfig.data[0] || null;
      setConfig(actual);
      if (actual) {
        setForm({
          ...FORM_VACIO,
          ...actual,
          facturar_medios: actual.facturar_medios || [],
          facturar_monto_minimo: String(actual.facturar_monto_minimo ?? '0'),
        });
      }
      setComprobantes(resCola.data);
    } catch (error) {
      console.error('Error al cargar la configuración fiscal:', error);
      notificar('No se pudo cargar la configuración fiscal.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const alternarMedio = (medio) =>
    setForm((prev) => ({
      ...prev,
      facturar_medios: prev.facturar_medios.includes(medio)
        ? prev.facturar_medios.filter((m) => m !== medio)
        : [...prev.facturar_medios, medio],
    }));

  const guardar = async (evento) => {
    evento.preventDefault();
    // Pasar a producción emite comprobantes fiscales de verdad, que no se pueden
    // borrar: se avisa una vez, explícito, antes de guardar.
    if (config?.homologacion && !form.homologacion) {
      const ok = await confirmar(
        'Vas a pasar a PRODUCCIÓN: a partir de ahora cada factura que se emita es un ' +
        'comprobante fiscal real ante ARCA y no se puede anular (solo se corrige con una ' +
        'nota de crédito). ¿Continuar?'
      );
      if (!ok) return;
    }

    setGuardando(true);
    try {
      const cuerpo = { ...form, facturar_monto_minimo: form.facturar_monto_minimo || '0' };
      const { data } = config
        ? await api.patch(`/fiscal/config/${config.id}/`, cuerpo)
        : await api.post('/fiscal/config/', cuerpo);
      setConfig(data);
      notificar('Configuración fiscal guardada.', 'exito');
    } catch (error) {
      notificar(mensajeDeError(error, 'No se pudo guardar la configuración fiscal.'));
    } finally {
      setGuardando(false);
    }
  };

  const reintentarPendientes = async () => {
    setReintentando(true);
    try {
      const { data } = await api.post('/fiscal/comprobantes/procesar-pendientes/');
      const detalle = data.errores?.length ? ` Último error: ${data.errores[0]}` : '';
      notificar(`Emitidas: ${data.emitidas}. Fallidas: ${data.fallidas}.${detalle}`);
      cargar();
    } catch (error) {
      notificar(mensajeDeError(error, 'No se pudieron reintentar los comprobantes.'));
    } finally {
      setReintentando(false);
    }
  };

  const pendientes = comprobantes.filter((c) => c.estado !== 'ok').length;

  return (
    <div className="productos-page">
      <header className="main-header">
        <h2>Facturación electrónica</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <>
            {form.homologacion && (
              <div className="estado-vacio" style={{ marginBottom: 16 }}>
                <strong>Modo prueba (homologación)</strong>
                <p>
                  Las facturas se emiten contra el ambiente de pruebas de ARCA: sirven para
                  verificar que todo funcione, pero <strong>no son comprobantes válidos</strong>.
                  Destildá "Modo prueba" recién cuando el certificado de producción esté cargado.
                </p>
              </div>
            )}

            <form onSubmit={guardar}>
              <div className="seccion-header">
                <h3>Datos fiscales del negocio</h3>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CUIT</label>
                  <input
                    className="input-vibrante"
                    value={form.cuit}
                    onChange={(e) => actualizar('cuit', e.target.value)}
                    placeholder="20123456789"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Razón social</label>
                  <input
                    className="input-vibrante"
                    value={form.razon_social}
                    onChange={(e) => actualizar('razon_social', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Punto de venta</label>
                  <input
                    className="input-vibrante"
                    value={form.punto_venta}
                    onChange={(e) => actualizar('punto_venta', e.target.value)}
                    placeholder="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Condición frente al IVA</label>
                  <select
                    className="input-vibrante"
                    value={form.condicion_iva}
                    onChange={(e) => actualizar('condicion_iva', e.target.value)}
                  >
                    {CONDICIONES_IVA.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del certificado</label>
                <input
                  className="input-vibrante"
                  value={form.cert_ref}
                  onChange={(e) => actualizar('cert_ref', e.target.value)}
                  placeholder="hierbas"
                />
                <small className="form-ayuda">
                  El certificado y la clave privada de ARCA los deja el que administra el
                  servidor en la carpeta de datos (<code>fiscal_certs/</code>), como
                  <code> {form.cert_ref || 'nombre'}.crt</code> y
                  <code> {form.cert_ref || 'nombre'}.key</code>. Acá va solo ese nombre, no el archivo.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={form.homologacion}
                    onChange={(e) => actualizar('homologacion', e.target.checked)}
                  />{' '}
                  Modo prueba (homologación) — las facturas no son válidas
                </label>
              </div>

              <div className="seccion-header" style={{ marginTop: 28 }}>
                <h3>Facturación automática</h3>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={form.facturar_automatico}
                    onChange={(e) => actualizar('facturar_automatico', e.target.checked)}
                  />{' '}
                  Facturar solo los pedidos, al terminar de cobrarlos
                </label>
                <small className="form-ayuda">
                  Solo se factura un pedido cuando queda <strong>totalmente cobrado</strong> y
                  se pagó con alguno de los medios elegidos abajo. Lo que no se pueda emitir
                  (ARCA caído, un rechazo) queda en la lista de más abajo para reintentar.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Medios de pago que disparan la factura</label>
                {METODOS_PAGO.map((m) => (
                  <label key={m.value} className="form-label" style={{ fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={form.facturar_medios.includes(m.value)}
                      onChange={() => alternarMedio(m.value)}
                    />{' '}
                    {m.label}
                  </label>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Monto mínimo para facturar (0 = sin mínimo)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input-vibrante"
                  value={form.facturar_monto_minimo}
                  onChange={(e) => actualizar('facturar_monto_minimo', e.target.value)}
                />
              </div>

              <button type="submit" className="btn-vibrante" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </form>

            <div className="seccion-header" style={{ marginTop: 36 }}>
              <h3>Comprobantes emitidos</h3>
              <button
                type="button"
                className="btn-vibrante"
                onClick={reintentarPendientes}
                disabled={reintentando || pendientes === 0}
              >
                {reintentando ? 'Reintentando...' : `Reintentar pendientes (${pendientes})`}
              </button>
            </div>

            {comprobantes.length === 0 ? (
              <p className="estado-vacio">Todavía no se facturó ningún pedido.</p>
            ) : (
              <div className="tabla-pedidos-scroll">
                <table className="tabla-pedidos">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Fecha</th>
                      <th className="num">Total</th>
                      <th>Estado</th>
                      <th>Comprobante</th>
                      <th>CAE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprobantes.map((c) => (
                      <tr key={c.id}>
                        <td data-label="Pedido">
                          #{c.pedido}
                          {c.pedido_cliente && <span className="tp-sub">{c.pedido_cliente}</span>}
                        </td>
                        <td data-label="Fecha">{formatearFechaHora(c.creado)}</td>
                        <td data-label="Total" className="num">{formatearPrecio(c.pedido_total)}</td>
                        <td data-label="Estado">
                          <span className={`badge-cobro cobro-${c.estado === 'ok' ? 'pagado' : 'pendiente'}`}>
                            {c.estado_label}
                          </span>
                          {c.error_msg && <span className="tp-sub">{c.error_msg}</span>}
                        </td>
                        <td data-label="Comprobante">
                          {c.numero_factura
                            ? `${c.tipo_comprobante} ${String(c.punto_venta).padStart(4, '0')}-${String(c.numero_factura).padStart(8, '0')}`
                            : '—'}
                        </td>
                        <td data-label="CAE">
                          {c.cae || '—'}
                          {c.cae_vencimiento && <span className="tp-sub">vence {c.cae_vencimiento}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
