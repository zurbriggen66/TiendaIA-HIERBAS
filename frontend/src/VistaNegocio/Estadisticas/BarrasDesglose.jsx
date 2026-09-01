import React, { useState } from 'react';

export const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(precio);

const formatearFechaCorta = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Paleta categórica validada para fondo oscuro (skill dataviz). Orden fijo, no cíclica:
// una 9na serie (rarísimo en estos desgloses, que tienen 4-6 filas) cae en gris.
const PALETA_SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

// Lista de barras proporcionales (mismo formato visual que el ranking de productos),
// donde cada fila se puede tocar para desplegar el detalle de esos gastos.
export default function BarrasDesglose({ filas, total, detalleSecundario }) {
  const [abierta, setAbierta] = useState(null);

  if (filas.length === 0) return null;
  const maximo = Math.max(...filas.map((f) => Number(f.total)));

  return (
    <div className="ranking-productos">
      {filas.map((fila, indice) => {
        const monto = Number(fila.total);
        const porcentajeDelTotal = total > 0 ? Math.round((monto / total) * 100) : 0;
        const estaAbierta = abierta === fila.clave;
        const detalle = fila.gastos || [];
        const sePuedeAbrir = detalle.length > 0;

        const contenido = (
          <div className="ranking-info">
            <div className="ranking-nombre-linea">
              <strong>
                {sePuedeAbrir && <span className="desglose-flecha">{estaAbierta ? '▾' : '▸'}</span>}
                <span className="desglose-swatch" aria-hidden="true" /> {fila.etiqueta}
              </strong>
              <span>{formatearPrecio(monto)} · {porcentajeDelTotal}%</span>
            </div>
            <div className="ranking-barra-fondo">
              <div className="ranking-barra" style={{ '--bar-width': `${Math.max((monto / maximo) * 100, 6)}%` }} />
            </div>
          </div>
        );

        const estiloSerie = { '--serie-color': PALETA_SERIES[indice] || 'var(--text-muted)' };

        return (
          <div key={fila.clave} className="desglose-grupo" style={estiloSerie}>
            {sePuedeAbrir ? (
              <button
                type="button"
                className={`ranking-fila desglose-fila ${estaAbierta ? 'desglose-fila-abierta' : ''}`}
                onClick={() => setAbierta(estaAbierta ? null : fila.clave)}
                aria-expanded={estaAbierta}
              >
                {contenido}
              </button>
            ) : (
              <div className="ranking-fila">{contenido}</div>
            )}

            {estaAbierta && (
              <div className="desglose-detalle">
                {detalle.map((g) => (
                  <div key={g.id} className="desglose-detalle-fila">
                    <div className="desglose-detalle-info">
                      <strong>{g.descripcion}</strong>
                      <span>
                        {formatearFechaCorta(g.fecha)} ·{' '}
                        {detalleSecundario === 'categoria'
                          ? `🏷️ ${g.categoria_label}`
                          : `💳 ${g.metodo_label}`}
                      </span>
                    </div>
                    <span className="desglose-detalle-monto">{formatearPrecio(g.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
