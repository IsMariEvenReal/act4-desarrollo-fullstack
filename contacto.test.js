const { EnviarMensaje } = require('./controllers');
const db = require('./db');

jest.mock('./db');

describe('Pruebas unitarias: Envío al formulario de contacto', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                nombre: 'Persona Test',
                email: 'test@correo.com',
                mensaje: 'Hola, este es un mensaje de prueba.'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('debería enviar el mensaje exitosamente (201) si todos los campos están presentes', async () => {
        db.query.mockImplementation((query, valores, callback) => {
            callback(null, { affectedRows: 1 });
        });

        await EnviarMensaje(req, res, next);

        //Verificamos que se llamó a la base de datos con los valores correctos
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO mensaje"),
            ['Persona Test', 'test@correo.com', 'Hola, este es un mensaje de prueba.'],
            expect.any(Function)
        );
        
        //Verificamos la respuesta al cliente
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            mensaje: "¡Mensaje enviado con éxito! Nos pondremos en contacto pronto."
        });
    });

    it('debería retornar 400 si falta algún campo obligatorio', async () => {
        //Simulamos que el cliente no envió el mensaje
        req.body.mensaje = ""; 

        await EnviarMensaje(req, res, next);

        //Verificamos que no se llegó a llamar a la base de datos
        expect(db.query).not.toHaveBeenCalled();
        
        //Verificamos el error de validación
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "Nombre, email y mensaje son obligatorios."
        });
    });

    it('debería pasar el error a next() si ocurre un fallo en el servidor de base de datos', async () => {
        const errorMySQL = new Error('Conexión perdida');
        
        db.query.mockImplementation((query, valores, callback) => {
            callback(errorMySQL, null);
        });

        await EnviarMensaje(req, res, next);

        //Verificamos que el error fue enviado al middleware centralizado
        expect(next).toHaveBeenCalledWith(errorMySQL);
    });
});