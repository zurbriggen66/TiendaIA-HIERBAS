from django.contrib.auth import get_user_model
from django.test import TestCase


class AdminLoginTests(TestCase):
    def setUp(self):
        get_user_model().objects.create_user(username='kevin', password='kevin123', is_staff=True)

    def ingresar(self, usuario, password='kevin123'):
        return self.client.post(
            '/api/admin-login/',
            data={'usuario': usuario, 'password': password},
            content_type='application/json',
        )

    def test_entra_con_el_usuario_tal_cual(self):
        self.assertEqual(self.ingresar('kevin').status_code, 200)

    def test_entra_aunque_el_celular_capitalice_el_usuario(self):
        # El teclado del celular manda "Kevin" solo; el dueño escribe bien y lo rechaza.
        self.assertEqual(self.ingresar('Kevin').status_code, 200)
        self.assertEqual(self.ingresar(' KEVIN ').status_code, 200)

    def test_la_contrasena_sigue_siendo_sensible_a_mayusculas(self):
        self.assertEqual(self.ingresar('kevin', 'Kevin123').status_code, 401)

    def test_un_usuario_que_no_es_del_panel_no_entra(self):
        get_user_model().objects.create_user(username='clienta', password='clienta123')
        self.assertEqual(self.ingresar('clienta', 'clienta123').status_code, 401)
