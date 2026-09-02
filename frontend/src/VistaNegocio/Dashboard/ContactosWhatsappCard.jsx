import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { notificar } from '../notificaciones';

// CRUD de los números de WhatsApp que aparecen en la página "Chatear con..." de la
// tienda. Es independiente del formulario de "Configuración Visual" (modelo aparte).
export default function ContactosWhatsappCard() {
  const [contactos, setContactos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    api.get('/contactos-whatsapp/')
      .then(({ data }) => setContactos(data))
      .catch((error) => console.error('Error al cargar contactos de WhatsApp:', error));
  };

  useEffect(() => { cargar(); }, []);

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !numero.trim()) {
      notificar('Poné un nombre y un número.');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/contactos-whatsapp/', {
        nombre: nombre.trim(),
        numero: numero.trim(),
        orden: contactos.length,
      });
      setNombre('');
      setNumero('');
      cargar();
    } catch (error) {
      console.error('Error al agregar el contacto:', error);
      notificar('No se pudo agregar el contacto.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    try {
      await api.delete(`/contactos-whatsapp/${id}/`);
      cargar();
    } catch (error) {
      console.error('Error al eliminar el contacto:', error);
      notificar('No se pudo eliminar el contacto.');
    }
  };

  return (
    <div className="form-card">
      <h3 className="form-card-title">Contactos de WhatsApp</h3>
      <p className="form-ayuda" style={{ marginTop: 0 }}>
        Son los números que ve el cliente al tocar el botón de WhatsApp (pantalla "Chatear con…").
        Podés cargar varios: ventas, mayorista, consultas, etc. El número va en formato
        internacional, solo dígitos (ej: 5493511234567).
      </p>

      {contactos.length > 0 && (
        <div className="pedido-filas" style={{ marginBottom: 16 }}>
          {contactos.map((c) => (
            <div key={c.id} className="pedido-fila">
              <div className="pedido-item-fila-info" style={{ flex: 1 }}>
                <strong>{c.nombre}</strong>
                <span>{c.numero}</span>
              </div>
              <button type="button" className="pedido-fila-quitar" onClick={() => eliminar(c.id)} title="Quitar">✕</button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={agregar}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Ventas"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Número</label>
            <input
              type="tel"
              className="input-vibrante"
              placeholder="5493511234567"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions-right">
          <button type="submit" className="btn-vibrante" disabled={guardando}>
            {guardando ? 'Agregando...' : '+ Agregar contacto'}
          </button>
        </div>
      </form>
    </div>
  );
}
