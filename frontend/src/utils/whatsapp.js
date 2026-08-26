// wa.me solo abre bien en Android e iPhone si el número es puramente dígitos, en
// formato internacional (ej. 5493511234567). El backend ya lo limpia al guardar la
// configuración, pero se limpia también acá por si queda algún valor viejo sin
// resguardar, o alguien lo pega con espacios/guiones en un formulario que todavía no
// pasó por el backend.
export function limpiarNumeroWhatsapp(numero) {
  return (numero || '').replace(/\D/g, '');
}

export function armarLinkWhatsapp(numero, mensaje) {
  const limpio = limpiarNumeroWhatsapp(numero);
  if (!limpio) return '';
  const base = `https://wa.me/${limpio}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
