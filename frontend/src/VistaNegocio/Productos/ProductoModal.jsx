import React, { useState } from 'react';
import api from '../../services/api';

export default function ProductoModal({ producto, categorias, categoriaPreseleccionada, onClose, onSaved }) {
  const [nombre, setNombre] = useState(producto ? producto.nombre : '');
  const [descripcion, setDescripcion] = useState(producto ? producto.descripcion : '');
  const [contenido, setContenido] = useState(producto ? producto.contenido : '');
  const [precioBase, setPrecioBase] = useState(producto ? producto.precio_base ?? '' : '');
  const [precioGranel, setPrecioGranel] = useState(producto ? producto.precio_granel ?? '' : '');
  const [categoriaId, setCategoriaId] = useState(
    producto ? producto.categoria : (categoriaPreseleccionada || (categorias[0] && categorias[0].id) || '')
  );
  const [destacado, setDestacado] = useState(producto ? producto.destacado : false);
  const [activo, setActivo] = useState(producto ? producto.activo : true);
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const categoriaSeleccionada = categorias.find((c) => String(c.id) === String(categoriaId));
  const categoriaUsaEscalones = categoriaSeleccionada && categoriaSeleccionada.escalones && categoriaSeleccionada.escalones.length > 0;

  const previewImagen = imagen ? URL.createObjectURL(imagen) : (producto ? producto.imagen : null);

  const prevenirNavegador = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setImagen(e.dataTransfer.files[0]);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !categoriaId) {
      alert('Completá al menos el nombre y la categoría.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('descripcion', descripcion);
    formData.append('contenido', contenido);
    formData.append('categoria', categoriaId);
    formData.append('destacado', destacado);
    formData.append('activo', activo);
    if (precioBase !== '') formData.append('precio_base', precioBase);
    if (precioGranel !== '') formData.append('precio_granel', precioGranel);
    if (imagen) formData.append('imagen', imagen);

    setGuardando(true);
    try {
      if (producto) {
        await api.patch(`/productos/${producto.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/productos/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      alert('Hubo un problema al guardar el producto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{producto ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Manzanilla"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="input-vibrante"
              rows={3}
              placeholder="Detalle del producto..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contenido / presentación</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder='Ej: "Pack x10 (500g c/u)", "Bolsa 30g"'
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="input-vibrante" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Precio propio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder="0.00"
                value={precioBase}
                onChange={(e) => setPrecioBase(e.target.value)}
                disabled={categoriaUsaEscalones}
              />
              <p className="form-ayuda">
                {categoriaUsaEscalones
                  ? 'Esta categoría ya tiene precios por volumen cargados: el precio sale de ahí, no de este campo.'
                  : 'Se usa porque esta categoría todavía no tiene precios por volumen.'}
              </p>
            </div>
          </div>

          {categoriaSeleccionada && Number(categoriaSeleccionada.granel_cantidad_minima) > 0 && (
            <div className="form-group">
              <label className="form-label">Precio a granel</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder="0.00"
                value={precioGranel}
                onChange={(e) => setPrecioGranel(e.target.value)}
              />
              <p className="form-ayuda">
                Precio por unidad cuando el pedido de esta categoría llega al mínimo a granel ({categoriaSeleccionada.granel_cantidad_minima}
                {' '}{categoriaSeleccionada.unidad_medida} en total, {categoriaSeleccionada.granel_cantidad_minima_variedad} por variedad).
                Dejalo vacío si este producto no tiene precio a granel propio.
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input type="checkbox" checked={destacado} onChange={(e) => setDestacado(e.target.checked)} />
              <span>⭐ Marcar como destacado</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <span>Visible en la tienda</span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Imagen</label>
            <label className="upload-box upload-box-vibrante" onDragOver={prevenirNavegador} onDrop={handleDrop}>
              {previewImagen ? (
                <img src={previewImagen} alt="Preview" className="upload-preview" />
              ) : (
                <div className="upload-icon">📷</div>
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
              {guardando ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
