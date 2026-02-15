//PRUEBAS UNITARIAS PARA CONTROLADORES DE REGISTRO E INICIO DE SESIÓN

const { Registro, Login } = require('./controllers'); //Ruta de los controladores
const db = require('./db'); //Conexión a MySQL
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//Gracias a "mock", la conexión a MySQL + la generación de hashes y JWT no serán reales
jest.mock('./db'); 
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Pruebas unitarias: Controlador de Registro', () => {
    let req, res, next;

    //Se ejecuta antes de cada test para limpiar los objetos
    beforeEach(() => {
        req = {
            body: {
                email: 'ingeniera@software.com',
                password: 'password123'
            }
        };
        //Creamos funciones "espía" con jest.fn()
        res = {
            json: jest.fn()
        };
        next = jest.fn();
        
        //Limpiamos rastros de pruebas anteriores
        jest.clearAllMocks();
    });

    it('debería registrar un usuario exitosamente cuando los datos son correctos', async () => {
        //Simulamos que bcrypt devuelve un hash sin procesar realmente
        bcrypt.hash.mockResolvedValue('hash_seguro_simulado');

        //Simulamos que MySQL responde con éxito (callback)
        //Implementamos manualmente el comportamiento de db.query
        db.query.mockImplementation((query, valores, callback) => {
            callback(null, { affectedRows: 1 });
        });

        //Ejecutamos la función del controlador
        await Registro(req, res, next);

        //Verificaciones (Expectativas)
        expect(bcrypt.hash).toHaveBeenCalledWith('password123', expect.any(Number));
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO usuarios"),
            ['ingeniera@software.com', 'hash_seguro_simulado'],
            expect.any(Function)
        );
        expect(res.json).toHaveBeenCalledWith({ mensaje: "Usuario creado con éxito" });
        expect(next).not.toHaveBeenCalled();
    });

    it('debería llamar a next() con un error si MySQL falla', async () => {
        bcrypt.hash.mockResolvedValue('hash_falso');

        //Simulamos un error de base de datos (en este caso, un email duplicado)
        const errorSimulado = new Error('Error de conexión a MySQL');
        db.query.mockImplementation((query, valores, callback) => {
            callback(errorSimulado, null);
        });

        await Registro(req, res, next);

        //Verificamos que el error llegó al middleware de errores
        expect(next).toHaveBeenCalledWith(errorSimulado);
        expect(res.json).not.toHaveBeenCalled();
    });
});

describe('Pruebas unitarias: Controlador de Login', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                email: 'estudiante@ingenieria.com',
                password: 'password1234'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(), // Permite encadenar .status().json()
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('debería autenticar con éxito y devolver un token (si encuentra el usuario)', async () => {
        //Simulamos que MySQL encuentra al usuario
        const usuarioSimulado = { id_usuario: 1, email: 'test@test.com', pass: 'hash_en_db' };
        db.query.mockImplementation((query, valores, callback) => {
            callback(null, [usuarioSimulado]); // Simulamos array con un usuario
        });

        //Simulamos que la contraseña coincide
        bcrypt.compare.mockResolvedValue(true);

        //Simulamos la generación del JWT
        jwt.sign.mockReturnValue('token_falso_123');

        await Login(req, res, next);

        //Verificaciones
        expect(res.json).toHaveBeenCalledWith({
            mensaje: 'Autenticación exitosa',
            token: 'token_falso_123'
        });
    });

    it('debería devolver error 401 si el correo no existe', async () => {
        //Simulamos que MySQL devuelve un array vacío
        db.query.mockImplementation((query, valores, callback) => {
            callback(null, []); 
        });

        await Login(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "El correo no está registrado." });
    });

    it('debería devolver error 401 si la contraseña es incorrecta', async () => {
        //Simulamos que el usuario existe
        db.query.mockImplementation((query, valores, callback) => {
            callback(null, [{ id_usuario: 1, pass: 'hash_en_db' }]);
        });

        //Simulamos que bcrypt dice que NO coinciden
        bcrypt.compare.mockResolvedValue(false);

        await Login(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Contraseña incorrecta." });
    });
});