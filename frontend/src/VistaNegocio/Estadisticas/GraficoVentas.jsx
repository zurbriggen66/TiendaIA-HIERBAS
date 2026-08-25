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

  return (
    <div className="grafico-ventas">
      <div className="grafico-ventas-plot">
        <div className="grafico-ventas-ejeY">
          {marcasEje.slice().reverse().map((m) => (
            <span key={m}>{formatearPrecio(m)}</span>
          ))}
        </div>

        <div className="grafico-ventas-barras">
          {marcasEje.map((m) => (
            <div key={m} className="grafico-ventas-gridline" style={{ '--line-offset': `${(m / maximo) * 100}%` }} />
          ))}

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
              {foco === d.dia && (
                <div className="grafico-ventas-tooltip">
                  <strong>{formatearPrecio(d.total)}</strong>
                  <span>{formatearDia(d.dia)}</span>
                </div>
              )}
              <div
                className={`grafico-ventas-barra ${foco === d.dia ? 'grafico-ventas-barra-activa' : ''}`}
                style={{ '--bar-height': `${Math.max((d.total / maximo) * 100, 2)}%` }}
              />
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
