import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { METODOS_PAGO } from '../../utils/metodosPago';
import { notificar } from '../notificaciones';

export default function GastoModal({ onClose, onSaved }) {
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/categorias-gasto/')
      .then(({ data }) => {
        setCategorias(data);
        if (data[0]) setCategoria(data[0].nombre);
      })
      .catch((error) => console.error('Error al cargar categorías de gasto:', error));
  }, []);

  const crearCategoria = async () => {
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;
    try {
      const { data } = await api.post('/categorias-gasto/', { nombre });
      setCategorias((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCategoria(data.nombre);
      setNuevaCategoria('');
      setMostrarNueva(false);
    } catch (error) {
      console.error('Error al crear la categoría:', error);
      notificar('No se pudo crear la categoría (¿ya existe una con ese nombre?).');
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!categoria) {
      notificar('Elegí una categoría (o creá una).');
      return;
    }
    if (!descripcion.trim() || !monto) {
      notificar('Completá al menos la descripción y el monto.');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/gastos/', {
        categoria,
        descripcion: descripcion.trim(),
        monto,
        metodo_pago: metodoPago,
      });
      onSaved();
    } catch (error) {
      console.error('Error al guardar el gasto:', error);
      notificar('Hubo un problema al guardar el gasto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nuevo gasto</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            {mostrarNueva ? (
              <div className="form-row">
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="Nombre de la categoría (ej: Publicidad)"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  autoFocus
                />
                <button type="button" className="btn-vibrante" onClick={crearCategoria}>Crear</button>
                <button type="button" className="btn-secundario" onClick={() => { setMostrarNueva(false); setNuevaCategoria(''); }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="form-row">
                <select className="input-vibrante" value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ flex: 1 }}>
                  {categorias.length === 0 && <option value="">—</option>}
                  {categorias.map((c) => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
                <button type="button" className="btn-secundario" onClick={() => setMostrarNueva(true)}>+ Nueva</button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Pauta en Instagram"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">¿Con qué lo pagaste?</label>
              <select className="input-vibrante" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
