import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

// Sin tildes ni mayúsculas, para que buscar "ore" encuentre "Orégano".
const normalizar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function ListaPreciosPage() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);

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

  const categoriaDe = (id) => categorias.find((c) => c.id === id);

  const productosFiltrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return productos
      .filter((p) => categoriaActiva === 'todas' || p.categoria === categoriaActiva)
      .filter((p) => !texto || normalizar(p.nombre).includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos, categoriaActiva, busqueda]);

  const cambiarCampoLocal = (id, campo, valor) => {
    setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

  const guardarCampo = async (producto, campo, valor) => {
    setGuardandoId(producto.id);
    try {
      await api.patch(`/productos/${producto.id}/`, { [campo]: valor === '' ? null : valor });
    } catch (error) {
      console.error('Error al guardar el precio:', error);
      alert(`No se pudo guardar el precio de "${producto.nombre}".`);
    } finally {
      setGuardandoId((actual) => (actual === producto.id ? null : actual));
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
        </div>

        <div className="categorias-bar">
          <button
            type="button"
            className={`chip-categoria chip-todas ${categoriaActiva === 'todas' ? 'chip-activo' : ''}`}
            onClick={() => setCategoriaActiva('todas')}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`chip-categoria chip-naranja ${categoriaActiva === cat.id ? 'chip-activo' : ''}`}
              onClick={() => setCategoriaActiva(cat.id)}
            >
              {cat.imagen && <img src={cat.imagen} alt="" className="chip-imagen" />}
              <span>{cat.nombre}</span>
            </button>
          ))}
        </div>

        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : productosFiltrados.length === 0 ? (
          <p className="estado-vacio">No hay productos que coincidan con la búsqueda.</p>
        ) : (
          <div className="precios-lista">
            {productosFiltrados.map((prod) => {
              const categoria = categoriaDe(prod.categoria);
              const usaEscalones = categoria && categoria.escalones && categoria.escalones.length > 0;
              const usaGranel = categoria && Number(categoria.granel_cantidad_minima) > 0;
              return (
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

                  <div className="precios-fila-campos">
                    {usaEscalones ? (
                      <span className="precios-fila-nota">Precio por volumen (editar en Categorías)</span>
                    ) : (
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
