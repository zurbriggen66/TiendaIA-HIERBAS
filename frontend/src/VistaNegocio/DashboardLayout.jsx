import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api, { guardarTokenAdmin } from '../services/api';
import { obtenerConfigImpresion, imprimirPedido } from '../utils/impresion';
import NotificacionesHost from './NotificacionesHost';

const INTERVALO_CONSULTA_MS = 15000;

function reproducirSonidoAviso() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();

    const tono = (frecuencia, inicio, duracion) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + inicio);
      gain.gain.setValueAtTime(0.16, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracion);
    };
    tono(880, 0, 0.3);
    tono(660, 0.15, 0.3);
  } catch (error) {
    console.error('No se pudo reproducir el sonido de aviso:', error);
  }
}

const linkClass = ({ isActive }) => `menu-item${isActive ? ' active' : ''}`;

// Cada ítem del menú con su ícono (Material Symbols, ya cargado por index.css).
const Item = ({ to, icono, children, end }) => (
  <NavLink to={to} end={end} className={linkClass}>
    <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
    <span className="menu-item-texto">{children}</span>
  </NavLink>
);

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [pedidosNuevos, setPedidosNuevos] = useState(0);
  const [toast, setToast] = useState(null);
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const idsVistos = useRef(new Set());
  const primeraConsulta = useRef(true);

  useEffect(() => {
    let activo = true;

    const consultarPedidos = async () => {
      try {
        // Un pedido nuevo siempre entra dentro de las últimas 24hs: mirar el historial
        // completo cada 15 segundos (y en todas las pantallas del admin) era el gasto
        // más grande de la app y crecía con cada pedido acumulado.
        const { data } = await api.get('/pedidos/', { params: { ultimas_horas: 24, page_size: 100 } });
        if (!activo) return;

        const pedidosRecientes = data.results;

        if (primeraConsulta.current) {
          pedidosRecientes.forEach((p) => idsVistos.current.add(p.id));
          primeraConsulta.current = false;
          return;
        }

        const nuevos = pedidosRecientes.filter((p) => !idsVistos.current.has(p.id));
        if (nuevos.length > 0) {
          nuevos.forEach((p) => idsVistos.current.add(p.id));
          reproducirSonidoAviso();
          setPedidosNuevos((n) => n + nuevos.length);
          setToast(nuevos[0]);
          setTimeout(() => setToast((actual) => (actual === nuevos[0] ? null : actual)), 7000);

          if (obtenerConfigImpresion().autoImprimir) {
            nuevos.forEach((p) => imprimirPedido(p));
          }
        }
      } catch (error) {
        console.error('Error al chequear pedidos nuevos:', error);
      }
    };

    consultarPedidos();
    const intervalo = setInterval(consultarPedidos, INTERVALO_CONSULTA_MS);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === '/admin/pedidos') {
      setPedidosNuevos(0);
    }
    setSidebarAbierta(false);
  }, [location.pathname]);

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  const irAPedidos = () => {
    setToast(null);
    navigate('/admin/pedidos');
  };

  const cerrarSesionAdmin = () => {
    guardarTokenAdmin(null);
    window.location.href = '/admin';
  };

  return (
    <div className="dashboard-container">
      <button
        type="button"
        className="sidebar-toggle-mobil"
        onClick={() => setSidebarAbierta((v) => !v)}
        aria-label="Abrir menú"
      >
        <span className="material-symbols-outlined" aria-hidden="true">{sidebarAbierta ? 'close' : 'menu'}</span>
      </button>

      {sidebarAbierta && <div className="sidebar-backdrop" onClick={() => setSidebarAbierta(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarAbierta ? ' sidebar-abierta' : ''}`}>
        <div className="sidebar-brand">
          <span className="material-symbols-outlined sidebar-brand-icono" aria-hidden="true">eco</span>
          <span className="sidebar-brand-texto">
            <strong>Hierbas La Paz</strong>
            <span>Admin</span>
          </span>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-section-title">Inicio</div>
          <Item to="/admin/inicio" icono="home">Inicio</Item>

          <div className="menu-section-title">Gestión</div>
          <Item to="/admin/categorias" icono="category">Categorías</Item>
          <Item to="/admin/productos" icono="inventory_2">Productos &amp; Stock</Item>
          <Item to="/admin/precios" icono="sell">Lista de Precios</Item>
          <Item to="/admin/estadisticas" icono="monitoring">Estadísticas</Item>
          <Item to="/admin" end icono="palette">Diseño &amp; Colores</Item>
          <NavLink to="/admin/pedidos" className={linkClass}>
            <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
            <span className="menu-item-texto">Ventas &amp; Pedidos</span>
            {pedidosNuevos > 0 && <span className="sidebar-badge">{pedidosNuevos}</span>}
          </NavLink>
          <Item to="/admin/gastos" icono="account_balance_wallet">Gastos</Item>
          <Item to="/admin/proveedores" icono="local_shipping">Proveedores</Item>
          <Item to="/admin/compras" icono="shopping_cart">Compras</Item>
          <Item to="/admin/impresion" icono="print">Impresión</Item>
        </nav>

        <div className="sidebar-footer">
          <a href="/" className="menu-item menu-item-externa">
            <span className="material-symbols-outlined" aria-hidden="true">storefront</span>
            <span className="menu-item-texto">Ver tienda online</span>
          </a>
          <button type="button" className="menu-item menu-item-externa sidebar-cerrar-sesion" onClick={cerrarSesionAdmin}>
            <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            <span className="menu-item-texto">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="main-content">
        <Outlet />
      </main>

      <NotificacionesHost />

      {toast && (
        <div className="toast-pedido-nuevo" onClick={irAPedidos}>
          <span className="toast-pedido-nuevo-icono">🔔</span>
          <div className="toast-pedido-nuevo-info">
            <strong>Nuevo pedido{toast.cliente ? ` de ${toast.cliente}` : ''}</strong>
            <span>
              {toast.tipo_entrega === 'envio' ? '🚚 Envío' : '🏬 Retiro en local'} · {formatearPrecio(toast.total)}
            </span>
          </div>
          <button
            type="button"
            className="toast-pedido-nuevo-cerrar"
            onClick={(e) => { e.stopPropagation(); setToast(null); }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
