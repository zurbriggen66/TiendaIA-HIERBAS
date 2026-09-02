import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTienda } from './TiendaContext';
import IconoWhatsapp from './IconoWhatsapp';
import { armarLinkWhatsapp } from '../utils/whatsapp';

export default function ContactoPage() {
  const { configuracion } = useTienda();
  const navigate = useNavigate();

  const registrados = configuracion.contactos_whatsapp || [];
  // Si todavía no cargaron contactos pero hay un número principal, se muestra ese.
  const contactos = registrados.length > 0
    ? registrados
    : (configuracion.whatsapp ? [{ id: 'principal', nombre: 'WhatsApp', numero: configuracion.whatsapp }] : []);

  return (
    <section className="contacto-page">
      <button type="button" className="contacto-volver" onClick={() => navigate(-1)}>
        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Volver
      </button>

      <h1 className="contacto-titulo fuente-impacto">Chatear con</h1>
      <p className="contacto-bajada">Elegí con quién querés hablar por WhatsApp.</p>

      {contactos.length === 0 ? (
        <p className="contacto-vacio">Todavía no hay números de contacto cargados.</p>
      ) : (
        <ul className="contacto-lista">
          {contactos.map((c) => (
            <li key={c.id}>
              <a
                href={armarLinkWhatsapp(c.numero)}
                target="_blank"
                rel="noopener noreferrer"
                className="contacto-item"
              >
                <span className="contacto-item-ico" aria-hidden="true"><IconoWhatsapp /></span>
                <span className="contacto-item-info">
                  <strong>{c.nombre}</strong>
                  <span>{c.numero}</span>
                </span>
                <span className="material-symbols-outlined contacto-item-flecha" aria-hidden="true">chevron_right</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .contacto-page {
          max-width: 520px;
          margin: 0 auto;
          padding: 20px 20px 64px;
        }
        .contacto-volver {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          padding: 8px 16px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          margin-bottom: 24px;
        }
        .contacto-titulo {
          font-size: 1.9rem;
          color: var(--accent);
          margin: 0;
        }
        .contacto-bajada {
          margin: 6px 0 24px;
          color: var(--text-muted);
          font-size: 0.95rem;
        }
        .contacto-vacio {
          color: var(--text-muted);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
        }
        .contacto-lista {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .contacto-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          text-decoration: none;
          color: var(--text);
          transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
        }
        .contacto-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px -14px rgba(28, 28, 22, 0.4);
          border-color: #25d366;
        }
        .contacto-item-ico {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #25d366;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .contacto-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .contacto-item-info strong {
          font-size: 1rem;
        }
        .contacto-item-info span {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .contacto-item-flecha {
          color: var(--text-muted);
          flex-shrink: 0;
        }
      `}</style>
    </section>
  );
}
