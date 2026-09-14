// node --test src/utils/mensajePedido.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumenPorCategoria } from './escalones.js';
import { armarMensajeWhatsapp } from './mensajePedido.js';

const medicinales = {
  id: 1,
  nombre: 'Hierbas medicinales',
  unidad_medida: 'kg',
  escalones: [{ cantidad_desde: 5, precio_unitario: 16445 }],
};
const infusiones = { id: 2, nombre: 'Té e infusiones', unidad_medida: 'pack', escalones: [] };

const melisa = { id: 10, nombre: 'Melisa hoja', categoria: 1, precio_base: 20000 };
const romero = { id: 11, nombre: 'Romero', categoria: 1, precio_base: 20000 };
const teVerde = { id: 20, nombre: 'Té verde', categoria: 2, precio_base: 4000 };

const categoriasPorId = new Map([
  [1, medicinales],
  [2, infusiones],
]);

const armar = (items, extra = {}) => {
  const resumen = resumenPorCategoria(items, categoriasPorId);
  return armarMensajeWhatsapp({
    nombre: 'Alejandra',
    telefono: '3511234567',
    tipoEntrega: 'retiro',
    direccion: '',
    nota: '',
    items,
    resumen,
    total: 0,
    ...extra,
  });
};

test('agrupa por categoría, con su total y unidad', () => {
  const msg = armar([
    { producto: melisa, cantidad: 5 },
    { producto: romero, cantidad: 5 },
    { producto: teVerde, cantidad: 3 },
  ]);
  assert.match(msg, /\*HIERBAS MEDICINALES\* {2}· {2}10 kg/);
  assert.match(msg, /\*TÉ E INFUSIONES\* {2}· {2}3 packs/);
  // El té va después de las hierbas, cada uno bajo su título.
  assert.ok(msg.indexOf('HIERBAS MEDICINALES') < msg.indexOf('TÉ E INFUSIONES'));
});

test('cada línea lleva cantidad, unidad, precio unitario y subtotal', () => {
  const msg = armar([{ producto: melisa, cantidad: 5 }]);
  // 5 kg alcanzan el escalón de $16.445, así que el subtotal es 5 × 16.445.
  assert.match(msg, /• Melisa hoja — 5 kg × \$\s?16\.445 = \$\s?82\.225/);
});

test('sin llegar al escalón usa el precio base del producto', () => {
  const msg = armar([{ producto: melisa, cantidad: 2 }]);
  assert.match(msg, /• Melisa hoja — 2 kg × \$\s?20\.000 = \$\s?40\.000/);
});

test('retiro y envío se muestran distinto', () => {
  const items = [{ producto: teVerde, cantidad: 1 }];
  assert.match(armar(items), /🏬 Retiro en el local/);

  const conEnvio = armar(items, { tipoEntrega: 'envio', direccion: 'Av. Colón 1234' });
  assert.match(conEnvio, /🚚 Envío a Av\. Colón 1234/);
  assert.match(conEnvio, /El costo de envío se coordina por WhatsApp/);
});

test('la nota solo aparece si se escribió algo', () => {
  const items = [{ producto: teVerde, cantidad: 1 }];
  assert.doesNotMatch(armar(items, { nota: '   ' }), /📝/);
  assert.match(armar(items, { nota: 'Tocar timbre 2 veces' }), /📝 _Tocar timbre 2 veces_/);
});

test('un producto sin categoría cargada no se pierde del mensaje', () => {
  // Si la categoría no está en el mapa, resumenPorCategoria descarta la línea:
  // el mensaje tiene que listarla igual, o el pedido del chat no coincide con
  // el que se guardó.
  const huerfano = { id: 99, nombre: 'Producto raro', categoria: 777, precio_base: 1000 };
  const msg = armar([{ producto: teVerde, cantidad: 1 }, { producto: huerfano, cantidad: 2 }]);
  assert.match(msg, /\*OTROS\*/);
  assert.match(msg, /• Producto raro — 2 × \$\s?1\.000 = \$\s?2\.000/);
});

test('el total va al final y con los datos del cliente arriba', () => {
  const msg = armar([{ producto: teVerde, cantidad: 3 }], { total: 12000 });
  assert.match(msg, /^🌿 \*NUEVO PEDIDO MAYORISTA\*/);
  assert.match(msg, /👤 Alejandra {2}· {2}3511234567/);
  assert.match(msg, /💰 \*TOTAL: \$\s?12\.000\*$/);
});

test('usa cinco emojis y no más', () => {
  const msg = armar([{ producto: melisa, cantidad: 5 }, { producto: teVerde, cantidad: 1 }], {
    tipoEntrega: 'envio',
    direccion: 'Av. Colón 1234',
    nota: 'Sin timbre',
    total: 86225,
  });
  const emojis = msg.match(/\p{Extended_Pictographic}/gu) || [];
  assert.deepEqual(emojis, ['🌿', '👤', '🚚', '💰', '📝']);
});
