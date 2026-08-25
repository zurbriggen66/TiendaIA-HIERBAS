import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import CategoriaModal from './CategoriaModal';
import { notificar, confirmar } from '../notificaciones';

const ETIQUETA_UNIDAD = { kg: 'Kilogramo', pack: 'Pack', caja: 'Caja', unidad: 'Unidad' };

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalCategoria, setModalCategoria] = useState(null); // { categoria: null|obj }

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/categorias/');
      setCategorias(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const eliminarCategoria = async (categoria) => {
    if (!(await confirmar(`¿Eliminar la categoría "${categoria.nombre}"?`))) return;
    try {
      await api.delete(`/categorias/${categoria.id}/`);
      cargarDatos();
    } catch (error) {
      const detalle = error.response?.data?.detail;
      notificar(detalle || 'No se pudo eliminar la categoría.');
    }
  };

  return (
    <div className="productos-page">
      <header className="main-header">
        <h2>Categorías</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="seccion-header">
          <h3>Categorías del catálogo</h3>
          <button type="button" className="btn-vibrante" onClick={() => setModalCategoria({ categoria: null })}>
            + Nueva categoría
          </button>
        </div>

        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : categorias.length === 0 ? (
          <div className="estado-vacio">
            <p>Todavía no creaste ninguna categoría.</p>
            <button type="button" className="btn-vibrante" onClick={() => setModalCategoria({ categoria: null })}>
              Crear la primera categoría
            </button>
          </div>
        ) : (
          <div className="productos-grid">
            {categorias.map((cat) => (
              <div key={cat.id} className="producto-card">
                {!cat.activa && <span className="badge-extra">Oculta</span>}
                <div className="producto-imagen-wrap">
                  {cat.imagen ? (
                    <img src={cat.imagen} alt={cat.nombre} className="producto-imagen" />
                  ) : (
                    <div className="producto-imagen-placeholder">🌿</div>
                  )}
                </div>
                <div className="producto-info">
                  <span className="producto-categoria-tag">{ETIQUETA_UNIDAD[cat.unidad_medida] || cat.unidad_medida}</span>
                  <h4>{cat.nombre}</h4>
                  {cat.descripcion && <p className="producto-descripcion">{cat.descripcion}</p>}
                  {Number(cat.cantidad_minima) > 0 && (
                    <p className="form-ayuda" style={{ margin: 0 }}>
                      Mínimo de compra: {cat.cantidad_minima} {cat.unidad_medida}
                    </p>
                  )}
                  {cat.escalones.length > 0 ? (
                    <div className="producto-escalones" style={{ marginTop: 4 }}>
                      {cat.escalones.map((e) => (
                        <span key={e.id}>
                          Desde {e.cantidad_desde}: <strong>{formatearPrecio(e.precio_unitario)}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="form-ayuda" style={{ margin: 0 }}>Sin precios por volumen — cada producto usa su precio propio.</p>
                  )}
                  <div className="producto-footer">
                    <span />
                    <div className="producto-acciones">
                      <button type="button" onClick={() => setModalCategoria({ categoria: cat })}>✎</button>
                      <button type="button" onClick={() => eliminarCategoria(cat)}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="producto-card producto-card-nueva"
              onClick={() => setModalCategoria({ categoria: null })}
            >
              <span className="producto-card-nueva-icono">+</span>
              <span>Nueva categoría</span>
            </button>
          </div>
        )}
      </div>

      {modalCategoria && (
        <CategoriaModal
          categoria={modalCategoria.categoria}
          onClose={() => setModalCategoria(null)}
          onSaved={() => { setModalCategoria(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
