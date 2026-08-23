import React from 'react';

const ENLACE_CREAR_TIENDA = 'https://www.instagram.com/tiendaia_arg';

export default function Footer({ configuracion }) {
  return (
    <footer style={{
      // Fondo verde salvia suave, con profundidad radial.
      background: 'radial-gradient(ellipse at top, #324a3a 0%, #1a2820 80%)',
      padding: '50px 20px 30px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '25px',
      // Borde superior brillante muy sutil y sombra hacia arriba
      borderTop: '1px solid rgba(140, 170, 120, 0.25)',
      boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.8)',
      marginTop: '40px',
      position: 'relative'
    }}>
      
      {/* 1. Logos del negocio (las dos marcas), con efecto de resplandor */}
      {(configuracion?.logo || configuracion?.logo_secundario) && (
        <div style={{ marginBottom: '10px', display: 'flex', gap: '16px' }}>
          {[configuracion.logo, configuracion.logo_secundario].filter(Boolean).map((src) => (
            <img
              key={src}
              src={src}
              alt="Logo"
              style={{
                width: '110px',
                height: '110px',
                objectFit: 'contain',
                borderRadius: '50%',
                backgroundColor: '#0a0a0a',
                padding: '12px',
                boxShadow: '0 0 25px rgba(140, 170, 120, 0.18), inset 0 0 15px rgba(140, 170, 120, 0.12)',
                border: '1px solid rgba(140, 170, 120, 0.15)',
              }}
            />
          ))}
        </div>
      )}

      {/* 2. Botón de Instagram Brillante */}
      {configuracion?.instagram && (
        <a 
          href={configuracion.instagram} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #aac398 0%, #8caa78 100%)',
            color: '#ffffff',
            padding: '14px',
            borderRadius: '50%',
            textDecoration: 'none',
            boxShadow: '0 0 20px rgba(140, 170, 120, 0.5), 0 4px 10px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease',
            border: '1px solid #aac398'
          }}
          onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(140, 170, 120, 0.8)'; }}
          onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(140, 170, 120, 0.5), 0 4px 10px rgba(0,0,0,0.5)'; }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
      )}

      {/* 3. Nota discreta: invitación a crear una tienda propia (sin competir con la marca) */}
      <a
        href={ENLACE_CREAR_TIENDA}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: '100%',
          maxWidth: '340px',
          marginTop: '10px',
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'rgba(140, 170, 120, 0.08)',
          textDecoration: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
          textAlign: 'center',
          border: '1px solid rgba(140, 170, 120, 0.28)',
          transition: 'background 0.2s ease, border-color 0.2s ease',
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(140, 170, 120, 0.14)'; e.currentTarget.style.borderColor = 'rgba(140, 170, 120, 0.45)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(140, 170, 120, 0.08)'; e.currentTarget.style.borderColor = 'rgba(140, 170, 120, 0.28)'; }}
      >
        <span style={{ color: '#aac398', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '-0.005em' }}>
          ¿Querés una tienda como esta para tu negocio?
        </span>
        <span style={{ color: 'rgba(245,237,231,0.5)', fontSize: '0.76rem' }}>
          Escribinos y te contamos cómo →
        </span>
      </a>

      {/* 4. Sección de Desarrollo: TiendaIA Premium */}
      <div style={{
        marginTop: '15px',
        paddingTop: '25px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        width: '100%',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ 
          color: '#555555', 
          fontSize: '0.75rem', 
          textTransform: 'uppercase', 
          letterSpacing: '2px',
          fontWeight: 'bold'
        }}>
          Desarrollado por
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '900',
          fontSize: '1.4rem',
          letterSpacing: '0.5px'
        }}>
          {/* Ícono de TiendaIA con resplandor — se deja en el naranja de marca de
              TiendaIA a propósito, independiente del tema de color del sitio. */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e8630c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 0px 6px rgba(232,99,12,0.6))' }}>
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          {/* Texto TiendaIA con brillo tipográfico */}
          <span style={{
            color: '#ffffff',
            textShadow: '0 0 10px rgba(255,255,255,0.2)'
          }}>
            Tienda<span style={{
              color: '#e8630c',
              textShadow: '0 0 12px rgba(232,99,12,0.6)'
            }}>IA</span>
          </span>
        </div>
      </div>

      {/* 5. Derechos de autor (Movido al final) */}
      <span style={{ 
        color: '#7a7a7a', 
        fontSize: '0.85rem', 
        textAlign: 'center', 
        marginTop: '10px', 
        letterSpacing: '0.5px' 
      }}>
        © {new Date().getFullYear()} Hierbas Serranas La Paz - Todos los derechos reservados
      </span>

    </footer>
  );
}