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

  const totalActivos = productos.filter((p) => p.activo).length;
  const totalOcultos = productos.length - totalActivos;
  const totalDestacados = productos.filter((p) => p.destacado).length;
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
        {!cargando && (
          <div className="resumen-grid">
            <div className="resumen-tile resumen-tile-total">
              <span>Total de productos</span>
              <strong>{productos.length}</strong>
            </div>
            <div className="resumen-tile resumen-tile-servicios">
              <span>Visibles en la tienda</span>
              <strong>{totalActivos}</strong>
            </div>
            <div className="resumen-tile resumen-tile-otros">
              <span>Ocultos</span>
              <strong>{totalOcultos}</strong>
            </div>
            <div className="resumen-tile resumen-tile-sueldos">
              <span>Destacados</span>
              <strong>{totalDestacados}</strong>
            </div>
          </div>
        )}

        {!cargando && conteoPorCategoria.length > 0 && (
          <div className="stock-grid">
            {conteoPorCategoria.map(({ categoria, cantidad }) => (
              <div key={categoria.id} className="stock-card">
                <span className="stock-card-nombre">{categoria.nombre}</span>
                <strong className="stock-card-cantidad">{cantidad}</strong>
                <span className="stock-card-unidad">producto{cantidad === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        )}

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
                <div key={prod.id} className="producto-card">
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
                        <button type="button" onClick={() => setModalProducto({ producto: prod })}>✎</button>
                        <button type="button" onClick={() => eliminarProducto(prod)}>🗑</button>
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
