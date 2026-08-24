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
    if (!grupos.has(categoria.id)) {
      grupos.set(categoria.id, { categoria, cantidadTotal: 0, items: [], cantidadPorProducto: new Map() });
    }
    const grupo = grupos.get(categoria.id);
    grupo.cantidadTotal += Number(item.cantidad) || 0;
    grupo.items.push(item);
    const previa = grupo.cantidadPorProducto.get(item.producto.id) || 0;
    grupo.cantidadPorProducto.set(item.producto.id, previa + (Number(item.cantidad) || 0));
  }
  return Array.from(grupos.values()).map((grupo) => {
    const precioEscalon = precioPorEscalon(grupo.categoria, grupo.cantidadTotal);
    const faltante = Math.max(0, Number(grupo.categoria.cantidad_minima || 0) - grupo.cantidadTotal);

    // Mínimo por variedad (ej: Hierbas a Granel exige al menos 10kg de CADA hierba
    // elegida, no solo el total): a diferencia de `faltante`, es por producto individual.
    const minimoVariedad = Number(grupo.categoria.cantidad_minima_variedad || 0);
    const variedadesBajoMinimo = [];
    if (minimoVariedad > 0) {
      const vistos = new Set();
      for (const item of grupo.items) {
        if (vistos.has(item.producto.id)) continue;
        vistos.add(item.producto.id);
        const cantidad = grupo.cantidadPorProducto.get(item.producto.id) || 0;
        if (cantidad < minimoVariedad) {
          variedadesBajoMinimo.push({ nombre: item.producto.nombre, cantidad, falta: minimoVariedad - cantidad });
        }
      }
    }

    // Modo "a granel" (precio dual por producto, ej: Hierbas Medicinales por Kg): NO
    // bloquea el pedido como `faltante`/`variedadesBajoMinimo` — solo decide qué precio
    // se muestra. Mismo criterio que el backend (pedidos/serializers.py): todo o nada,
    // si una sola variedad elegida no llega a su mínimo, ninguna entra en modo granel.
    const granelMinimoTotal = Number(grupo.categoria.granel_cantidad_minima || 0);
    const granelMinimoVariedad = Number(grupo.categoria.granel_cantidad_minima_variedad || 0);
    let enModoGranel = false;
    let variedadesBajoMinimoGranel = [];
    if (granelMinimoTotal > 0) {
      const vistos = new Set();
      for (const item of grupo.items) {
        if (vistos.has(item.producto.id)) continue;
        vistos.add(item.producto.id);
        const cantidad = grupo.cantidadPorProducto.get(item.producto.id) || 0;
        if (cantidad < granelMinimoVariedad) {
          variedadesBajoMinimoGranel.push({ nombre: item.producto.nombre, cantidad, falta: granelMinimoVariedad - cantidad });
        }
      }
      enModoGranel = grupo.cantidadTotal >= granelMinimoTotal && variedadesBajoMinimoGranel.length === 0;
    }
    const faltaParaGranel = Math.max(0, granelMinimoTotal - grupo.cantidadTotal);

    return {
      ...grupo, precioEscalon, faltante, minimoVariedad, variedadesBajoMinimo,
      enModoGranel, granelMinimoTotal, granelMinimoVariedad, faltaParaGranel,
      variedadesBajoMinimoGranel: enModoGranel ? [] : variedadesBajoMinimoGranel,
    };
  });
}

export function precioUnitarioItem(item, resumen) {
  const grupo = resumen.find((g) => g.categoria.id === item.producto.categoria);
  if (grupo && grupo.enModoGranel && item.producto.precio_granel != null) return Number(item.producto.precio_granel);
  if (grupo && grupo.precioEscalon != null) return Number(grupo.precioEscalon);
  return Number(item.producto.precio_base) || 0;
}
