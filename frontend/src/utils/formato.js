/** Formateos que comparten las pantallas del panel. */

export const formatearPrecio = (valor) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(Number(valor) || 0);

export const formatearHora = (fecha) =>
  new Date(fecha).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

// Las cantidades llegan como Decimal ("2.00", "0.50"): se muestran sin ceros de
// relleno, para que una línea se lea "2 kg" y no "2.00 kg".
export const formatearCantidad = (valor) => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return String(valor ?? '');
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
};

// Versión corta de la unidad de la categoría, para que entre al lado del número.
export const UNIDAD_CORTA = { kg: 'kg', pack: 'pack', caja: 'caja', unidad: 'u.' };

// Unidad en plural, para textos que la acompañan de un número ("3 packs").
export const ETIQUETA_UNIDAD = { kg: 'kg', pack: 'packs', caja: 'cajas', unidad: 'unidades' };
