import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import ProveedorModal from './ProveedorModal';
import { notificar, confirmar } from '../notificaciones';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/proveedores/');
      setProveedores(data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const eliminar = async (proveedor) => {
    if (!(await confirmar(`¿Eliminar el proveedor "${proveedor.nombre}"?`))) return;
    try {
      await api.delete(`/proveedores/${proveedor.id}/`);
      cargarDatos();
    } catch (error) {
      const detalle = error.response?.data?.detail;
      notificar(detalle || 'No se pudo eliminar el proveedor.');
    }
  };

  return (
    <div className="productos-page">
      <header className="main-header">
        <h2>Proveedores</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="seccion-header">
          <h3>Tus proveedores</h3>
          <button type="button" className="btn-vibrante" onClick={() => setModal({ proveedor: null })}>
            + Nuevo proveedor
          </button>
        </div>

        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : proveedores.length === 0 ? (
          <div className="estado-vacio">
            <p>Todavía no cargaste ningún proveedor.</p>
            <button type="button" className="btn-vibrante" onClick={() => setModal({ proveedor: null })}>
              Cargar el primero
            </button>
          </div>
        ) : (
          <div className="productos-grid">
            {proveedores.map((prov) => (
              <div key={prov.id} className="producto-card">
                <div className="producto-info" style={{ padding: 18 }}>
                  <h4>{prov.nombre}</h4>
                  {prov.telefono && <p className="producto-descripcion">📞 {prov.telefono}</p>}
                  {prov.email && <p className="producto-descripcion">✉️ {prov.email}</p>}
                  {prov.direccion && <p className="producto-descripcion">📍 {prov.direccion}</p>}
                  <div className="producto-footer">
                    <span />
                    <div className="producto-acciones">
                      <button type="button" onClick={() => setModal({ proveedor: prov })}>✎</button>
                      <button type="button" onClick={() => eliminar(prov)}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" className="producto-card producto-card-nueva" onClick={() => setModal({ proveedor: null })}>
              <span className="producto-card-nueva-icono">+</span>
              <span>Nuevo proveedor</span>
            </button>
          </div>
        )}
      </div>

      {modal && (
        <ProveedorModal
          proveedor={modal.proveedor}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
