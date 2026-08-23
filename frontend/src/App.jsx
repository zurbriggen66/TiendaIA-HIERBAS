import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { TiendaProvider } from './VistaCliente/TiendaContext';
import ClienteLayout from './VistaCliente/ClienteLayout';
import Inicio from './VistaCliente/Inicio';
import CategoriaDetalle from './VistaCliente/CategoriaDetalle';
import ProductoDetalle from './VistaCliente/ProductoDetalle';
import Dashboard from './VistaNegocio/Dashboard/Dashboard';
import DashboardLayout from './VistaNegocio/DashboardLayout';
import RequiereAdmin from './VistaNegocio/RequiereAdmin';
import InicioPage from './VistaNegocio/Inicio/Inicio';
import CategoriasPage from './VistaNegocio/Categorias/CategoriasPage';
import ProductosPage from './VistaNegocio/Productos/ProductosPage';
import PedidosPage from './VistaNegocio/Pedidos/PedidosPage';
import GastosPage from './VistaNegocio/Gastos/GastosPage';
import ProveedoresPage from './VistaNegocio/Proveedores/ProveedoresPage';
import ComprasPage from './VistaNegocio/Compras/ComprasPage';
import EstadisticasPage from './VistaNegocio/Estadisticas/EstadisticasPage';
import ImpresionPage from './VistaNegocio/Impresion/ImpresionPage';

function ConTienda() {
  return (
    <TiendaProvider>
      <Outlet />
    </TiendaProvider>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<ConTienda />}>
          <Route element={<ClienteLayout />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/categoria/:id" element={<CategoriaDetalle />} />
            <Route path="/producto/:id" element={<ProductoDetalle />} />
          </Route>
        </Route>
        <Route path="/admin" element={<RequiereAdmin><DashboardLayout /></RequiereAdmin>}>
          <Route index element={<Dashboard />} />
          <Route path="inicio" element={<InicioPage />} />
          <Route path="categorias" element={<CategoriasPage />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="gastos" element={<GastosPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route path="compras" element={<ComprasPage />} />
          <Route path="estadisticas" element={<EstadisticasPage />} />
          <Route path="impresion" element={<ImpresionPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
