// Con extensión a propósito: así este módulo se puede correr con `node --test`
// (Node exige la extensión en ESM; Vite acepta las dos formas).
import { precioUnitarioItem } from './escalones.js';
import { ETIQUETA_UNIDAD, formatearPrecio } from './formato.js';

/**
 * El mensaje que el cliente manda por WhatsApp con su pedido.
 *
 * Va agrupado por categoría, porque es como se compra y como se cotiza: el
 * precio por unidad sale del escalón que alcanza la categoría entera, no cada
 * producto por separado. Cada línea lleva cantidad, unidad, precio unitario y
 * subtotal, así el pedido se puede cotejar sin volver a la web.
 *
 * Los emojis son cinco y marcan bloques distintos (título, quién, cómo se
 * entrega, total, nota): alcanzan para separar de un vistazo en el chat sin
 * convertir el mensaje en un cartel.
 *
 * `resumen` es lo que devuelve resumenPorCategoria(); `items` son las líneas
 * crudas del carrito.
 */
export function armarMensajeWhatsapp({
  nombre,
  telefono,
  dni = '',
  ciudad = '',
  codigoPostal = '',
  tipoEntrega,
  direccion,
  nota = '',
  items,
  resumen,
  total,
}) {
  const lineas = ['🌿 *NUEVO PEDIDO MAYORISTA*', ''];

  lineas.push(`👤 ${nombre}  ·  ${telefono}`);
  const datos = [
    dni.trim() && `DNI ${dni.trim()}`,
    [ciudad.trim(), codigoPostal.trim() && `(CP ${codigoPostal.trim()})`].filter(Boolean).join(' '),
  ].filter(Boolean);
  if (datos.length > 0) lineas.push(datos.join('  ·  '));
  if (tipoEntrega === 'envio') {
    lineas.push(`🚚 Envío a ${direccion}`);
    lineas.push('_El costo de envío se coordina por WhatsApp._');
  } else {
    lineas.push('🏬 Retiro en el local');
  }

  const enResumen = new Set();
  resumen.forEach((grupo) => {
    const unidad = ETIQUETA_UNIDAD[grupo.categoria.unidad_medida] || grupo.categoria.unidad_medida;
    lineas.push('', `*${grupo.categoria.nombre.toUpperCase()}*  ·  ${grupo.cantidadTotal} ${unidad}`);
    if (grupo.enModoGranel) lineas.push('_(precio a granel)_');
    grupo.items.forEach((item) => {
      enResumen.add(item.producto.id);
      const precio = precioUnitarioItem(item, resumen);
      lineas.push(
        `• ${item.producto.nombre} — ${item.cantidad} ${unidad} × ${formatearPrecio(precio)} = ${formatearPrecio(precio * item.cantidad)}`,
      );
    });
  });

  // Una línea cuya categoría no está cargada no entra en `resumen`: se lista
  // igual, para que el pedido que llega al chat sea el mismo que se guardó.
  const sueltos = items.filter((item) => !enResumen.has(item.producto.id));
  if (sueltos.length > 0) {
    lineas.push('', '*OTROS*');
    sueltos.forEach((item) => {
      const precio = precioUnitarioItem(item, resumen);
      lineas.push(
        `• ${item.producto.nombre} — ${item.cantidad} × ${formatearPrecio(precio)} = ${formatearPrecio(precio * item.cantidad)}`,
      );
    });
  }

  lineas.push('', `💰 *TOTAL: ${formatearPrecio(total)}*`);
  if (nota.trim()) lineas.push('', `📝 _${nota.trim()}_`);
  return lineas.join('\n');
}
