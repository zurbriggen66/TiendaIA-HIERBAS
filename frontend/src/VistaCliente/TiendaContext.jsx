import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { leerToken, guardarToken } from '../services/api';

const TiendaContext = createContext(null);

export function useTienda() {
  const ctx = useContext(TiendaContext);
  if (!ctx) throw new Error('useTienda debe usarse dentro de <TiendaProvider>');
  return ctx;
}

const precargarImagen = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve();
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

const precargarVideo = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve();
    const video = document.createElement('video');
    video.preload = 'auto';
    video.onloadeddata = () => resolve();
    video.onerror = () => resolve();
    video.src = src;
  });

const conLimiteDeTiempo = (promesa, ms) =>
  Promise.race([promesa, new Promise((resolve) => setTimeout(resolve, ms))]);

const TIEMPO_MINIMO_PRECARGA_MS = 1200;
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const CONFIG_INICIAL = {
  logo: null,
  logo_secundario: null,
  logo_precarga: null,
  imagen_principal: null,
  video_principal: null,
  whatsapp: '',
  instagram: '',
  color_navbar: '#f2f7ef',
  color_fondo: '#eaf0e6',
  color_superficie: '#f2f7ef',
  color_acento: '#1a361b',
  color_boton_agregar: '#1a361b',
  tienda_abierta: true,
  mensaje_cerrado: '',
};

export function TiendaProvider({ children }) {
  const [configuracion, setConfiguracion] = useState(CONFIG_INICIAL);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [mostrarCuenta, setMostrarCuenta] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const obtenerConfiguracion = async () => {
      try {
        const respuesta = await api.get('/configuracion/');
        if (respuesta.data && respuesta.data.length > 0) {
          const ultimaConfig = respuesta.data[respuesta.data.length - 1];
          return {
            ...CONFIG_INICIAL,
            ...Object.fromEntries(Object.entries(ultimaConfig).filter(([, v]) => v !== null && v !== undefined && v !== '')),
            tienda_abierta: ultimaConfig.tienda_abierta ?? true,
          };
        }
        return null;
      } catch (error) {
        console.error('Error al cargar los datos del backend:', error);
        return null;
      }
    };

    const obtenerCatalogo = async () => {
      try {
        const [resCategorias, resProductos] = await Promise.all([
          api.get('/categorias/'),
          api.get('/productos/'),
        ]);
        if (!activo) return;
        setCategorias(resCategorias.data.filter((c) => c.activa));
        setProductos(resProductos.data);
      } catch (error) {
        console.error('Error al cargar el catálogo:', error);
      }
    };

    const inicializar = async () => {
      const [configNueva] = await Promise.all([obtenerConfiguracion(), obtenerCatalogo()]);
      if (!activo) return;

      let configFinal = CONFIG_INICIAL;
      if (configNueva) {
        configFinal = configNueva;
        setConfiguracion(configFinal);
      }

      const precargaAssetPesado = configFinal.video_principal
        ? conLimiteDeTiempo(precargarVideo(configFinal.video_principal), 4000)
        : conLimiteDeTiempo(precargarImagen(configFinal.imagen_principal), 4000);

      await Promise.all([
        precargaAssetPesado,
        precargarImagen(configFinal.logo_precarga),
        esperar(TIEMPO_MINIMO_PRECARGA_MS),
      ]);

      if (activo) setCargando(false);
    };

    inicializar();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!leerToken()) return;
    api.get('/clientes/mi-cuenta/')
      .then((res) => setCliente(res.data))
      .catch(() => guardarToken(null));
  }, []);

  const cerrarSesion = () => {
    guardarToken(null);
    setCliente(null);
  };

  const agregarAlCarrito = (producto, cantidad) => {
    const lineaId = `producto-${producto.id}`;
    setItems((prev) => {
      const existente = prev.find((i) => i.lineaId === lineaId);
      if (existente) {
        return prev.map((i) => (i.lineaId === lineaId ? { ...i, cantidad: i.cantidad + cantidad } : i));
      }
      return [...prev, { lineaId, producto, cantidad }];
    });
    setCarritoAbierto(true);
  };

  const cambiarCantidad = (lineaId, cantidad) => {
    if (cantidad <= 0) {
      quitarDelCarrito(lineaId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.lineaId === lineaId ? { ...i, cantidad } : i)));
  };

  const quitarDelCarrito = (lineaId) => {
    setItems((prev) => prev.filter((i) => i.lineaId !== lineaId));
  };

  const valor = {
    configuracion,
    categorias,
    productos,
    cargando,
    items,
    totalItems: items.length,
    carritoAbierto,
    abrirCarrito: () => setCarritoAbierto(true),
    cerrarCarrito: () => setCarritoAbierto(false),
    agregarAlCarrito,
    cambiarCantidad,
    quitarDelCarrito,
    vaciarCarrito: () => setItems([]),
    cliente,
    setCliente,
    cerrarSesion,
    mostrarCuenta,
    abrirCuenta: () => setMostrarCuenta(true),
    cerrarCuenta: () => setMostrarCuenta(false),
  };

  return <TiendaContext.Provider value={valor}>{children}</TiendaContext.Provider>;
}
