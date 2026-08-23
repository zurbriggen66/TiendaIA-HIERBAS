import React from 'react';

export default function Hero({ configuracion }) {
  const irACategorias = () => {
    document.getElementById('categorias')?.scrollIntoView({ behavior: 'smooth' });
  };

  const backendBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000';
  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
      return path;
    }
    return `${backendBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const videoSrc = getMediaUrl(configuracion.video_principal);
  const imageSrc = getMediaUrl(configuracion.imagen_principal);

  return (
    <header
      id="inicio"
      className="hero"
      style={{ position: 'relative', overflow: 'hidden', height: '60vh', minHeight: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 32 }}
    >
      {videoSrc ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source src={videoSrc} type="video/mp4" />
          Tu navegador no soporta videos HTML5.
        </video>
      ) : (
        <div
          className="hero-fondo"
          style={{
            backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundColor: 'var(--surface-2, #dee5da)',
          }}
        />
      )}

      {/* La foto se ve nítida arriba y se funde con el color de fondo de la página
          hacia abajo, donde vive el texto (igual que el diseño de referencia). */}
      <div
        className="hero-fade-abajo"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, var(--surface, #f2f7ef) 0%, rgba(242,247,239,0.4) 45%, rgba(242,247,239,0) 75%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      <div className="hero-contenido" style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        padding: '0 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        maxWidth: 480,
      }}>
        <h1 className="fuente-impacto" style={{
          fontSize: '2.6rem',
          color: 'var(--accent, #1a361b)',
          margin: 0,
          lineHeight: '1.15',
          filter: 'drop-shadow(0 2px 6px rgba(255,255,255,0.5))',
        }}>
          Hierbas Serranas La Paz
        </h1>
        <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-muted, #434841)' }}>
          Directo de fábrica. Auténticas hierbas de Traslasierra, Córdoba.
        </p>

        <button
          type="button"
          className="hero-cta-delicado"
          onClick={irACategorias}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '0.5rem',
            padding: '14px 32px',
            borderRadius: '999px',
            border: 'none',
            background: 'var(--accent, #1a361b)',
            boxShadow: '0 8px 20px -8px rgba(26, 54, 27, 0.5)',
            color: '#ffffff',
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '0.8rem',
            fontWeight: '600',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">menu_book</span>
          Ver catálogo mayorista
        </button>

        <style>
          {`
            .hero-cta-delicado:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 24px -6px rgba(26, 54, 27, 0.6);
            }
          `}
        </style>
      </div>
    </header>
  );
}
