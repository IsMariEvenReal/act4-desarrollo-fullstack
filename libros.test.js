const { ObtenerCatalogo, ObtenerListaDeseos, AgregarListaDeseos, EliminarListaDeseos } = require('./controllers');
const db = require('./db');
const bcrypt = require('bcryptjs');

jest.mock('./db'); 
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Pruebas unitarias: Módulo de Lista de Deseos', () => {
    let req, res, next;

    beforeEach(() => {
        //Simulamos que el middleware de autenticación ya puso al usuario en req
        req = {
            user: { id: 10 }, 
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    // --- PRUEBA: OBTENER LISTA ---
    describe('ObtenerListaDeseos', () => {
        it('debería retornar la lista de deseos del usuario', async () => {
            const listaSimulada = [{ id_lista: 1, titulo: 'Don Quijote' }];
            
            db.query.mockImplementation((query, valores, callback) => {
                callback(null, listaSimulada);
            });

            await ObtenerListaDeseos(req, res, next);

            expect(db.query).toHaveBeenCalledWith(expect.any(String), [10], expect.any(Function));
            expect(res.json).toHaveBeenCalledWith(listaSimulada);
        });
    });

    // --- PRUEBA: AGREGAR A LISTA ---
    describe('AgregarListaDeseos', () => {
        it('debería agregar un libro exitosamente (201)', async () => {
            req.body.id_libro = 5;
            db.query.mockImplementation((query, valores, callback) => {
                callback(null, { affectedRows: 1 });
            });

            await AgregarListaDeseos(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ mensaje: '¡Añadido con éxito!' });
        });

        it('debería retornar 409 si el libro ya existe (INSERT IGNORE)', async () => {
            req.body.id_libro = 5;
            db.query.mockImplementation((query, valores, callback) => {
                callback(null, { affectedRows: 0 });
            });

            await AgregarListaDeseos(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ mensaje: "El libro ya está en tu lista" });
        });

        it('debería retornar 400 si no se envía id_libro', async () => {
            req.body.id_libro = null;

            await AgregarListaDeseos(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "No se proporcionó el ID del libro." });
        });
    });

    // --- PRUEBA: ELIMINAR DE LISTA ---
    describe('EliminarListaDeseos', () => {
        it('debería eliminar el libro y responder con 200', async () => {
            req.body.id_libro = 5;
            db.query.mockImplementation((query, valores, callback) => {
                callback(null, { affectedRows: 1 });
            });

            await EliminarListaDeseos(req, res, next);

            expect(db.query).toHaveBeenCalledWith(expect.any(String), [10, 5], expect.any(Function));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ mensaje: 'Libro eliminado de la lista de deseos' });
        });
    });

});
