// Puente sin Context: 21 páginas/modales del admin usaban alert()/window.confirm()
// nativos. En vez de envolver todo el admin en un Provider y tocar cada archivo con
// un hook, NotificacionesHost (montado una sola vez en DashboardLayout) se registra
// acá al arrancar, y notificar()/confirmar() quedan disponibles como funciones sueltas
// para importar donde haga falta — igual que antes se importaba `alert` global.
let mostrarToastImpl = null;
let pedirConfirmacionImpl = null;

export function registrarNotificaciones({ mostrarToast, pedirConfirmacion }) {
  mostrarToastImpl = mostrarToast;
  pedirConfirmacionImpl = pedirConfirmacion;
}

export function notificar(mensaje, tipo = 'aviso') {
  if (mostrarToastImpl) mostrarToastImpl(mensaje, tipo);
  else window.alert(mensaje);
}

export function confirmar(mensaje) {
  if (pedirConfirmacionImpl) return pedirConfirmacionImpl(mensaje);
  return Promise.resolve(window.confirm(mensaje));
}
