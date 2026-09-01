import React, { useState } from 'react';
import api from '../../services/api';
import { notificar } from '../notificaciones';

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

let contadorFilaCantidadFija = 0;
const nuevaFilaCantidadFija = (c = {}) => ({
  key: ++contadorFilaCantidadFija,
  id: c.id ?? null,
  cantidad: c.cantidad ?? '',
});

export default function CategoriaModal({ categoria, onClose, onSaved }) {
  const [nombre, setNombre] = useState(categoria ? categoria.nombre : '');
  const [descripcion, setDescripcion] = useState(categoria ? categoria.descripcion : '');
  const [unidadMedida, setUnidadMedida] = useState(categoria ? categoria.unidad_medida : 'kg');
  const [cantidadMinima, setCantidadMinima] = useState(categoria ? categoria.cantidad_minima : 0);
  const [cantidadMinimaVariedad, setCantidadMinimaVariedad] = useState(categoria ? categoria.cantidad_minima_variedad : 0);
  const [granelCantidadMinima, setGranelCantidadMinima] = useState(categoria ? categoria.granel_cantidad_minima : 0);
  const [granelCantidadMinimaVariedad, setGranelCantidadMinimaVariedad] = useState(
    categoria ? categoria.granel_cantidad_minima_variedad : 0
  );
  const [activa, setActiva] = useState(categoria ? categoria.activa : true);
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filasEscalones, setFilasEscalones] = useState(
    categoria && categoria.escalones && categoria.escalones.length > 0
      ? categoria.escalones.map(nuevaFilaEscalon)
      : [nuevaFilaEscalon()]
  );
  const [escalonesEliminados, setEscalonesEliminados] = useState([]);
  const [ventaCantidadFija, setVentaCantidadFija] = useState(categoria ? categoria.venta_cantidad_fija : false);
  const [filasCantidadesFijas, setFilasCantidadesFijas] = useState(
    categoria && categoria.cantidades_fijas && categoria.cantidades_fijas.length > 0
      ? categoria.cantidades_fijas.map(nuevaFilaCantidadFija)
      : [nuevaFilaCantidadFija()]
  );
  const [cantidadesFijasEliminadas, setCantidadesFijasEliminadas] = useState([]);
  const [galeria, setGaleria] = useState(categoria && categoria.imagenes ? categoria.imagenes : []);
  const [galeriaNueva, setGaleriaNueva] = useState([]); // File[] elegidos ahora, todavía sin subir
  const [galeriaEliminada, setGaleriaEliminada] = useState([]); // ids existentes a borrar

  const previewImagen = imagen ? URL.createObjectURL(imagen) : (categoria ? categoria.imagen : null);

  const agregarFotosGaleria = (files) => {
    setGaleriaNueva((prev) => [...prev, ...Array.from(files)]);
  };

  const quitarFotoGaleriaExistente = (id) => {
    setGaleriaEliminada((prev) => [...prev, id]);
    setGaleria((prev) => prev.filter((img) => img.id !== id));
  };

  const quitarFotoGaleriaNueva = (indice) => {
    setGaleriaNueva((prev) => prev.filter((_, i) => i !== indice));
  };

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

  const actualizarFilaCantidadFija = (key, cambios) => {
    setFilasCantidadesFijas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  };

  const quitarFilaCantidadFija = (fila) => {
    if (fila.id) setCantidadesFijasEliminadas((prev) => [...prev, fila.id]);
    setFilasCantidadesFijas((prev) => prev.filter((f) => f.key !== fila.key));
  };

  const agregarFilaCantidadFija = () => {
    setFilasCantidadesFijas((prev) => [...prev, nuevaFilaCantidadFija()]);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      notificar('Ponele un nombre a la categoría.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('descripcion', descripcion);
    formData.append('unidad_medida', unidadMedida);
    formData.append('cantidad_minima', cantidadMinima || 0);
    formData.append('cantidad_minima_variedad', cantidadMinimaVariedad || 0);
    formData.append('granel_cantidad_minima', granelCantidadMinima || 0);
    formData.append('granel_cantidad_minima_variedad', granelCantidadMinimaVariedad || 0);
    formData.append('venta_cantidad_fija', ventaCantidadFija);
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

      await Promise.all(cantidadesFijasEliminadas.map((id) => api.delete(`/cantidades-fijas/${id}/`)));

      const filasCantidadesValidas = filasCantidadesFijas.filter((f) => f.cantidad !== '');
      await Promise.all(filasCantidadesValidas.map((f) => {
        const payload = { categoria: categoriaGuardada.id, cantidad: f.cantidad };
        return f.id
          ? api.patch(`/cantidades-fijas/${f.id}/`, payload)
          : api.post('/cantidades-fijas/', payload);
      }));

      await Promise.all(galeriaEliminada.map((id) => api.delete(`/imagenes-categoria/${id}/`)));

      // Un POST por archivo (no un endpoint de carga masiva): "elegir varias a la vez"
      // ya lo resuelve el <input multiple> del formulario, esto solo las sube en paralelo.
      await Promise.all(galeriaNueva.map((archivo) => {
        const fd = new FormData();
        fd.append('categoria', categoriaGuardada.id);
        fd.append('imagen', archivo);
        return api.post('/imagenes-categoria/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }));

      onSaved();
    } catch (error) {
      console.error('Error al guardar la categoría:', error);
      notificar('Hubo un problema al guardar la categoría.');
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
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            <p className="form-ayuda">
              Se muestra en un recuadro debajo de la imagen de la categoría. Usalo para explicar en palabras claras
              cómo se compra (ej: "Se vende de a 25, 50 o 100 unidades" o "Compra mínima 50 unidades, podés combinar
              variedades"). Podés usar varios renglones.
            </p>
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
            <label className="form-label">Precio a granel (opcional)</label>
            <p className="form-ayuda">
              Si cargás esto, cada producto de esta categoría puede tener un segundo precio ("Precio a granel" en el
              producto) que se aplica a TODO el pedido de esta categoría cuando junta el mínimo total de acá abajo Y
              cada variedad elegida llega al mínimo por variedad. Si una sola variedad no llega, se cobra el precio
              normal para todas. Dejalo en 0 si esta categoría no tiene precio a granel.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mínimo total para el precio a granel</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-vibrante"
                  value={granelCantidadMinima}
                  onChange={(e) => setGranelCantidadMinima(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mínimo por variedad para el precio a granel</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-vibrante"
                  value={granelCantidadMinimaVariedad}
                  onChange={(e) => setGranelCantidadMinimaVariedad(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input type="checkbox" checked={ventaCantidadFija} onChange={(e) => setVentaCantidadFija(e.target.checked)} />
              <span>Venta solo por cantidad fija (ej: Hierbas a Granel)</span>
            </label>
            <p className="form-ayuda">
              Si lo activás, en la tienda el cliente no puede pedir cualquier cantidad de esta categoría — solo puede
              elegir una de las cantidades de la lista de abajo. El precio de cada producto no cambia según cuál elija
              (siempre es su precio propio), lo único que cambia es que no vale cualquier número.
            </p>
          </div>

          {ventaCantidadFija && (
            <div className="form-group">
              <label className="form-label">Cantidades permitidas</label>
              <div className="pedido-filas">
                {filasCantidadesFijas.map((fila) => (
                  <div key={fila.key} className="pedido-fila">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-vibrante pedido-fila-cantidad"
                      placeholder="Ej: 25"
                      value={fila.cantidad}
                      onChange={(e) => actualizarFilaCantidadFija(fila.key, { cantidad: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="pedido-fila-quitar" onClick={() => quitarFilaCantidadFija(fila)} title="Quitar cantidad">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-agregar-fila" onClick={agregarFilaCantidadFija}>
                + Agregar cantidad
              </button>
            </div>
          )}

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

          <div className="form-group">
            <label className="form-label">Galería (varias fotos, opcional)</label>
            <p className="form-ayuda">
              Fotos extra de esta categoría (además de la de arriba) para que se note la calidad real — se muestran
              juntas en la página de la categoría. Podés elegir varias de una sola vez.
            </p>

            {(galeria.length > 0 || galeriaNueva.length > 0) && (
              <div className="galeria-categoria-grid">
                {galeria.map((img) => (
                  <div key={`existente-${img.id}`} className="galeria-categoria-item">
                    <img src={img.imagen} alt="" />
                    <button type="button" onClick={() => quitarFotoGaleriaExistente(img.id)} title="Quitar foto">✕</button>
                  </div>
                ))}
                {galeriaNueva.map((archivo, i) => (
                  <div key={`nueva-${i}`} className="galeria-categoria-item galeria-categoria-item-nueva">
                    <img src={URL.createObjectURL(archivo)} alt="" />
                    <button type="button" onClick={() => quitarFotoGaleriaNueva(i)} title="Quitar foto">✕</button>
                  </div>
                ))}
              </div>
            )}

            <label className="upload-box upload-box-vibrante">
              <div className="upload-icon">🖼️</div>
              <p className="upload-text">
                <span className="upload-link">Elegir fotos</span> (podés seleccionar varias a la vez)
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="input-file-hidden"
                onChange={(e) => { if (e.target.files && e.target.files.length > 0) agregarFotosGaleria(e.target.files); e.target.value = ''; }}
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
