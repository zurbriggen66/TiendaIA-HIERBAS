import React, { useMemo, useState } from 'react';
import api from '../../services/api';
import { resumenPorCategoria, precioUnitarioItem } from '../../utils/escalones';

const COLORES_CHIP = ['chip-mostaza', 'chip-naranja', 'chip-tomate'];
const ETIQUETA_UNIDAD = { kg: 'kg', pack: 'packs', caja: 'cajas', unidad: 'unidades' };

let contadorFila = 0;
const nuevaFila = (producto) => ({ key: ++contadorFila, producto, cantidad: 1 });

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function PedidoModal({ productos, categorias, localidades, onClose, onSaved }) {
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [direccion, setDireccion] = useState('');
  const [localidadId, setLocalidadId] = useState('');
  const [costoEnvio, setCostoEnvio] = useState('');
  const [aplicarDescuento, setAplicarDescuento] = useState(false);
  const [descuentoPct, setDescuentoPct] = useState('');
  const [nota, setNota] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const categoriasPorId = useMemo(() => new Map((categorias || []).map((c) => [c.id, c])), [categorias]);

  const productosFiltrados = categoriaActiva === 'todas'
    ? productos
    : productos.filter((p) => p.categoria === categoriaActiva);

  const elegirLocalidad = (id) => {
    setLocalidadId(id);
    const localidad = (localidades || []).find((l) => String(l.id) === id);
    if (localidad) setCostoEnvio(localidad.costo_envio);
  };

  const actualizarFila = (key, cambios) => {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  };

  const quitarFila = (key) => {
    setFilas((prev) => prev.filter((f) => f.key !== key));
  };

  const agregarProductoClick = (producto) => {
    setFilas((prev) => {
      const idx = prev.findIndex((f) => f.producto.id === producto.id);
      if (idx !== -1) {
        const paso = 1;
        return prev.map((f, i) => (i === idx ? { ...f, cantidad: Number(f.cantidad) + paso } : f));
      }
      return [...prev, nuevaFila(producto)];
    });
  };

  const filasValidas = filas.filter((f) => f.producto && Number(f.cantidad) > 0);
  const itemsParaResumen = filasValidas.map((f) => ({ producto: f.producto, cantidad: Number(f.cantidad) }));
  const resumen = useMemo(() => resumenPorCategoria(itemsParaResumen, categoriasPorId), [itemsParaResumen, categoriasPorId]);
  const faltaAlgunMinimo = resumen.some((g) => g.faltante > 0);

  const totalEstimado = itemsParaResumen.reduce((acc, item) => acc + precioUnitarioItem(item, resumen) * item.cantidad, 0);

  const guardar = async (e) => {
    e.preventDefault();
    if (filasValidas.length === 0) {
      alert('Agregá al menos un producto con cantidad.');
      return;
    }
    if (faltaAlgunMinimo) {
      alert('Todavía falta llegar al mínimo de compra en alguna categoría (ver el resumen debajo del listado).');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/pedidos/', {
        cliente,
        telefono,
        origen: 'admin',
        tipo_entrega: tipoEntrega,
        direccion: tipoEntrega === 'envio' ? direccion : '',
        localidad: tipoEntrega === 'envio' ? (localidadId || null) : null,
        costo_envio: tipoEntrega === 'envio' ? (costoEnvio || 0) : 0,
        descuento_pct: aplicarDescuento ? Number(descuentoPct) || 0 : 0,
        nota,
        items: filasValidas.map((f) => ({ producto: f.producto.id, cantidad: f.cantidad })),
      });
      onSaved();
    } catch (error) {
      console.error('Error al crear el pedido:', error);
      const detalle = error.response?.data?.non_field_errors?.[0];
      alert(detalle || 'Hubo un problema al crear el pedido.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nuevo pedido</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Cliente (opcional)</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Nombre del cliente / dietética"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Teléfono (opcional)</label>
              <input
                type="tel"
                className="input-vibrante"
                placeholder="381..."
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Entrega</label>
              <div className="tipo-entrega-selector">
                <button type="button" className={tipoEntrega === 'retiro' ? 'activo' : ''} onClick={() => setTipoEntrega('retiro')}>
                  Retiro
                </button>
                <button type="button" className={tipoEntrega === 'envio' ? 'activo' : ''} onClick={() => setTipoEntrega('envio')}>
                  Envío
                </button>
              </div>
            </div>
          </div>

          {tipoEntrega === 'envio' && (
            <>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="Calle, número y localidad"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Localidad (opcional)</label>
                  <select className="input-vibrante" value={localidadId} onChange={(e) => elegirLocalidad(e.target.value)}>
                    <option value="">Sin localidad específica</option>
                    {(localidades || []).map((l) => (
                      <option key={l.id} value={l.id}>{l.nombre} — {formatearPrecio(l.costo_envio)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Costo de envío</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-vibrante"
                    placeholder="0.00"
                    value={costoEnvio}
                    onChange={(e) => setCostoEnvio(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input type="checkbox" checked={aplicarDescuento} onChange={(e) => setAplicarDescuento(e.target.checked)} />
              <span>💸 Aplicar descuento</span>
            </label>
          </div>

          {aplicarDescuento && (
            <div className="form-group">
              <label className="form-label">Porcentaje de descuento</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input-vibrante"
                placeholder="Ej: 5"
                value={descuentoPct}
                onChange={(e) => setDescuentoPct(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nota (opcional)</label>
            <textarea
              className="input-vibrante"
              rows={2}
              placeholder="Ej: entregar fraccionado en bolsas de 1kg..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Productos</label>

            {categorias && categorias.length > 0 && (
              <div className="categorias-bar pedido-picker-categorias">
                <button
                  type="button"
                  className={`chip-categoria chip-todas ${categoriaActiva === 'todas' ? 'chip-activo' : ''}`}
                  onClick={() => setCategoriaActiva('todas')}
                >
                  Todas
                </button>
                {categorias.map((cat, i) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`chip-categoria ${COLORES_CHIP[i % COLORES_CHIP.length]} ${categoriaActiva === cat.id ? 'chip-activo' : ''}`}
                    onClick={() => setCategoriaActiva(cat.id)}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            )}

            <div className="pedido-producto-picker-grid">
              {productosFiltrados.map((p) => {
                const grupo = resumen.find((g) => g.categoria.id === p.categoria);
                const enGranel = grupo?.enModoGranel && p.precio_granel != null;
                const precioVigente = precioUnitarioItem({ producto: p }, resumen);
                return (
                  <button key={p.id} type="button" className="pedido-producto-picker-item" onClick={() => agregarProductoClick(p)}>
                    <span>{p.nombre}</span>
                    <strong>
                      {precioVigente ? formatearPrecio(precioVigente) : 'Precio por volumen'}
                      {enGranel && ' (granel)'}
                    </strong>
                  </button>
                );
              })}
            </div>

            {filas.length === 0 ? (
              <p className="aviso-sin-insumos">Tocá un producto de arriba para agregarlo al pedido.</p>
            ) : (
              <div className="pedido-filas">
                {filas.map((fila) => {
                  const paso = 1;
                  const precioUnitario = precioUnitarioItem({ producto: fila.producto, cantidad: fila.cantidad }, resumen);
                  return (
                    <div key={fila.key} className="pedido-fila">
                      <div className="pedido-fila-nombre">
                        <strong>{fila.producto.nombre}</strong>
                        <span>{formatearPrecio(precioUnitario)} / {ETIQUETA_UNIDAD[fila.producto.unidad_medida] || fila.producto.unidad_medida}</span>
                      </div>
                      <div className="pedido-fila-cantidad-stepper">
                        <button type="button" onClick={() => actualizarFila(fila.key, { cantidad: Math.max(paso, Number(fila.cantidad) - paso) })}>−</button>
                        <span>{fila.cantidad}</span>
                        <button type="button" onClick={() => actualizarFila(fila.key, { cantidad: Number(fila.cantidad) + paso })}>+</button>
                      </div>
                      <button type="button" className="pedido-fila-quitar" onClick={() => quitarFila(fila.key)} title="Quitar producto">✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {resumen.map((grupo) => {
              const unidadEtiqueta = ETIQUETA_UNIDAD[grupo.categoria.unidad_medida] || grupo.categoria.unidad_medida;
              return (
                <div key={grupo.categoria.id}>
                  <p className={grupo.faltante > 0 ? 'pedido-fila-aviso' : 'form-ayuda'} style={grupo.faltante > 0 ? { color: '#f59e0b' } : undefined}>
                    {grupo.categoria.nombre}: {grupo.cantidadTotal} {unidadEtiqueta}
                    {grupo.faltante > 0
                      ? ` — falta ${grupo.faltante} para el mínimo de ${grupo.categoria.cantidad_minima}`
                      : grupo.precioEscalon != null
                        ? ` — precio vigente ${formatearPrecio(grupo.precioEscalon)}`
                        : ''}
                  </p>
                  {grupo.variedadesBajoMinimo.map((v) => (
                    <p key={v.nombre} className="pedido-fila-aviso" style={{ color: '#f59e0b' }}>
                      Faltan {v.falta} {unidadEtiqueta} de {v.nombre} (mínimo {grupo.minimoVariedad} por variedad)
                    </p>
                  ))}
                  {grupo.granelMinimoTotal > 0 && (
                    grupo.enModoGranel ? (
                      <p className="form-ayuda" style={{ color: '#4ade80' }}>🎉 Precio a granel aplicado en esta categoría</p>
                    ) : grupo.faltaParaGranel > 0 ? (
                      <p className="form-ayuda">
                        Sumá {grupo.faltaParaGranel} {unidadEtiqueta} más (con al menos {grupo.granelMinimoVariedad} {unidadEtiqueta} de cada variedad) para el precio a granel
                      </p>
                    ) : grupo.variedadesBajoMinimoGranel.length > 0 ? (
                      <p className="form-ayuda">
                        Ya juntaste el total para precio a granel: llevá al menos {grupo.granelMinimoVariedad} {unidadEtiqueta} de cada variedad elegida para que se aplique
                      </p>
                    ) : null
                  )}
                </div>
              );
            })}
          </div>

          <div className="pedido-total-estimado">
            <span>Total estimado</span>
            <strong>{formatearPrecio(totalEstimado)}</strong>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
