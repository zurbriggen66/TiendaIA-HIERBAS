import React, { useEffect, useState } from 'react';
import { registrarNotificaciones } from './notificaciones';

export default function NotificacionesHost() {
  const [toast, setToast] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);

  useEffect(() => {
    registrarNotificaciones({
      mostrarToast: (mensaje, tipo) => setToast({ mensaje, tipo, key: Date.now() }),
      pedirConfirmacion: (mensaje) => new Promise((resolver) => setConfirmacion({ mensaje, resolver })),
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const responder = (valor) => {
    confirmacion?.resolver(valor);
    setConfirmacion(null);
  };

  return (
    <>
      {toast && (
        <div className={`admin-toast admin-toast-${toast.tipo}`} key={toast.key} role="status">
          <span className="material-symbols-outlined" aria-hidden="true">
            {toast.tipo === 'exito' ? 'check_circle' : 'warning'}
          </span>
          {toast.mensaje}
        </div>
      )}

      {confirmacion && (
        <div className="admin-confirm-overlay" onClick={() => responder(false)}>
          <div className="admin-confirm-card" onClick={(e) => e.stopPropagation()}>
            <p>{confirmacion.mensaje}</p>
            <div className="admin-confirm-acciones">
              <button type="button" className="btn-secundario" onClick={() => responder(false)}>Cancelar</button>
              <button type="button" className="btn-vibrante" onClick={() => responder(true)} autoFocus>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
