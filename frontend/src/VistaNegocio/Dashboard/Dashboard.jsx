import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';
import { notificar } from '../notificaciones';
import { limpiarNumeroWhatsapp } from '../../utils/whatsapp';

function CampoColor({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="color-picker-fila">
        <input
          type="color"
          className="color-picker-swatch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="input-vibrante"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [logo, setLogo] = useState(null);
  const [logoSecundario, setLogoSecundario] = useState(null);
  const [logoPrecarga, setLogoPrecarga] = useState(null);
  const [portada, setPortada] = useState(null);
  const [bannerMayorista, setBannerMayorista] = useState(null);
  const [quienesSomos, setQuienesSomos] = useState(null);
  const [qrCarta, setQrCarta] = useState(null);

  // Guardamos el ID para saber si tenemos que actualizar (PATCH) o crear (POST)
  const [configId, setConfigId] = useState(null);
  const [logoActivo, setLogoActivo] = useState(null);
  const [logoSecundarioActivo, setLogoSecundarioActivo] = useState(null);
  const [logoPrecargaActivo, setLogoPrecargaActivo] = useState(null);
  const [portadaActiva, setPortadaActiva] = useState(null);
  const [bannerMayoristaActivo, setBannerMayoristaActivo] = useState(null);
  const [quienesSomosActiva, setQuienesSomosActiva] = useState(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [instagramDescripcion, setInstagramDescripcion] = useState('');
  const [instagramSecundario, setInstagramSecundario] = useState('');
  const [instagramSecundarioDescripcion, setInstagramSecundarioDescripcion] = useState('');
  const [colorNavbar, setColorNavbar] = useState('#f2f7ef');
  const [colorFondo, setColorFondo] = useState('#eaf0e6');
  const [colorSuperficie, setColorSuperficie] = useState('#f2f7ef');
  const [colorAcento, setColorAcento] = useState('#1a361b');
  const [colorBotonAgregar, setColorBotonAgregar] = useState('#1a361b');

  // Traer las imágenes activas y el ID al cargar el panel
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const respuesta = await api.get('/configuracion/');
        if (respuesta.data && respuesta.data.length > 0) {
          const ultimaConfig = respuesta.data[respuesta.data.length - 1];
          setConfigId(ultimaConfig.id); // ¡Guardamos el ID del registro!
          setLogoActivo(ultimaConfig.logo);
          setLogoSecundarioActivo(ultimaConfig.logo_secundario);
          setLogoPrecargaActivo(ultimaConfig.logo_precarga);
          setPortadaActiva(ultimaConfig.imagen_principal);
          setBannerMayoristaActivo(ultimaConfig.imagen_banner_mayorista);
          setQuienesSomosActiva(ultimaConfig.imagen_quienes_somos);
          setWhatsapp(ultimaConfig.whatsapp || '');
          setInstagram(ultimaConfig.instagram || '');
          setInstagramDescripcion(ultimaConfig.instagram_descripcion || '');
          setInstagramSecundario(ultimaConfig.instagram_secundario || '');
          setInstagramSecundarioDescripcion(ultimaConfig.instagram_secundario_descripcion || '');
          setColorNavbar(ultimaConfig.color_navbar || '#f2f7ef');
          setColorFondo(ultimaConfig.color_fondo || '#eaf0e6');
          setColorSuperficie(ultimaConfig.color_superficie || '#f2f7ef');
          setColorAcento(ultimaConfig.color_acento || '#1a361b');
          setColorBotonAgregar(ultimaConfig.color_boton_agregar || '#1a361b');
        }
      } catch (error) {
        console.error("Error al cargar el panel:", error);
      }
    };
    obtenerDatos();
  }, []);

  // El QR apunta a la tienda tal cual se ve desde afuera (mismo dominio donde
  // se está viendo este panel), directo a la sección del menú.
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/#menu`, {
      width: 480,
      margin: 2,
      color: { dark: '#26382c', light: '#ffffff' },
    })
      .then(setQrCarta)
      .catch((error) => console.error('Error al generar el QR de la carta:', error));
  }, []);

  const descargarQr = () => {
    if (!qrCarta) return;
    const enlace = document.createElement('a');
    enlace.href = qrCarta;
    enlace.download = 'carta-qr.png';
    enlace.click();
  };

  const prevenirNavegador = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropLogo = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setLogo(e.dataTransfer.files[0]);
  };

  const handleDropLogoSecundario = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setLogoSecundario(e.dataTransfer.files[0]);
  };

  const handleDropLogoPrecarga = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setLogoPrecarga(e.dataTransfer.files[0]);
  };

  const handleDropPortada = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setPortada(e.dataTransfer.files[0]);
  };

  const handleDropBannerMayorista = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setBannerMayorista(e.dataTransfer.files[0]);
  };

  const handleDropQuienesSomos = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setQuienesSomos(e.dataTransfer.files[0]);
  };

  const guardarCambios = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    if (logo) formData.append('logo', logo);
    if (logoSecundario) formData.append('logo_secundario', logoSecundario);
    if (logoPrecarga) formData.append('logo_precarga', logoPrecarga);
    if (portada) formData.append('imagen_principal', portada);
    if (bannerMayorista) formData.append('imagen_banner_mayorista', bannerMayorista);
    if (quienesSomos) formData.append('imagen_quienes_somos', quienesSomos);
    formData.append('whatsapp', whatsapp);
    formData.append('instagram', instagram);
    formData.append('instagram_descripcion', instagramDescripcion);
    formData.append('instagram_secundario', instagramSecundario);
    formData.append('instagram_secundario_descripcion', instagramSecundarioDescripcion);
    formData.append('color_navbar', colorNavbar);
    formData.append('color_fondo', colorFondo);
    formData.append('color_superficie', colorSuperficie);
    formData.append('color_acento', colorAcento);
    formData.append('color_boton_agregar', colorBotonAgregar);

    try {
      if (configId) {
        // Si ya existe un registro, usamos PATCH para actualizar solo ese ID y no crear duplicados
        await api.patch(`/configuracion/${configId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Si no existe ninguno previo, usamos POST para crear el primero
        await api.post('/configuracion/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      notificar('¡Imágenes guardadas y actualizadas con éxito!', 'exito');
      // El toast ya no bloquea como alert() antes de recargar: le damos un momento a
      // la vista para que se alcance a leer el aviso antes de que la página recargue.
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error("Error al guardar:", error);
      notificar('Hubo un problema al guardar las imágenes.');
    }
  };

  // Lógica para previsualizar: si recién cargó un archivo, muestra ese. Si no, muestra el de la base de datos.
  const previewLogo = logo ? URL.createObjectURL(logo) : logoActivo;
  const previewLogoSecundario = logoSecundario ? URL.createObjectURL(logoSecundario) : logoSecundarioActivo;
  const previewLogoPrecarga = logoPrecarga ? URL.createObjectURL(logoPrecarga) : logoPrecargaActivo;
  const previewPortada = portada ? URL.createObjectURL(portada) : portadaActiva;
  const previewBannerMayorista = bannerMayorista ? URL.createObjectURL(bannerMayorista) : bannerMayoristaActivo;
  const previewQuienesSomos = quienesSomos ? URL.createObjectURL(quienesSomos) : quienesSomosActiva;

  return (
    <>
      <header className="main-header">
        <h2>Diseño del Sitio</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="form-card">
          <h3 className="form-card-title">Configuración Visual</h3>

          <form onSubmit={guardarCambios}>

            {/* Input de Logo */}
            <div className="form-group">
                <label className="form-label">Logo del negocio</label>
                <label 
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropLogo}
                >
                  {/* AQUÍ MOSTRAMOS LA IMAGEN EN VEZ DEL ÍCONO */}
                  {previewLogo ? (
                    <img src={previewLogo} alt="Preview Logo" className="upload-preview" />
                  ) : (
                    <div className="upload-icon">📁</div>
                  )}
                  
                  <p className="upload-text">
                    {logo ? (
                      <span className="upload-file-name">{logo.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">PNG o JPG (500x500px)</p>
                  
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    className="input-file-hidden"
                    onChange={(e) => {
                      if(e.target.files && e.target.files[0]) setLogo(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Input del segundo logo (este negocio muestra dos marcas juntas) */}
              <div className="form-group">
                <label className="form-label">Segundo logo (la otra marca)</label>
                <label
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropLogoSecundario}
                >
                  {previewLogoSecundario ? (
                    <img src={previewLogoSecundario} alt="Preview segundo logo" className="upload-preview" />
                  ) : (
                    <div className="upload-icon">📁</div>
                  )}

                  <p className="upload-text">
                    {logoSecundario ? (
                      <span className="upload-file-name">{logoSecundario.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">PNG o JPG (500x500px)</p>

                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    className="input-file-hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setLogoSecundario(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Input de Logo de la pantalla de carga */}
              <div className="form-group">
                <label className="form-label">Imagen de la pantalla de carga</label>
                <label
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropLogoPrecarga}
                >
                  {previewLogoPrecarga ? (
                    <img src={previewLogoPrecarga} alt="Preview logo de carga" className="upload-preview" />
                  ) : (
                    <div className="upload-icon">📁</div>
                  )}

                  <p className="upload-text">
                    {logoPrecarga ? (
                      <span className="upload-file-name">{logoPrecarga.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">
                    PNG sin fondo recomendado. Es lo primero que ve el cliente al entrar a la tienda.
                  </p>

                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    className="input-file-hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setLogoPrecarga(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Input de Portada */}
              <div className="form-group">
                <label className="form-label">Imagen principal (Portada)</label>
                <label 
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropPortada}
                >
                  {/* AQUÍ MOSTRAMOS LA IMAGEN DE PORTADA */}
                  {previewPortada ? (
                    <img src={previewPortada} alt="Preview Portada" className="upload-preview upload-preview-portada" />
                  ) : (
                    <div className="upload-icon">🖼️</div>
                  )}

                  <p className="upload-text">
                    {portada ? (
                      <span className="upload-file-name">{portada.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">Recomendado: 1920x1080px</p>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="input-file-hidden"
                    onChange={(e) => {
                      if(e.target.files && e.target.files[0]) setPortada(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Input del fondo del banner "Explorá nuestro catálogo" */}
              <div className="form-group">
                <label className="form-label">Fondo del banner "Explorá nuestro catálogo"</label>
                <label
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropBannerMayorista}
                >
                  {previewBannerMayorista ? (
                    <img src={previewBannerMayorista} alt="Preview banner mayorista" className="upload-preview" />
                  ) : (
                    <div className="upload-icon">🖼️</div>
                  )}

                  <p className="upload-text">
                    {bannerMayorista ? (
                      <span className="upload-file-name">{bannerMayorista.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">Formato cuadrado (1:1), ej. 1200x1200px</p>

                  <input
                    type="file"
                    accept="image/*"
                    className="input-file-hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setBannerMayorista(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Input de la imagen "¿Quiénes somos?" (reemplaza los 2 logos) */}
              <div className="form-group">
                <label className="form-label">Imagen "¿Quiénes somos?" (reemplaza los 2 logos)</label>
                <label
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropQuienesSomos}
                >
                  {previewQuienesSomos ? (
                    <img src={previewQuienesSomos} alt="Preview quiénes somos" className="upload-preview" />
                  ) : (
                    <div className="upload-icon">🖼️</div>
                  )}

                  <p className="upload-text">
                    {quienesSomos ? (
                      <span className="upload-file-name">{quienesSomos.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">Formato vertical (9:16), ej. 1080x1920px</p>

                  <input
                    type="file"
                    accept="image/*"
                    className="input-file-hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setQuienesSomos(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Colores de la vista del cliente */}
              <div className="form-group">
                <label className="form-label">Colores de la tienda</label>
                <p className="form-ayuda" style={{ marginTop: 0, marginBottom: 14 }}>
                  Así se ve hoy tu tienda. Cambiá cualquier color y guardá para aplicarlo.
                </p>
                <div className="colores-grid">
                  <CampoColor label="Fondo del navbar" value={colorNavbar} onChange={setColorNavbar} />
                  <CampoColor label="Fondo de la página" value={colorFondo} onChange={setColorFondo} />
                  <CampoColor label="Tarjetas de producto" value={colorSuperficie} onChange={setColorSuperficie} />
                  <CampoColor label="Botón &quot;Agregar al pedido&quot;" value={colorBotonAgregar} onChange={setColorBotonAgregar} />
                  <CampoColor label="Color de acento (detalles, degradés)" value={colorAcento} onChange={setColorAcento} />
                </div>
              </div>

              {/* Contacto */}
              <div className="form-group">
                <label className="form-label">WhatsApp (con código de país, sin espacios)</label>
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="5493511234567"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
                {whatsapp.trim() && (() => {
                  const limpio = limpiarNumeroWhatsapp(whatsapp);
                  return limpio.length < 10 || limpio.length > 15 ? (
                    <p className="form-ayuda" style={{ color: '#f59e0b' }}>
                      Este número no parece completo — tiene que ser código de país + código de área (sin el 0) + número,
                      sin espacios ni guiones. Para un celular argentino, agregá un 9 después del 54. Ej: 5493511234567.
                    </p>
                  ) : (
                    <p className="form-ayuda">
                      Se va a usar como: {limpio} (los espacios, guiones o el "+" se sacan solos al guardar).
                    </p>
                  );
                })()}
              </div>

              <div className="form-group">
                <label className="form-label">Instagram 1 — usuario o URL (va con el logo principal)</label>
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="@hierbas_serranas  o  https://www.instagram.com/hierbas_serranas/"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="Descripción (ej: Hierbas Serranas La Paz)"
                  value={instagramDescripcion}
                  onChange={(e) => setInstagramDescripcion(e.target.value)}
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instagram 2 — usuario o URL (va con el logo secundario)</label>
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="@hierbas_medicinales_cba  o  URL completa"
                  value={instagramSecundario}
                  onChange={(e) => setInstagramSecundario(e.target.value)}
                />
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="Descripción (ej: Hierbas Medicinales Córdoba)"
                  value={instagramSecundarioDescripcion}
                  onChange={(e) => setInstagramSecundarioDescripcion(e.target.value)}
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div className="form-actions-right">
                <button type="submit" className="btn-vibrante">
                  Guardar Cambios
                </button>
              </div>
            </form>
        </div>

        <div className="form-card qr-carta-card">
          <h3 className="form-card-title">Carta QR para el local</h3>
          <p className="qr-carta-texto">
            Imprimí este código y ponelo en las mesas: quien lo escanee entra directo al menú de la tienda,
            sin buscar nada. Sirve para pedir sentado en el local o para llevarse la carta a casa.
          </p>
          <div className="qr-carta-cuerpo">
            {qrCarta ? (
              <img src={qrCarta} alt="Código QR de la carta" className="qr-carta-imagen" />
            ) : (
              <div className="qr-carta-imagen qr-carta-cargando">Generando...</div>
            )}
            <button type="button" className="btn-vibrante" onClick={descargarQr} disabled={!qrCarta}>
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </>
  );
}