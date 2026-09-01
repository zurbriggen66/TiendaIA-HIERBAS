import React, { useMemo, useState } from 'react';
import api from '../../services/api';
import { resumenPorCategoria, precioUnitarioItem } from '../../utils/escalones';
import { notificar } from '../notificaciones';

const ETIQUETA_UNIDAD = { kg: 'kg', pack: 'packs', caja: 'cajas', unidad: 'unidades' };

let contadorFila = 0;
const nuevaFila = (producto, cantidad = 1) => ({ key: ++contadorFila, producto, cantidad });

const cantidadesFijasDe = (categoria) => (categoria?.venta_cantidad_fija
  ? (categoria.cantidades_fijas || []).map((cf) => Number(cf.cantidad)).sort((a, b) => a - b)
  : null);

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

// Sin tildes ni mayúsculas, para que buscar "ore" encuentre "Orégano".
const normalizar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Formulario de alta de pedido. `variante`:
//  - 'modal'  → una sola columna (lo usa PedidoModal).
//  - 'inline' → dos columnas con el resumen fijo a la derecha (lo usa Inicio).
export default function PedidoFormulario({ productos, categorias, localidades, onSaved, onCancelar, variante = 'modal' }) {
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
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const categoriasPorId = useMemo(() => new Map((categorias || []).map((c) => [c.id, c])), [categorias]);

  const textoBusqueda = normalizar(busquedaProducto.trim());
  const productosFiltrados = productos
    .filter((p) => categoriaActiva === 'todas' || p.categoria === categoriaActiva)
    .filter((p) => !textoBusqueda || normalizar(p.nombre).includes(textoBusqueda));

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
    const categoria = categoriasPorId.get(producto.categoria);
    const cantidadesFijas = cantidadesFijasDe(categoria);
    setFilas((prev) => {
      const idx = prev.findIndex((f) => f.producto.id === producto.id);
      if (idx !== -1) {
        if (cantidadesFijas) {
          // Ya está en la lista: pasar a la próxima cantidad fija en vez de +1.
          const indiceActual = cantidadesFijas.indexOf(Number(prev[idx].cantidad));
          const siguiente = cantidadesFijas[Math.min(indiceActual + 1, cantidadesFijas.length - 1)];
          return prev.map((f, i) => (i === idx ? { ...f, cantidad: siguiente } : f));
        }
        const paso = 1;
        return prev.map((f, i) => (i === idx ? { ...f, cantidad: Number(f.cantidad) + paso } : f));
      }
      // Al principio, no al final: si ya hay varios productos cargados, el que se
      // acaba de agregar tiene que verse sin scrollear la lista.
      return [nuevaFila(producto, cantidadesFijas ? cantidadesFijas[0] : 1), ...prev];
    });
  };

  const filasValidas = filas.filter((f) => f.producto && Number(f.cantidad) > 0);
  const itemsParaResumen = filasValidas.map((f) => ({ producto: f.producto, cantidad: Number(f.cantidad) }));
  const resumen = useMemo(() => resumenPorCategoria(itemsParaResumen, categoriasPorId), [itemsParaResumen, categoriasPorId]);
  const faltaAlgunMinimo = resumen.some((g) => g.faltante > 0);

  const subtotal = itemsParaResumen.reduce((acc, item) => acc + precioUnitarioItem(item, resumen) * item.cantidad, 0);
  const envio = tipoEntrega === 'envio' ? Number(costoEnvio) || 0 : 0;
  const pctDescuento = aplicarDescuento ? Number(descuentoPct) || 0 : 0;
  const montoDescuento = Math.round(((subtotal + envio) * pctDescuento) / 100);
  const total = subtotal + envio - montoDescuento;

  const guardar = async (e) => {
    e.preventDefault();
    if (filasValidas.length === 0) {
      notificar('Agregá al menos un producto con cantidad.');
      return;
    }
    if (faltaAlgunMinimo) {
      notificar('Todavía falta llegar al mínimo de compra en alguna categoría (ver el resumen).');
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
        descuento_pct: pctDescuento,
        nota,
        items: filasValidas.map((f) => ({ producto: f.producto.id, cantidad: f.cantidad })),
      });
      onSaved();
    } catch (error) {
      console.error('Error al crear el pedido:', error);
      const detalle = error.response?.data?.non_field_errors?.[0];
      notificar(detalle || 'Hubo un problema al crear el pedido.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className={`pedido-formulario pedido-formulario-${variante}`} onSubmit={guardar}>
      <div className="pf-principal">
        <div className="pf-seccion">
          <div className="pf-seccion-titulo"><span>1</span> Datos del cliente</div>

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

          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-vibrante">
                <input type="checkbox" checked={aplicarDescuento} onChange={(e) => setAplicarDescuento(e.target.checked)} />
                <span>Aplicar descuento</span>
              </label>
              {aplicarDescuento && (
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-vibrante"
                  placeholder="Ej: 5 (%)"
                  value={descuentoPct}
                  onChange={(e) => setDescuentoPct(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
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
          </div>
        </div>

        <div className="pf-seccion">
          <div className="pf-seccion-titulo"><span>2</span> Productos</div>

          <div className="pedido-picker-buscador pf-buscador">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="text"
              placeholder="Buscar productos por nombre, categoría o palabra clave..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
            />
          </div>

          {categorias && categorias.length > 0 && (
            <div className="pf-chips">
              <button
                type="button"
                className={`pf-chip ${categoriaActiva === 'todas' ? 'pf-chip-activo' : ''}`}
                onClick={() => setCategoriaActiva('todas')}
              >
                Todas
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`pf-chip ${categoriaActiva === cat.id ? 'pf-chip-activo' : ''}`}
                  onClick={() => setCategoriaActiva(cat.id)}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          )}

          {productosFiltrados.length === 0 ? (
            <p className="aviso-sin-insumos">No hay productos que coincidan con la búsqueda.</p>
          ) : (
            <div className="pedido-producto-picker-grid pf-picker-grid">
              {productosFiltrados.map((p) => {
                const grupo = resumen.find((g) => g.categoria.id === p.categoria);
                const enGranel = grupo?.enModoGranel && p.precio_granel != null;
                const precioVigente = precioUnitarioItem({ producto: p }, resumen);
                const yaEnPedido = filas.some((f) => f.producto.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`pedido-producto-picker-item ${yaEnPedido ? 'pf-picker-item-activo' : ''}`}
                    onClick={() => agregarProductoClick(p)}
                  >
                    <span className="pf-picker-item-info">
                      <strong>{p.nombre}</strong>
                      <span>
                        {precioVigente ? formatearPrecio(precioVigente) : 'Precio por volumen'}
                        {enGranel && ' (granel)'}
                      </span>
                    </span>
                    <span className="material-symbols-outlined pf-picker-item-mas" aria-hidden="true">add</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside className="pf-resumen">
        <div className="pf-resumen-titulo">Resumen del pedido</div>

        {filas.length === 0 ? (
          <p className="aviso-sin-insumos">Tocá un producto para agregarlo al pedido.</p>
        ) : (
          <div className="pedido-item-filas pf-resumen-items">
            {filas.map((fila) => {
              const paso = 1;
              const precioUnitario = precioUnitarioItem({ producto: fila.producto, cantidad: fila.cantidad }, resumen);
              const cantidadesFijas = cantidadesFijasDe(categoriasPorId.get(fila.producto.categoria));
              const indiceFija = cantidadesFijas ? cantidadesFijas.indexOf(Number(fila.cantidad)) : -1;
              return (
                <div key={fila.key} className="pedido-item-fila">
                  <div className="pedido-item-fila-info">
                    <strong>{fila.producto.nombre}</strong>
                    <span>{formatearPrecio(precioUnitario)} / {ETIQUETA_UNIDAD[fila.producto.unidad_medida] || fila.producto.unidad_medida}</span>
                  </div>
                  <div className="pedido-item-fila-acciones">
                    <div className="pedido-fila-cantidad-stepper">
                      {cantidadesFijas ? (
                        <>
                          <button
                            type="button"
                            disabled={indiceFija <= 0}
                            onClick={() => actualizarFila(fila.key, { cantidad: cantidadesFijas[indiceFija - 1] })}
                            title="Bajar a la cantidad fija anterior"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="pedido-fila-cantidad-libre"
                            value={fila.cantidad}
                            onChange={(e) => actualizarFila(fila.key, { cantidad: e.target.value })}
                            title="También podés escribir cualquier cantidad real vendida"
                          />
                          <button
                            type="button"
                            disabled={indiceFija === -1 || indiceFija >= cantidadesFijas.length - 1}
                            onClick={() => actualizarFila(fila.key, { cantidad: cantidadesFijas[indiceFija + 1] })}
                            title="Subir a la cantidad fija siguiente"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => actualizarFila(fila.key, { cantidad: Math.max(paso, Number(fila.cantidad) - paso) })}>−</button>
                          <span>{fila.cantidad}</span>
                          <button type="button" onClick={() => actualizarFila(fila.key, { cantidad: Number(fila.cantidad) + paso })}>+</button>
                        </>
                      )}
                    </div>
                    <button type="button" className="pedido-fila-quitar" onClick={() => quitarFila(fila.key)} title="Quitar producto">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {resumen.map((grupo) => {
          const unidadEtiqueta = ETIQUETA_UNIDAD[grupo.categoria.unidad_medida] || grupo.categoria.unidad_medida;
          return (
            <div key={grupo.categoria.id} className="pf-resumen-aviso-grupo">
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

        <div className="pf-resumen-totales">
          <div><span>Subtotal</span><span>{formatearPrecio(subtotal)}</span></div>
          {envio > 0 && <div><span>Envío</span><span>{formatearPrecio(envio)}</span></div>}
          {montoDescuento > 0 && <div className="pf-descuento"><span>Descuento ({pctDescuento}%)</span><span>−{formatearPrecio(montoDescuento)}</span></div>}
          <div className="pf-resumen-total"><span>Total</span><strong>{formatearPrecio(total)}</strong></div>
        </div>

        <div className="pf-resumen-acciones">
          {onCancelar && (
            <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
          )}
          <button type="submit" className="btn-vibrante pf-btn-crear" disabled={guardando}>
            <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
            {guardando ? 'Guardando...' : 'Crear pedido'}
          </button>
        </div>
      </aside>
    </form>
  );
}
