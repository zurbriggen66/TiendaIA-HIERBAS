import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatearPrecio } from './BarrasDesglose';

// Paleta categórica validada para fondo oscuro (skill dataviz), mismo orden que
// BarrasDesglose para que una categoría tenga el mismo color en todo el admin.
const PALETA = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

export default function DonutCategorias({ datos }) {
  const filas = (datos || []).filter((d) => Number(d.total) > 0);
  if (filas.length === 0) {
    return <p className="estado-vacio-chico">Todavía no hay ventas en este período.</p>;
  }

  const total = filas.reduce((suma, d) => suma + Number(d.total), 0);
  const data = filas.map((d) => ({ name: d.categoria_nombre, value: Number(d.total) }));

  return (
    <div className="donut-categorias">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={64}
            outerRadius={100}
            paddingAngle={2}
            stroke="#324a3a"
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETA[i % PALETA.length]} />
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
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={9}
            formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
