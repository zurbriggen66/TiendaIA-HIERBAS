import React, { lazy, Suspense, useEffect, useState } from 'react';
import api from '../../services/api';
import BarrasDesglose, { formatearPrecio } from './BarrasDesglose';
import GraficoVentas from './GraficoVentas';

// recharts pesa ~100 KB gzip: se carga aparte, solo al abrir Estadísticas.
const GraficoTorta = lazy(() => import('./GraficoTorta'));
const CargandoTorta = () => <p className="estado-vacio-chico">Cargando gráfico…</p>;

const pad2 = (n) => String(n).padStart(2, '0');
// OJO: no usar toISOString() acá — convierte a UTC y en Argentina (UTC-3) eso hace
// que "hoy" salte al día siguiente a partir de las 21:00 hora local.
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const mesActualISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

const primerYUltimoDiaDelMes = (mesStr) => {
  const [anio, mes] = mesStr.split('-').map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  return { primero: `${mesStr}-01`, ultimo: `${mesStr}-${String(ultimoDia).padStart(2, '0')}` };
};

const mesAnteriorISO = (mesStr) => {
  const [anio, mes] = mesStr.split('-').map(Number);
  return mes === 1 ? `${anio - 1}-12` : `${anio}-${pad2(mes - 1)}`;
};
const diaAnteriorISO = (diaStr) => {
  const d = new Date(`${diaStr}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// Flecha + % contra el período anterior (mes o día). Mismo criterio que el
// "vs. ayer" del Inicio: si antes fue 0 no hay % posible, solo "nuevo".
const ICONO_TENDENCIA = { sube: 'trending_up', baja: 'trending_down', igual: 'trending_flat' };
const calcularTendencia = (actual, previo) => {
  const a = Number(actual) || 0;
  const p = Number(previo) || 0;
  if (p === 0) return a > 0 ? { signo: 'sube', texto: 'nuevo' } : null;
  const pct = Math.round(((a - p) / p) * 100);
  if (pct === 0) return { signo: 'igual', texto: 'sin cambios' };
  return { signo: pct > 0 ? 'sube' : 'baja', texto: `${pct > 0 ? '+' : ''}${pct}%` };
};

function DeltaKpi({ actual, previo }) {
  const t = calcularTendencia(actual, previo);
  if (!t) return null;
  return (
    <span className={`kpi-trend kpi-trend-${t.signo}`}>
      <span className="material-symbols-outlined" aria-hidden="true">{ICONO_TENDENCIA[t.signo]}</span>
      {t.texto}
    </span>
  );
}

const KpiIcono = ({ nombre }) => (
  <span className="kpi-icon">
    <span className="material-symbols-outlined" aria-hidden="true">{nombre}</span>
  </span>
);

const POR_PAGINA = 20;

// Ranking completo de productos vendidos en el período, como tabla paginada y
// filtrable por categoría (el ranking puede tener decenas de filas — una lista de
// barras como en "Inicio" no escala).
function TablaProductosVendidos({ productos }) {
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(0);

  const categorias = [...new Set(productos.map((p) => p.categoria_nombre).filter(Boolean))].sort();
  const filtrados = categoria ? productos.filter((p) => p.categoria_nombre === categoria) : productos;
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = filtrados.slice(paginaActual * POR_PAGINA, paginaActual * POR_PAGINA + POR_PAGINA);

  return (
    <div className="tabla-datos-wrap">
      <div className="tabla-datos-toolbar">
        <select
          className="input-vibrante"
          value={categoria}
          onChange={(e) => { setCategoria(e.target.value); setPagina(0); }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="tabla-datos-conteo">{filtrados.length} productos</span>
      </div>

      <div className="tabla-datos-scroll">
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th className="num">Unidades</th>
              <th className="num">Valor total</th>
              <th className="num">Prom. unitario</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p, i) => (
              <tr key={p.producto_id}>
                <td className="tabla-datos-rank">{paginaActual * POR_PAGINA + i + 1}</td>
                <td>{p.producto_nombre}</td>
                <td>{p.categoria_nombre || '—'}</td>
                <td className="num">{Number(p.cantidad_total).toLocaleString('es-AR')}</td>
                <td className="num">{formatearPrecio(p.total)}</td>
                <td className="num">{formatearPrecio(Number(p.total) / Number(p.cantidad_total || 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="tabla-datos-paginado">
          <button type="button" onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 0}>
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
          <span>Página {paginaActual + 1} de {totalPaginas}</span>
          <button type="button" onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual >= totalPaginas - 1}>
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function EstadisticasPage() {
  const [datos, setDatos] = useState(null);
  const [datosPrev, setDatosPrev] = useState(null); // período anterior, para la tendencia
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('mensual');
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualISO());
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyISO());
  // Rango opcional para la pestaña General (vacío = todo el historial).
  const [desdeGeneral, setDesdeGeneral] = useState('');
  const [hastaGeneral, setHastaGeneral] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        let params = {};
        let paramsPrev = null;
        if (tab === 'mensual') {
          const { primero, ultimo } = primerYUltimoDiaDelMes(mesSeleccionado);
          params = { desde: primero, hasta: ultimo };
          const p = primerYUltimoDiaDelMes(mesAnteriorISO(mesSeleccionado));
          paramsPrev = { desde: p.primero, hasta: p.ultimo };
        } else if (tab === 'dia') {
          params = { desde: diaSeleccionado, hasta: diaSeleccionado };
          const d = diaAnteriorISO(diaSeleccionado);
          paramsPrev = { desde: d, hasta: d };
        } else if (tab === 'general') {
          if (desdeGeneral) params.desde = desdeGeneral;
          if (hastaGeneral) params.hasta = hastaGeneral;
        }
        const [{ data }, prev] = await Promise.all([
          api.get('/estadisticas/', { params }),
          paramsPrev ? api.get('/estadisticas/', { params: paramsPrev }) : Promise.resolve(null),
        ]);
        setDatos(data);
        setDatosPrev(prev ? prev.data : null);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [tab, mesSeleccionado, diaSeleccionado, desdeGeneral, hastaGeneral]);

  return (
    <div className="estadisticas-page">
      <header className="main-header">
        <h2>Estadísticas</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="tabs-bar">
          <button type="button" className={`tab-boton ${tab === 'mensual' ? 'tab-activo' : ''}`} onClick={() => setTab('mensual')}>
            Mensual
          </button>
          <button type="button" className={`tab-boton ${tab === 'dia' ? 'tab-activo' : ''}`} onClick={() => setTab('dia')}>
            Por día
          </button>
          <button type="button" className={`tab-boton ${tab === 'general' ? 'tab-activo' : ''}`} onClick={() => setTab('general')}>
            General
          </button>
        </div>

        {tab === 'mensual' && (
          <div className="form-group estadisticas-selector-periodo">
            <label className="form-label">Mes</label>
            <input
              type="month"
              className="input-vibrante"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />
          </div>
        )}

        {tab === 'dia' && (
          <div className="form-group estadisticas-selector-periodo">
            <label className="form-label">Día</label>
            <input
              type="date"
              className="input-vibrante"
              value={diaSeleccionado}
              onChange={(e) => setDiaSeleccionado(e.target.value)}
            />
          </div>
        )}

        {tab === 'general' && (
          <div className="estadisticas-rango">
            <span className="estadisticas-rango-label">Período</span>
            <input
              type="date"
              className="input-vibrante"
              aria-label="Desde"
              value={desdeGeneral}
              max={hastaGeneral || undefined}
              onChange={(e) => setDesdeGeneral(e.target.value)}
            />
            <span className="estadisticas-rango-sep" aria-hidden="true">→</span>
            <input
              type="date"
              className="input-vibrante"
              aria-label="Hasta"
              value={hastaGeneral}
              min={desdeGeneral || undefined}
              onChange={(e) => setHastaGeneral(e.target.value)}
            />
            {(desdeGeneral || hastaGeneral) && (
              <button
                type="button"
                className="estadisticas-rango-limpiar"
                onClick={() => { setDesdeGeneral(''); setHastaGeneral(''); }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {cargando || !datos ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <>
            <div className="resumen-grid">
              <div className="resumen-tile resumen-tile-servicios">
                <KpiIcono nombre="payments" />
                <span>Ventas totales</span>
                <strong>{formatearPrecio(datos.ventas_totales)}</strong>
                {datosPrev && <DeltaKpi actual={datos.ventas_totales} previo={datosPrev.ventas_totales} />}
              </div>
              <div className="resumen-tile resumen-tile-otros">
                <KpiIcono nombre="receipt_long" />
                <span>Gastos totales</span>
                <strong>{formatearPrecio(datos.gastos_totales)}</strong>
                {datosPrev && <DeltaKpi actual={datos.gastos_totales} previo={datosPrev.gastos_totales} />}
              </div>
              <div className={`resumen-tile ${datos.ganancia_neta >= 0 ? 'resumen-tile-ganancia-positiva' : 'resumen-tile-ganancia-negativa'}`}>
                <KpiIcono nombre="savings" />
                <span>Ganancia neta</span>
                <strong>{formatearPrecio(datos.ganancia_neta)}</strong>
                {datosPrev && <DeltaKpi actual={datos.ganancia_neta} previo={datosPrev.ganancia_neta} />}
              </div>
              <div className="resumen-tile resumen-tile-insumos">
                <KpiIcono nombre="local_offer" />
                <span>Ticket promedio</span>
                <strong>{formatearPrecio(datos.ticket_promedio)}</strong>
                {datosPrev && <DeltaKpi actual={datos.ticket_promedio} previo={datosPrev.ticket_promedio} />}
              </div>
              <div className="resumen-tile resumen-tile-total">
                <KpiIcono nombre="shopping_bag" />
                <span>Pedidos totales</span>
                <strong>{datos.total_pedidos}</strong>
                {datosPrev && <DeltaKpi actual={datos.total_pedidos} previo={datosPrev.total_pedidos} />}
              </div>
            </div>

            {tab !== 'dia' && (
              <>
                <div className="seccion-header">
                  <h3>
                    {tab === 'mensual'
                      ? 'Ventas del mes'
                      : tab === 'general' && desdeGeneral && hastaGeneral
                        ? 'Ventas del período'
                        : 'Ventas de los últimos 14 días'}
                  </h3>
                </div>
                <GraficoVentas datos={datos.ventas_por_dia} />
              </>
            )}

            <div className="estadisticas-tortas-grid">
              <div className="panel">
                <div className="seccion-header">
                  <h3>Con qué te pagaron las ventas</h3>
                </div>
                {Number(datos.ventas_totales) === 0 ? (
                  <p className="estado-vacio-chico">No hay ventas registradas en este período.</p>
                ) : (
                  <Suspense fallback={<CargandoTorta />}>
                    <GraficoTorta
                      datos={(datos.ventas_por_metodo || []).map((f) => ({ nombre: f.metodo_label, total: f.total }))}
                    />
                  </Suspense>
                )}
              </div>

              <div className="panel">
                <div className="seccion-header">
                  <h3>Ventas por categoría</h3>
                </div>
                {(datos.ventas_por_categoria || []).length === 0 ? (
                  <p className="estado-vacio-chico">No hay ventas registradas en este período.</p>
                ) : (
                  <Suspense fallback={<CargandoTorta />}>
                    <GraficoTorta
                      datos={datos.ventas_por_categoria.map((c) => ({ nombre: c.categoria_nombre, total: c.total }))}
                    />
                  </Suspense>
                )}
              </div>
            </div>

            <div className="seccion-header">
              <h3>En qué se fue la plata</h3>
            </div>
            {Number(datos.gastos_totales) === 0 ? (
              <p className="estado-vacio-chico">No hay gastos registrados en este período.</p>
            ) : (
              <div className="gastos-desglose-grid">
                <div>
                  <h4 className="gastos-desglose-titulo">Por rubro</h4>
                  <BarrasDesglose
                    filas={(datos.gastos_por_categoria || []).map((f) => ({
                      clave: f.categoria,
                      etiqueta: f.categoria_label,
                      total: f.total,
                      gastos: f.gastos,
                    }))}
                    total={Number(datos.gastos_totales)}
                    detalleSecundario="metodo"
                  />
                </div>
                <div>
                  <h4 className="gastos-desglose-titulo">Con qué se pagó</h4>
                  <BarrasDesglose
                    filas={(datos.gastos_por_metodo || []).map((f) => ({
                      clave: f.metodo,
                      etiqueta: f.metodo_label,
                      total: f.total,
                      gastos: f.gastos,
                    }))}
                    total={Number(datos.gastos_totales)}
                    detalleSecundario="categoria"
                  />
                </div>
              </div>
            )}

            <div className="seccion-header">
              <h3>Productos más vendidos</h3>
            </div>
            {datos.productos_mas_vendidos.length === 0 ? (
              <p className="estado-vacio-chico">Todavía no hay ventas registradas.</p>
            ) : (
              <TablaProductosVendidos productos={datos.productos_mas_vendidos} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
