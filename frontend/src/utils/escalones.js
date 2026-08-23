// Mismo criterio que Categoria.precio_para_cantidad en el backend (productos/models.py):
// el escalón más alto cuyo mínimo no supera la cantidad ya juntada en la categoría
// (todas las variedades combinadas, no una por una). El backend es la fuente de verdad
// al guardar un pedido — esto es solo para mostrarle el precio al usuario antes de eso.
export function precioPorEscalon(categoria, cantidadTotal) {
  const escalones = (categoria.escalones || []).filter((e) => Number(e.cantidad_desde) <= cantidadTotal);
  if (escalones.length === 0) return null;
  return escalones.reduce((mejor, e) => (Number(e.cantidad_desde) > Number(mejor.cantidad_desde) ? e : mejor)).precio_unitario;
}

// Agrupa líneas de pedido {producto, cantidad} por categoría: cantidad total, si llega
// al mínimo, y el precio por unidad vigente (por escalón, o el precio propio del
// producto si la categoría no tiene escalones cargados).
export function resumenPorCategoria(items, categoriasPorId) {
  const grupos = new Map();
  for (const item of items) {
    const categoriaId = item.producto.categoria;
    const categoria = categoriasPorId.get(categoriaId);
    if (!categoria) continue;
    if (!grupos.has(categoria.id)) grupos.set(categoria.id, { categoria, cantidadTotal: 0, items: [] });
    const grupo = grupos.get(categoria.id);
    grupo.cantidadTotal += Number(item.cantidad) || 0;
    grupo.items.push(item);
  }
  return Array.from(grupos.values()).map((grupo) => {
    const precioEscalon = precioPorEscalon(grupo.categoria, grupo.cantidadTotal);
    const faltante = Math.max(0, Number(grupo.categoria.cantidad_minima || 0) - grupo.cantidadTotal);
    return { ...grupo, precioEscalon, faltante };
  });
}

export function precioUnitarioItem(item, resumen) {
  const grupo = resumen.find((g) => g.categoria.id === item.producto.categoria);
  if (grupo && grupo.precioEscalon != null) return Number(grupo.precioEscalon);
  return Number(item.producto.precio_base) || 0;
}
