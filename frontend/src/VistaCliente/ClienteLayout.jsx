import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTienda } from './TiendaContext';
import { aclararColor, colorContraste } from '../utils/colores';
import NavBar from './NavBar';
import CarritoDrawer from './CarritoDrawer';
import CuentaModal from './CuentaModal';
import IconoWhatsapp from './IconoWhatsapp';

function Preloader({ configuracion }) {
  return (
    <div className="preloader-pantalla">
      {configuracion.logo_precarga && (
        <img src={configuracion.logo_precarga} alt="Cargando" className="preloader-logo" fetchPriority="high" decoding="async" />
      )}
      <div className="preloader-barra">
        <div className="preloader-barra-relleno" />
      </div>
      <style>{`
        .preloader-pantalla { position: fixed; inset: 0; background: #eaf0e6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; z-index: 9999; }
        .preloader-logo { width: 72px; height: 72px; object-fit: contain; animation: preloaderPulso 1.2s ease-in-out infinite; }
        @keyframes preloaderPulso { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.7; } }
        .preloader-barra { width: 160px; height: 4px; border-radius: 999px; background: rgba(26, 54, 27, 0.12); overflow: hidden; }
        .preloader-barra-relleno { width: 40%; height: 100%; border-radius: 999px; background: linear-gradient(135deg, #2f4f30, #1a361b); animation: preloaderDeslizar 1.1s ease-in-out infinite; }
        @keyframes preloaderDeslizar { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
      `}</style>
    </div>
  );
}

export default function ClienteLayout() {
  const {
    configuracion, cargando, totalItems, items, categorias,
    carritoAbierto, abrirCarrito, cerrarCarrito, cambiarCantidad, quitarDelCarrito, vaciarCarrito,
    toast, limpiarToast,
    cliente, setCliente, cerrarSesion, mostrarCuenta, abrirCuenta, cerrarCuenta,
  } = useTienda();

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(limpiarToast, 2200);
    return () => clearTimeout(id);
  }, [toast, limpiarToast]);

  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Alto real de la barra flotante "Ver mi pedido" (cambia según pantalla/breakpoint):
  // se mide en vez de adivinarlo, así cualquier otra barra fija de una página (ej. el
  // "Agregar al carrito" del detalle de producto) puede apilarse arriba sin superponerse.
  const barraCarritoRef = useRef(null);
  const [alturaBarraCarrito, setAlturaBarraCarrito] = useState(0);
  useEffect(() => {
    const el = barraCarritoRef.current;
    if (!el) {
      setAlturaBarraCarrito(0);
      return;
    }
    // getBoundingClientRect (no entry.contentRect: ese excluye el padding, y esta barra
    // tiene padding vertical propio que hay que contar para que no queden pisadas).
    const observer = new ResizeObserver(() => setAlturaBarraCarrito(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
    // `cargando` en las dependencias por la misma razón que en el efecto de abajo: si el
    // carrito ya tenía ítems guardados antes de que termine de cargar, `totalItems > 0`
    // no cambia al terminar y el efecto nunca se repetiría para encontrar el botón real.
  }, [totalItems > 0, cargando]);

  // Alto de la barra fija propia de la página actual, si tiene una (ej. el "Agregar al
  // carrito" del detalle de producto, marcada con data-barra-fija-pagina) — así el botón
  // flotante de WhatsApp no queda tapado por ninguna de las dos.
  const [alturaBarraPagina, setAlturaBarraPagina] = useState(0);
  useEffect(() => {
    const el = document.querySelector('[data-barra-fija-pagina]');
    if (!el) {
      setAlturaBarraPagina(0);
      return;
    }
    const observer = new ResizeObserver(() => setAlturaBarraPagina(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
    // `cargando` entra en las dependencias a propósito: mientras carga se muestra el
    // Preloader (sin Outlet todavía), así que la primera vez que este efecto corre la
    // barra de la página no existe. Sin `cargando` acá, el efecto nunca se repetiría al
    // terminar de cargar y quedaría pegado en 0 para siempre en una carga directa.
  }, [pathname, cargando]);

  if (cargando) return <Preloader configuracion={configuracion} />;

  const colorAcentoClaro = aclararColor(configuracion.color_acento);
  const estiloTema = {
    '--navbar-bg': configuracion.color_navbar,
    '--bg': configuracion.color_fondo,
    '--surface': configuracion.color_superficie,
    '--accent': configuracion.color_acento,
    '--accent-light': colorAcentoClaro,
    '--accent-gradient': `linear-gradient(135deg, ${colorAcentoClaro}, ${configuracion.color_acento})`,
    '--boton-agregar': configuracion.color_boton_agregar,
    '--boton-agregar-texto': colorContraste(configuracion.color_boton_agregar),
    '--altura-barra-carrito': `${alturaBarraCarrito}px`,
    '--altura-barra-pagina': `${alturaBarraPagina}px`,
  };

  const pedirPorWhatsapp = () => {
    if (items.length > 0) abrirCarrito();
    else document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="cliente-container" style={{ ...estiloTema, ...(totalItems > 0 ? { paddingBottom: alturaBarraCarrito } : null) }}>
      <NavBar
        configuracion={configuracion}
        totalItems={totalItems}
        onPedir={pedirPorWhatsapp}
        cliente={cliente}
        onAbrirCuenta={abrirCuenta}
        onCerrarSesion={cerrarSesion}
      />

      {!configuracion.tienda_abierta && (
        <div className="tienda-cerrada-aviso">
          <span className="tienda-cerrada-aviso-icono" aria-hidden="true">😴</span>
          <div>
            <strong>En este momento estamos cerrados</strong>
            <p>{configuracion.mensaje_cerrado || 'Volvemos pronto, gracias por tu paciencia.'}</p>
          </div>
        </div>
      )}

      <Outlet />

      {configuracion.whatsapp && (
        <a
          href={`https://wa.me/${configuracion.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-flotante"
          aria-label="Escribinos por WhatsApp"
        >
          <IconoWhatsapp />
        </a>
      )}

      {toast && (
        <div className="toast-agregado" key={toast.key} role="status">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          {toast.mensaje}
        </div>
      )}

      {totalItems > 0 && (
        <button type="button" className="carrito-barra-flotante" onClick={abrirCarrito} ref={barraCarritoRef}>
          <span className="carrito-barra-info">
            <span className="carrito-barra-badge">{totalItems}</span>
            Ver mi pedido
          </span>
        </button>
      )}

      {carritoAbierto && (
        <CarritoDrawer
          items={items}
          categorias={categorias}
          logoPrecarga={configuracion.logo_precarga}
          whatsapp={configuracion.whatsapp}
          tiendaAbierta={configuracion.tienda_abierta}
          mensajeCerrado={configuracion.mensaje_cerrado}
          onClose={cerrarCarrito}
          onCambiarCantidad={cambiarCantidad}
          onQuitar={quitarDelCarrito}
          onVaciar={vaciarCarrito}
          cliente={cliente}
          onClienteActualizado={setCliente}
        />
      )}

      {mostrarCuenta && (
        <CuentaModal onClose={cerrarCuenta} onIngreso={setCliente} />
      )}
    </div>
  );
}
