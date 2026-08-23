import React, { useState } from 'react';

export default function NavBar({ configuracion, totalItems, onPedir, cliente, onAbrirCuenta, onCerrarSesion }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const scrollA = (id) => (e) => {
    e.preventDefault();
    setMenuAbierto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="nav-bar nav-bar-pro">
      <button
        type="button"
        className="nav-toggle-mobil"
        onClick={() => setMenuAbierto((v) => !v)}
        aria-label="Abrir menú"
      >
        {menuAbierto ? '✕' : '☰'}
      </button>

      <a href="#" className="nav-logo nav-logo-doble" onClick={scrollA('inicio')}>
        {configuracion.logo && <img src={configuracion.logo} alt="Logo" className="nav-logo-img" />}
        {configuracion.logo_secundario && (
          <img src={configuracion.logo_secundario} alt="Logo" className="nav-logo-img" />
        )}
      </a>

      <button type="button" className="nav-btn-carrito" onClick={onPedir} aria-label="Ver carrito">
        <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
        {totalItems > 0 && <span className="nav-btn-carrito-badge">{totalItems}</span>}
      </button>

      <div className={`nav-links${menuAbierto ? ' abierto' : ''}`}>
        <a href="#categorias" onClick={scrollA('categorias')}>Categorías</a>
        <a href="#menu" onClick={scrollA('menu')}>Catálogo</a>
        {configuracion.instagram && (
          <a href={configuracion.instagram} target="_blank" rel="noopener noreferrer" onClick={() => setMenuAbierto(false)}>Instagram</a>
        )}
        {cliente ? (
          <a
            href="#"
            className="nav-cuenta"
            onClick={(e) => { e.preventDefault(); setMenuAbierto(false); onCerrarSesion(); }}
            title="Cerrar sesión"
          >
            ⭐ {cliente.puntos} pts · {cliente.nombre.split(' ')[0]}
          </a>
        ) : (
          <a href="#" onClick={(e) => { e.preventDefault(); setMenuAbierto(false); onAbrirCuenta(); }}>Mi cuenta</a>
        )}
      </div>

      <style>{`
        .nav-bar-pro {
          display: grid !important;
          grid-template-columns: 1fr auto 1fr !important;
          align-items: center !important;
          padding: 12px 20px !important;
          background-color: var(--navbar-bg, #f2f7ef);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 1px 8px rgba(28, 28, 22, 0.06);
          gap: 15px 0;
          position: relative !important;
          z-index: 9999 !important;
        }

        .nav-bar-pro .nav-toggle-mobil {
          grid-column: 1 !important;
          grid-row: 1 !important;
          justify-self: start !important;
          background: transparent !important;
          border: 1px solid var(--border, #c3c8be) !important;
          color: var(--accent, #1a361b) !important;
          font-size: 22px !important;
          width: 44px !important;
          height: 44px !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
        }

        .nav-bar-pro .nav-logo {
          grid-column: 2 !important;
          grid-row: 1 !important;
          justify-self: center !important;
          display: flex !important;
          align-items: center;
        }

        .nav-logo-doble {
          gap: 14px !important;
        }

        .nav-logo-img {
          height: auto !important;
          width: 100% !important;
          max-height: 50px !important;
          max-width: 150px !important;
          object-fit: contain !important;
          border-radius: 0 !important;
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        .nav-bar-pro .nav-btn-carrito {
          grid-column: 3 !important;
          grid-row: 1 !important;
          justify-self: end !important;
          position: relative !important;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: var(--accent, #1a361b);
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: none;
        }

        .nav-btn-carrito-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 50%;
          background: var(--accent-gradient, linear-gradient(135deg, #2f4f30, #1a361b));
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        }

        .nav-bar-pro .nav-links {
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          width: 100% !important;
          background-color: var(--navbar-bg, #f2f7ef) !important;
          padding: 20px 0 30px 0 !important;
          box-shadow: 0 15px 20px rgba(28, 28, 22, 0.1) !important;
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 20px !important;
        }

        .nav-bar-pro .nav-links.abierto {
          display: flex !important;
        }

        .nav-bar-pro .nav-links a {
          color: var(--text, #1c1c16);
          font-weight: 600;
        }

        @media (max-width: 480px) {
          .nav-logo-img {
            max-height: 40px !important;
            max-width: 120px !important;
          }
          .nav-bar-pro {
            padding: 10px 15px !important;
          }
        }
      `}</style>
    </nav>
  );
}
