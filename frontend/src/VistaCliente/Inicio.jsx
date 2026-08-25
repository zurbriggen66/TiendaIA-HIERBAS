import React from 'react';
import { useTienda } from './TiendaContext';
import Hero from './Hero';
import MarcasRegistradas from './MarcasRegistradas';
import BannerMayorista from './BannerMayorista';
import Categorias from './Categorias';
import Menu from './Menu';
import Footer from './Footer';

export default function Inicio() {
  const { configuracion, categorias, productos, agregarAlCarrito } = useTienda();

  return (
    <>
      <Hero configuracion={configuracion} />
      <MarcasRegistradas configuracion={configuracion} />
      <BannerMayorista configuracion={configuracion} />
      <Categorias categorias={categorias} />
      <Menu categorias={categorias} productos={productos} onAgregar={agregarAlCarrito} />
      <Footer configuracion={configuracion} />
    </>
  );
}
