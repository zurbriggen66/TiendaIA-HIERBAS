import React, { useState } from 'react';
import api from '../../services/api';

const UNIDADES = [
  { value: 'kg', label: 'Kilogramo' },
  { value: 'pack', label: 'Pack' },
  { value: 'caja', label: 'Caja' },
  { value: 'unidad', label: 'Unidad' },
];

let contadorFilaEscalon = 0;
const nuevaFilaEscalon = (e = {}) => ({
  key: ++contadorFilaEscalon,
  id: e.id ?? null,
  etiqueta: e.etiqueta || '',
  cantidad_desde: e.cantidad_desde ?? '',
  precio_unitario: e.precio_unitario ?? '',
});

export default function CategoriaModal({ categoria, onClose, onSaved }) {
  const [nombre, setNombre] = useState(categoria ? categoria.nombre : '');
  const [descripcion, setDescripcion] = useState(categoria ? categoria.descripcion : '');
  const [unidadMedida, setUnidadMedida] = useState(categoria ? categoria.unidad_medida : 'kg');
  const [cantidadMinima, setCantidadMinima] = useState(categoria ? categoria.cantidad_minima : 0);
  const [cantidadMinimaVariedad, setCantidadMinimaVariedad] = useState(categoria ? categoria.cantidad_minima_variedad : 0);
  const [activa, setActiva] = useState(categoria ? categoria.activa : true);
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filasEscalones, setFilasEscalones] = useState(
    categoria && categoria.escalones && categoria.escalones.length > 0
      ? categoria.escalones.map(nuevaFilaEscalon)
      : [nuevaFilaEscalon()]
  );
  const [escalonesEliminados, setEscalonesEliminados] = useState([]);

  const previewImagen = imagen ? URL.createObjectURL(imagen) : (categoria ? categoria.imagen : null);

  const prevenirNavegador = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setImagen(e.dataTransfer.files[0]);
  };

  const actualizarFilaEscalon = (key, cambios) => {
    setFilasEscalones((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  };

  const quitarFilaEscalon = (fila) => {
    if (fila.id) setEscalonesEliminados((prev) => [...prev, fila.id]);
    setFilasEscalones((prev) => prev.filter((f) => f.key !== fila.key));
  };

  const agregarFilaEscalon = () => {
    setFilasEscalones((prev) => [...prev, nuevaFilaEscalon()]);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ponele un nombre a la categoría.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('descripcion', descripcion);
    formData.append('unidad_medida', unidadMedida);
    formData.append('cantidad_minima', cantidadMinima || 0);
    formData.append('cantidad_minima_variedad', cantidadMinimaVariedad || 0);
    formData.append('activa', activa);
    if (imagen) formData.append('imagen', imagen);

    setGuardando(true);
    try {
      let categoriaGuardada;
      if (categoria) {
        const { data } = await api.patch(`/categorias/${categoria.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        categoriaGuardada = data;
      } else {
        const { data } = await api.post('/categorias/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        categoriaGuardada = data;
      }

      await Promise.all(escalonesEliminados.map((id) => api.delete(`/escalones-precio/${id}/`)));

      const filasValidas = filasEscalones.filter((f) => f.cantidad_desde !== '' && f.precio_unitario !== '');
      await Promise.all(filasValidas.map((f) => {
        const payload = {
          categoria: categoriaGuardada.id,
          etiqueta: f.etiqueta,
          cantidad_desde: f.cantidad_desde,
          precio_unitario: f.precio_unitario,
        };
        return f.id
          ? api.patch(`/escalones-precio/${f.id}/`, payload)
          : api.post('/escalones-precio/', payload);
      }));

      onSaved();
    } catch (error) {
      console.error('Error al guardar la categoría:', error);
      alert('Hubo un problema al guardar la categoría.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{categoria ? 'Editar categoría' : 'Nueva categoría'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Hierbas a Granel"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="input-vibrante"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unidad de medida</label>
              <select className="input-vibrante" value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)}>
                {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cantidad mínima de compra</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-vibrante"
                value={cantidadMinima}
                onChange={(e) => setCantidadMinima(e.target.value)}
              />
              <p className="form-ayuda">Se suma entre todas las variedades que el cliente elija de esta categoría.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mínimo por variedad (opcional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-vibrante"
              value={cantidadMinimaVariedad}
              onChange={(e) => setCantidadMinimaVariedad(e.target.value)}
            />
            <p className="form-ayuda">
              Si lo cargás, cada variedad que el cliente elija de esta categoría tiene que llegar sola a este mínimo
              (ej: al menos 10kg de cada hierba, no solo el total). Dejalo en 0 si no aplica.
            </p>
          </div>

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
              <span>Categoría activa (visible en la tienda)</span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Precios por volumen (opcional)</label>
            <p className="form-ayuda">
              A partir de cierta cantidad total de la categoría, todas las unidades pasan a costar el precio de ese
              escalón. Si no cargás ninguno, cada producto usa su propio precio.
            </p>
            <div className="pedido-filas">
              {filasEscalones.map((fila) => (
                <div key={fila.key} className="pedido-fila">
                  <input
                    type="text"
                    className="input-vibrante"
                    placeholder="Etiqueta (opcional)"
                    value={fila.etiqueta}
                    onChange={(e) => actualizarFilaEscalon(fila.key, { etiqueta: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-vibrante pedido-fila-cantidad"
                    placeholder="Desde"
                    value={fila.cantidad_desde}
                    onChange={(e) => actualizarFilaEscalon(fila.key, { cantidad_desde: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-vibrante pedido-fila-cantidad"
                    placeholder="Precio"
                    value={fila.precio_unitario}
                    onChange={(e) => actualizarFilaEscalon(fila.key, { precio_unitario: e.target.value })}
                  />
                  <button type="button" className="pedido-fila-quitar" onClick={() => quitarFilaEscalon(fila)} title="Quitar escalón">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-agregar-fila" onClick={agregarFilaEscalon}>
              + Agregar escalón
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Imagen</label>
            <label className="upload-box upload-box-vibrante" onDragOver={prevenirNavegador} onDrop={handleDrop}>
              {previewImagen ? (
                <img src={previewImagen} alt="Preview" className="upload-preview" />
              ) : (
                <div className="upload-icon">🌿</div>
              )}
              <p className="upload-text">
                {imagen ? (
                  <span className="upload-file-name">{imagen.name}</span>
                ) : (
                  <><span className="upload-link">Cargar imagen</span> o arrastrar y soltar</>
                )}
              </p>
              <input
                type="file"
                accept="image/*"
                className="input-file-hidden"
                onChange={(e) => { if (e.target.files && e.target.files[0]) setImagen(e.target.files[0]); }}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
