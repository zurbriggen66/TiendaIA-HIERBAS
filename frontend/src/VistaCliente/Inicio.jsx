import React from 'react';
import { useTienda } from './TiendaContext';
import Hero from './Hero';
import MarcasRegistradas from './MarcasRegistradas';
import BannerMayorista from './BannerMayorista';
import Insignias from './Insignias';
import Categorias from './Categorias';
import Menu from './Menu';
import Footer from './Footer';

export default function Inicio() {
  const { configuracion, categorias, productos, agregarAlCarrito } = useTienda();

  return (
    <>
      <Hero configuracion={configuracion} />
      <div className="destacados-inicio">
        <div className="destacados-inicio-fila">
          <MarcasRegistradas configuracion={configuracion} />
          <BannerMayorista configuracion={configuracion} />
          <Insignias />
        </div>
      </div>
      <Categorias categorias={categorias} />
      <Menu categorias={categorias} productos={productos} onAgregar={agregarAlCarrito} />
      <Footer configuracion={configuracion} />

      <style>{`
        /* En mobile, "¿Quiénes somos?" y "Explorá nuestro catálogo" se ven una
           abajo de la otra, cada una con su propio fondo/padding (sin cambios).
           A partir de acá comparten una sola fila y un solo fondo/padding en vez
           de dos separados — así quedan pegadas en vez de con un salto en el medio. */
        /* El fondo verde y el padding van en ".destacados-inicio" (ocupa todo el
           ancho de la ventana); ".destacados-inicio-fila" adentro es la que
           limita el ancho del contenido y lo centra, para que las tarjetas no
           terminen gigantes en un monitor muy ancho. */
        @media (min-width: 640px) {
          .destacados-inicio {
            width: 100%;
            padding: 56px 20px;
            background: var(--surface-2, #dee5da);
          }

          .destacados-inicio-fila {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            justify-content: center;
            gap: 32px;
            max-width: 1300px;
            margin: 0 auto;
          }
        }

        /* De 900px para arriba entran las Insignias como tercera columna: se
           pasa a grid (en vez de flex) con columnas explícitas en fr — así el
           ancho de cada tarjeta lo define la columna, no el contenido de
           adentro (ver el comentario en MarcasRegistradas.jsx sobre por qué
           "auto" rompía la imagen). align-items:stretch iguala el alto de
           las 3 en vez de que cada una tenga el suyo. */
        @media (min-width: 900px) {
          .destacados-inicio {
            padding: 72px 20px;
          }

          .destacados-inicio-fila {
            display: grid;
            grid-template-columns: 0.85fr 1.15fr 0.85fr;
            align-items: stretch;
            gap: 28px;
            max-width: 1400px;
          }
        }
      `}</style>
    </>
  );
}
