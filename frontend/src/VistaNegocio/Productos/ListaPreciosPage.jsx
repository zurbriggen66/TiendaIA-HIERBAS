import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { notificar, confirmar } from '../notificaciones';

// Sin tildes ni mayúsculas, para que buscar "ore" encuentre "Orégano".
const normalizar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function ListaPreciosPage() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);
  const [guardandoEscalon, setGuardandoEscalon] = useState(null); // id de la categoría

  // Ajuste masivo de precios (porcentaje o monto fijo, opcionalmente por categoría).
  const [ajusteAbierto, setAjusteAbierto] = useState(false);
  const [ajusteModo, setAjusteModo] = useState('porcentaje');
  const [ajusteValor, setAjusteValor] = useState('');
  const [aplicandoAjuste, setAplicandoAjuste] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resCategorias, resProductos] = await Promise.all([
        api.get('/categorias/'),
        api.get('/productos/'),
      ]);
      setCategorias(resCategorias.data);
      setProductos(resProductos.data);
    } catch (error) {
      console.error('Error al cargar categorías/productos:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const categoriaDe = useCallback((id) => categorias.find((c) => c.id === id), [categorias]);

  const productosFiltrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return productos
      .filter((p) => categoriaActiva === 'todas' || p.categoria === categoriaActiva)
      .filter((p) => !texto || normalizar(p.nombre).includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos, categoriaActiva, busqueda]);

  // Los productos se agrupan por categoría: los escalones de "precio por volumen" son
  // de la categoría (no del producto), así que se editan una sola vez por grupo.
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const p of productosFiltrados) {
      if (!mapa.has(p.categoria)) mapa.set(p.categoria, []);
      mapa.get(p.categoria).push(p);
    }
    return [...mapa.entries()]
      .map(([catId, prods]) => ({ categoria: categoriaDe(catId), prods }))
      .sort((a, b) => (a.categoria?.nombre || '').localeCompare(b.categoria?.nombre || ''));
  }, [productosFiltrados, categoriaDe]);

  const cambiarCampoLocal = (id, campo, valor) => {
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

  const guardarCampo = async (producto, campo, valor) => {
    setGuardandoId(producto.id);
    try {
      await api.patch(`/productos/${producto.id}/`, { [campo]: valor === '' ? null : valor });
    } catch (error) {
      console.error('Error al guardar el precio:', error);
      notificar(`No se pudo guardar el precio de "${producto.nombre}".`);
    } finally {
      setGuardandoId((actual) => (actual === producto.id ? null : actual));
    }
  };

  const cambiarEscalonLocal = (catId, escId, campo, valor) => {
    setCategorias((prev) => prev.map((c) => (c.id === catId
      ? { ...c, escalones: c.escalones.map((e) => (e.id === escId ? { ...e, [campo]: valor } : e)) }
      : c)));
  };

  const guardarEscalon = async (catId, escalon, campo, valor) => {
    setGuardandoEscalon(catId);
    try {
      await api.patch(`/escalones-precio/${escalon.id}/`, { [campo]: Number(valor) || 0 });
    } catch (error) {
      console.error('Error al guardar el escalón:', error);
      notificar(campo === 'cantidad_desde'
        ? 'No se pudo guardar: esa cantidad "desde" ya está usada en otro tramo de la categoría.'
        : 'No se pudo guardar el precio por volumen.');
      cargarDatos(); // revierte el cambio local que el servidor rechazó
    } finally {
      setGuardandoEscalon((actual) => (actual === catId ? null : actual));
    }
  };

  const scopeAjuste = categoriaActiva === 'todas'
    ? null
    : categorias.find((c) => c.id === categoriaActiva);

  const aplicarAjusteMasivo = async () => {
    const valor = Number(ajusteValor);
    if (!valor) {
      notificar('Ingresá un valor distinto de cero.');
      return;
    }
    const signo = valor > 0 ? 'aumentar' : 'bajar';
    const cuanto = ajusteModo === 'porcentaje' ? `un ${Math.abs(valor)}%` : `$${Math.abs(valor)}`;
    const alcance = scopeAjuste ? `de "${scopeAjuste.nombre}"` : 'de TODAS las categorías';
    if (!(await confirmar(`¿${signo === 'aumentar' ? 'Aumentar' : 'Bajar'} ${cuanto} los precios ${alcance}? Esta acción no se puede deshacer.`))) return;

    setAplicandoAjuste(true);
    try {
      const { data } = await api.post('/productos/ajuste-masivo/', {
        modo: ajusteModo,
        valor,
        categoria: scopeAjuste ? scopeAjuste.id : null,
      });
      notificar(`Listo: ${data.productos} producto(s) y ${data.escalones} escalón(es) actualizados.`);
      setAjusteAbierto(false);
      setAjusteValor('');
      cargarDatos();
    } catch (error) {
      console.error('Error en el ajuste masivo:', error);
      notificar(error.response?.data?.detail || 'No se pudo aplicar el ajuste.');
    } finally {
      setAplicandoAjuste(false);
    }
  };

  return (
    <div className="precios-page">
      <header className="main-header">
        <h2>Lista de Precios</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="precios-buscador-fila">
          <div className="precios-buscador">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <label className="precios-filtro-categoria">
            <span className="form-label">Categoría</span>
            <select
              className="input-vibrante"
              value={categoriaActiva}
              onChange={(e) => setCategoriaActiva(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn-secundario precios-ajuste-toggle"
            onClick={() => setAjusteAbierto((v) => !v)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">percent</span>
            Aumentar precios
          </button>
        </div>

        {ajusteAbierto && (
          <div className="precios-ajuste-panel">
            <div className="precios-ajuste-modo">
              <button
                type="button"
                className={ajusteModo === 'porcentaje' ? 'activo' : ''}
                onClick={() => setAjusteModo('porcentaje')}
              >
                Porcentaje (%)
              </button>
              <button
                type="button"
                className={ajusteModo === 'monto' ? 'activo' : ''}
                onClick={() => setAjusteModo('monto')}
              >
                Monto fijo ($)
              </button>
            </div>

            <label className="precios-campo precios-ajuste-valor">
              <span>{ajusteModo === 'porcentaje' ? 'Aumento en %' : 'Aumento en $'}</span>
              <input
                type="number"
                step={ajusteModo === 'porcentaje' ? '0.5' : '1'}
                inputMode="decimal"
                placeholder={ajusteModo === 'porcentaje' ? 'Ej: 10' : 'Ej: 500'}
                value={ajusteValor}
                onChange={(e) => setAjusteValor(e.target.value)}
              />
            </label>

            <p className="precios-ajuste-alcance">
              Se aplica a {scopeAjuste ? <strong>{scopeAjuste.nombre}</strong> : <strong>todas las categorías</strong>}
              {' '}(precio propio, precio a granel y precios por volumen). Usá un valor negativo para bajar.
            </p>

            <div className="precios-ajuste-acciones">
              <button type="button" className="btn-secundario" onClick={() => setAjusteAbierto(false)}>Cancelar</button>
              <button type="button" className="btn-vibrante" onClick={aplicarAjusteMasivo} disabled={aplicandoAjuste}>
                {aplicandoAjuste ? 'Aplicando...' : 'Aplicar ajuste'}
              </button>
            </div>
          </div>
        )}

        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : grupos.length === 0 ? (
          <p className="estado-vacio">No hay productos que coincidan con la búsqueda.</p>
        ) : (
          <div className="precios-lista">
            {grupos.map(({ categoria, prods }) => {
              const escalones = [...(categoria?.escalones || [])]
                .sort((a, b) => Number(a.cantidad_desde) - Number(b.cantidad_desde));
              const usaEscalones = escalones.length > 0;
              const usaGranel = categoria && Number(categoria.granel_cantidad_minima) > 0;
              return (
                <div key={categoria?.id ?? 'sin'} className="precios-grupo">
                  <div className="precios-grupo-cabecera">
                    <h3>{categoria?.nombre ?? 'Sin categoría'}</h3>
                    {usaEscalones && (
                      <div className="precios-escalones">
                        <span className="precios-escalones-titulo">
                          Precio por volumen — aplica a toda la categoría
                        </span>
                        <div className="precios-escalones-campos">
                          {escalones.map((esc) => (
                            <div key={esc.id} className="precios-escalon">
                              {esc.etiqueta && <span className="precios-escalon-etiqueta">{esc.etiqueta}</span>}
                              <div className="precios-escalon-inputs">
                                <label className="precios-campo">
                                  <span>Desde (cant.)</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={esc.cantidad_desde ?? ''}
                                    onChange={(e) => cambiarEscalonLocal(categoria.id, esc.id, 'cantidad_desde', e.target.value)}
                                    onBlur={(e) => guardarEscalon(categoria.id, esc, 'cantidad_desde', e.target.value)}
                                  />
                                </label>
                                <label className="precios-campo">
                                  <span>Precio</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={esc.precio_unitario ?? ''}
                                    onChange={(e) => cambiarEscalonLocal(categoria.id, esc.id, 'precio_unitario', e.target.value)}
                                    onBlur={(e) => guardarEscalon(categoria.id, esc, 'precio_unitario', e.target.value)}
                                  />
                                </label>
                              </div>
                            </div>
                          ))}
                          <span className={`precios-guardado ${guardandoEscalon === categoria?.id ? 'precios-guardado-visible' : ''}`}>
                            Guardando...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {prods.map((prod) => (
                    <div key={prod.id} className="precios-fila">
                      <div className="precios-fila-imagen">
                        {prod.imagen ? (
                          <img src={prod.imagen} alt={prod.nombre} />
                        ) : (
                          <span className="material-symbols-outlined" aria-hidden="true">eco</span>
                        )}
                      </div>

                      <div className="precios-fila-info">
                        <strong>{prod.nombre}</strong>
                        <span className="precios-fila-categoria">{prod.categoria_nombre}</span>
                      </div>

                      {(!usaEscalones || usaGranel) && (
                        <div className="precios-fila-campos">
                          {!usaEscalones && (
                            <label className="precios-campo">
                              <span>Precio propio</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={prod.precio_base ?? ''}
                                onChange={(e) => cambiarCampoLocal(prod.id, 'precio_base', e.target.value)}
                                onBlur={(e) => guardarCampo(prod, 'precio_base', e.target.value)}
                              />
                            </label>
                          )}

                          {usaGranel && (
                            <label className="precios-campo">
                              <span>Precio a granel</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={prod.precio_granel ?? ''}
                                onChange={(e) => cambiarCampoLocal(prod.id, 'precio_granel', e.target.value)}
                                onBlur={(e) => guardarCampo(prod, 'precio_granel', e.target.value)}
                              />
                            </label>
                          )}

                          <span className={`precios-guardado ${guardandoId === prod.id ? 'precios-guardado-visible' : ''}`}>
                            Guardando...
                          </span>
                        </div>
                      )}

                      {usaEscalones && !usaGranel && (
                        <span className="precios-fila-nota">precio por volumen ↑</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
