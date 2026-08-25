import React, { useState } from 'react';
import api from '../../services/api';
import { notificar } from '../notificaciones';

export default function ProveedorModal({ proveedor, onClose, onSaved }) {
  const [nombre, setNombre] = useState(proveedor ? proveedor.nombre : '');
  const [telefono, setTelefono] = useState(proveedor ? proveedor.telefono : '');
  const [email, setEmail] = useState(proveedor ? proveedor.email : '');
  const [direccion, setDireccion] = useState(proveedor ? proveedor.direccion : '');
  const [nota, setNota] = useState(proveedor ? proveedor.nota : '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      notificar('Ponele un nombre al proveedor.');
      return;
    }
    const datos = { nombre: nombre.trim(), telefono, email, direccion, nota };

    setGuardando(true);
    try {
      if (proveedor) {
        await api.patch(`/proveedores/${proveedor.id}/`, datos);
      } else {
        await api.post('/proveedores/', datos);
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar el proveedor:', error);
      notificar('Hubo un problema al guardar el proveedor.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Distribuidora del Valle"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input type="tel" className="input-vibrante" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input-vibrante" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input type="text" className="input-vibrante" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Nota</label>
            <textarea className="input-vibrante" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
