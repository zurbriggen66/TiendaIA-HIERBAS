import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Paleta categórica validada para fondo oscuro (skill dataviz), mismo orden en todo
// el admin para que una categoría tenga siempre el mismo color.
const PALETA = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const FONDO = '#1a2820';

const formatearPrecio = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

const colorDe = (i) => PALETA[i % PALETA.length];

export default function GraficoTorta({ datos }) {
  const filas = (datos || [])
    .map((d) => ({ nombre: d.nombre, total: Number(d.total) }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  if (filas.length === 0) {
    return <p className="estado-vacio-chico">No hay datos para este período.</p>;
  }

  const total = filas.reduce((s, d) => s + d.total, 0);
  const data = filas.map((d) => ({ name: d.nombre, value: d.total }));

  return (
    <div className="grafico-torta">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="48%"
            outerRadius="78%"
            paddingAngle={2}
            stroke={FONDO}
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colorDe(i)} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${formatearPrecio(value)} · ${Math.round((value / total) * 100)}%`,
              name,
            ]}
            contentStyle={{ background: '#111827', border: 'none', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#ffffff' }}
            labelStyle={{ color: '#d1d5db' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="grafico-torta-leyenda">
        {filas.map((f, i) => (
          <li key={f.nombre}>
            <span className="grafico-torta-punto" style={{ background: colorDe(i) }} />
            <span className="grafico-torta-nombre">{f.nombre}</span>
            <span className="grafico-torta-valor">
              {formatearPrecio(f.total)} · {Math.round((f.total / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
