import React, { useState } from 'react';
import { formatearPrecio } from './BarrasDesglose';

const formatearDia = (iso) => {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
};

// Redondea el techo del eje Y a un número "limpio" (múltiplos de 1, 2 o 5 según la magnitud)
const techoLimpio = (valor) => {
  if (valor <= 0) return 1;
  const magnitud = 10 ** Math.floor(Math.log10(valor));
  const pasos = [1, 2, 5, 10];
  const paso = pasos.find((p) => valor <= p * magnitud) ?? 10;
  return paso * magnitud;
};

export default function GraficoVentas({ datos }) {
  const [foco, setFoco] = useState(null);

  if (datos.length === 0) {
    return <p className="estado-vacio-chico">Todavía no hay ventas en este período.</p>;
  }

  const maximo = techoLimpio(Math.max(...datos.map((d) => d.total)));
  const marcasEje = [0, maximo * 0.5, maximo];

  const n = datos.length;
  // Cada día ocupa una "banda" de igual ancho; el punto va centrado en su banda (mismo
  // criterio de posición que tenían las barras) para que el SVG y los puntos HTML calcen.
  const px = (i) => ((i + 0.5) / n) * 100;
  const alturaPct = (total) => Math.min(Math.max((total / maximo) * 100, 0), 100); // desde abajo
  const py = (total) => 100 - alturaPct(total); // coordenada SVG (0 = arriba)

  const puntos = datos.map((d, i) => `${px(i).toFixed(2)},${py(d.total).toFixed(2)}`);
  const lineaD = n > 1 ? `M ${puntos.join(' L ')}` : '';
  const areaD = n > 1
    ? `M ${px(0).toFixed(2)},100 L ${puntos.join(' L ')} L ${px(n - 1).toFixed(2)},100 Z`
    : '';

  return (
    <div
      className="grafico-ventas"
      role="img"
      aria-label={`Ventas por día del ${formatearDia(datos[0].dia)} al ${formatearDia(datos[n - 1].dia)}`}
    >
      <div className="grafico-ventas-plot">
        <div className="grafico-ventas-ejeY">
          {marcasEje.slice().reverse().map((m) => (
            <span key={m}>{formatearPrecio(m)}</span>
          ))}
        </div>

        <div className="grafico-ventas-barras grafico-ventas-barras-linea" style={{ gap: 0 }}>
          {marcasEje.map((m) => (
            <div key={m} className="grafico-ventas-gridline" style={{ '--line-offset': `${(m / maximo) * 100}%` }} />
          ))}

          {n > 1 && (
            <svg className="grafico-ventas-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="grafico-ventas-relleno" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(140, 170, 120, 0.35)" />
                  <stop offset="100%" stopColor="rgba(140, 170, 120, 0)" />
                </linearGradient>
              </defs>
              <path className="grafico-ventas-area" d={areaD} fill="url(#grafico-ventas-relleno)" />
              <path className="grafico-ventas-linea" d={lineaD} fill="none" vectorEffect="non-scaling-stroke" />
            </svg>
          )}

          {datos.map((d) => (
            <button
              type="button"
              key={d.dia}
              className="grafico-ventas-barra-slot"
              onMouseEnter={() => setFoco(d.dia)}
              onMouseLeave={() => setFoco(null)}
              onFocus={() => setFoco(d.dia)}
              onBlur={() => setFoco(null)}
            >
              <span
                className="grafico-ventas-punto-wrap"
                style={{ bottom: `${alturaPct(d.total)}%` }}
              >
                {foco === d.dia && (
                  <span className="grafico-ventas-tooltip">
                    <strong>{formatearPrecio(d.total)}</strong>
                    <span>{formatearDia(d.dia)}</span>
                  </span>
                )}
                <span className={`grafico-ventas-punto ${foco === d.dia ? 'grafico-ventas-punto-activo' : ''}`} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grafico-ventas-ejeX">
        {datos.map((d) => (
          <span key={d.dia}>{formatearDia(d.dia)}</span>
        ))}
      </div>
    </div>
  );
}
