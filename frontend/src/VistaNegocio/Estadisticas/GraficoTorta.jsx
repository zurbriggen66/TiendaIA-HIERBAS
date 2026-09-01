import React, { useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Paleta categórica validada para fondo oscuro (skill dataviz), mismo orden en todo
// el admin para que una categoría tenga siempre el mismo color.
const PALETA = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const FONDO = '#1a2820';

const formatearPrecio = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

const colorDe = (i) => PALETA[i % PALETA.length];

export default function GraficoTorta({ datos, nombreArchivo = 'grafico' }) {
  const svgWrapRef = useRef(null);

  const filas = (datos || [])
    .map((d) => ({ nombre: d.nombre, total: Number(d.total) }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  if (filas.length === 0) {
    return <p className="estado-vacio-chico">No hay datos para este período.</p>;
  }

  const total = filas.reduce((s, d) => s + d.total, 0);
  const data = filas.map((d) => ({ name: d.nombre, value: d.total }));

  // Descarga como PNG: el <svg> de recharts trae solo la torta (la leyenda la
  // dibujamos aparte en HTML), así que la rasterizamos y le pintamos la leyenda
  // encima a mano sobre el canvas.
  const descargar = () => {
    const svg = svgWrapRef.current?.querySelector('svg');
    if (!svg) return;
    const ancho = svg.clientWidth || 360;
    const alto = svg.clientHeight || 300;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;

    const img = new Image();
    img.onload = () => {
      const escala = 2;
      const filasLeyenda = filas.length;
      const altoLeyenda = 24 + filasLeyenda * 22;
      const canvas = document.createElement('canvas');
      canvas.width = ancho * escala;
      canvas.height = (alto + altoLeyenda) * escala;
      const ctx = canvas.getContext('2d');
      ctx.scale(escala, escala);
      ctx.fillStyle = FONDO;
      ctx.fillRect(0, 0, ancho, alto + altoLeyenda);
      ctx.drawImage(img, 0, 0, ancho, alto);

      ctx.font = '13px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      filas.forEach((f, i) => {
        const y = alto + 18 + i * 22;
        ctx.fillStyle = colorDe(i);
        ctx.fillRect(16, y - 5, 10, 10);
        ctx.fillStyle = '#e8ede4';
        const pct = Math.round((f.total / total) * 100);
        ctx.fillText(`${f.nombre} — ${formatearPrecio(f.total)} · ${pct}%`, 34, y);
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nombreArchivo}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = svg64;
  };

  return (
    <div className="grafico-torta">
      <button type="button" className="grafico-torta-descargar" onClick={descargar}>
        <span className="material-symbols-outlined" aria-hidden="true">download</span>
        Descargar
      </button>

      <div ref={svgWrapRef} className="grafico-torta-lienzo">
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
      </div>

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
