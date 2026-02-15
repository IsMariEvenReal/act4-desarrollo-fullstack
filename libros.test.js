const { ObtenerCatalogo, ObtenerListaDeseos, AgregarListaDeseos, EliminarListaDeseos } = require('./controllers');
const db = require('./db');
const bcrypt = require('bcryptjs');

jest.mock('./db'); 
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Pruebas unitarias: Controlador de Catálogo', () => {
    let req, res, next;

    beforeEach(() => {
        req = {}; // Este controlador no usa datos del body ni params
        res = {
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('debería separar correctamente el último lanzamiento del resto del catálogo', async () => {
        //Preparamos datos ficticios
        const librosSimulados = [
            { id: 1, titulo: 'Libro Antiguo' },
            { id: 2, titulo: 'Libro Nuevo' },
            { id: 3, titulo: 'Último Lanzamiento' }
        ];

        //Mock de la respuesta de MySQL
        db.query.mockImplementation((query, callback) => {
            //Se devuelve el array completo
            callback(null, [...librosSimulados]); 
        });

        //Ejecutamos el controlador
        await ObtenerCatalogo(req, res, next);

        //Verificamos que res.json recibió el objeto con la estructura debida
        expect(res.json).toHaveBeenCalledWith({
            proximo: { id: 3, titulo: 'Último Lanzamiento' },
            catalogo: [
                { id: 1, titulo: 'Libro Antiguo' },
                { id: 2, titulo: 'Libro Nuevo' }
            ]
        });

        // Verificamos que el catálogo resultante tenga 2 elementos
        const llamada = res.json.mock.calls[0][0];
        expect(llamada.catalogo).toHaveLength(2);
    });

    it('debería pasar el error a next() si la consulta SQL falla', async () => {
        const errorDB = new Error('Fallo en el SELECT');
        
        db.query.mockImplementation((query, callback) => {
            callback(errorDB, null);
        });

        await ObtenerCatalogo(req, res, next);

        expect(next).toHaveBeenCalledWith(errorDB);
        expect(res.json).not.toHaveBeenCalled();
    });
});

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