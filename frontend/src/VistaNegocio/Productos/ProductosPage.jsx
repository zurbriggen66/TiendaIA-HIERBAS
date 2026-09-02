import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import ProductoModal from './ProductoModal';
import { notificar, confirmar } from '../notificaciones';

export default function ProductosPage() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [cargando, setCargando] = useState(true);

  const [modalProducto, setModalProducto] = useState(null); // { producto: null|obj }

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

  const eliminarProducto = async (producto) => {
    if (!(await confirmar(`¿Eliminar el producto "${producto.nombre}"?`))) return;
    try {
      await api.delete(`/productos/${producto.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar el producto:', error);
      const detalle = error.response?.data?.detail;
      notificar(detalle || 'No se pudo eliminar el producto.');
    }
  };

  const productosFiltrados = categoriaActiva === 'todas'
    ? productos
    : productos.filter((p) => p.categoria === categoriaActiva);

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  const categoriaDe = (id) => categorias.find((c) => c.id === id);

  const conteoPorCategoria = categorias.map((cat) => ({
    categoria: cat,
    cantidad: productos.filter((p) => p.categoria === cat.id).length,
  }));

  return (
    <div className="productos-page">
      <header className="main-header">
        <h2>Productos & Stock</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {!cargando && categorias.length > 0 && (
          <div className="cat-filtro">
            <button
              type="button"
              className={`cat-filtro-item ${categoriaActiva === 'todas' ? 'activo' : ''}`}
              onClick={() => setCategoriaActiva('todas')}
            >
              Todas <span className="cat-filtro-count">{productos.length}</span>
            </button>
            {conteoPorCategoria.map(({ categoria, cantidad }) => (
              <button
                key={categoria.id}
                type="button"
                className={`cat-filtro-item ${categoriaActiva === categoria.id ? 'activo' : ''}`}
                onClick={() => setCategoriaActiva(categoria.id)}
              >
                {categoria.nombre} <span className="cat-filtro-count">{cantidad}</span>
              </button>
            ))}
          </div>
        )}

        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : categorias.length === 0 ? (
          <div className="estado-vacio">
            <p>Todavía no hay categorías creadas — andá a "Categorías" en el menú para crear la primera.</p>
          </div>
        ) : (
          <div className="productos-grid">
            {productosFiltrados.map((prod) => {
              const categoria = categoriaDe(prod.categoria);
              const usaEscalones = categoria && categoria.escalones && categoria.escalones.length > 0;
              return (
                <div
                  key={prod.id}
                  className="producto-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setModalProducto({ producto: prod })}
                  onKeyDown={(e) => e.key === 'Enter' && setModalProducto({ producto: prod })}
                >
                  {prod.destacado && <span className="badge-destacado">⭐ Destacado</span>}
                  {!prod.activo && <span className="badge-extra">Oculto</span>}
                  <div className="producto-imagen-wrap">
                    {prod.imagen ? (
                      <img src={prod.imagen} alt={prod.nombre} className="producto-imagen" />
                    ) : (
                      <div className="producto-imagen-placeholder">🌿</div>
                    )}
                  </div>
                  <div className="producto-info">
                    <span className="producto-categoria-tag">{prod.categoria_nombre}</span>
                    <h4>{prod.nombre}</h4>
                    {prod.contenido && <p className="producto-descripcion">{prod.contenido}</p>}
                    <div className="producto-footer">
                      {usaEscalones ? (
                        <span className="producto-precio" style={{ fontSize: '0.8rem' }}>Precio por volumen</span>
                      ) : (
                        <span className="producto-precio">{prod.precio_base ? formatearPrecio(prod.precio_base) : 'Sin precio'}</span>
                      )}
                      <div className="producto-acciones">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); eliminarProducto(prod); }}
                        >🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="producto-card producto-card-nueva"
              onClick={() => setModalProducto({ producto: null })}
            >
              <span className="producto-card-nueva-icono">+</span>
              <span>Nuevo producto</span>
            </button>
          </div>
        )}
      </div>

      {modalProducto && (
        <ProductoModal
          producto={modalProducto.producto}
          categorias={categorias}
          categoriaPreseleccionada={categoriaActiva !== 'todas' ? categoriaActiva : null}
          onClose={() => setModalProducto(null)}
          onSaved={() => { setModalProducto(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
