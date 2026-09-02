import React from 'react';
import PedidoFormulario from './PedidoFormulario';

// Envoltorio en modal del formulario de pedido. El formulario en sí (y toda su
// lógica) vive en PedidoFormulario, que también se usa embebido en Inicio.
// Si viene `pedido`, el modal es de edición.
export default function PedidoModal({ pedido, productos, categorias, localidades, onClose, onSaved }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-ancho" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{pedido ? `Editar pedido #${pedido.id}` : 'Nuevo pedido'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <PedidoFormulario
          pedido={pedido}
          productos={productos}
          categorias={categorias}
          localidades={localidades}
          onSaved={onSaved}
          onCancelar={onClose}
          variante="modal"
        />
      </div>
    </div>
  );
}
