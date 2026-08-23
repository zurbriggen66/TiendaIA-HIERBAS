import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTienda } from './TiendaContext';
import { aclararColor, colorContraste } from '../utils/colores';
import NavBar from './NavBar';
import CarritoDrawer from './CarritoDrawer';
import CuentaModal from './CuentaModal';

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
    cliente, setCliente, cerrarSesion, mostrarCuenta, abrirCuenta, cerrarCuenta,
  } = useTienda();

  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
  };

  const pedirPorWhatsapp = () => {
    if (items.length > 0) abrirCarrito();
    else document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="cliente-container" style={{ ...estiloTema, ...(totalItems > 0 ? { paddingBottom: 76 } : null) }}>
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

      {totalItems > 0 && (
        <button type="button" className="carrito-barra-flotante" onClick={abrirCarrito}>
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
