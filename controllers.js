const db = require('./db');
const jwt = require('jsonwebtoken');
const llave_jwt = process.env.SECRET_KEY;
const bcrypt = require('bcryptjs');
const saltRounds = 10; // Nivel de seguridad

async function Registro (req, res, next) {
    const { email, password } = req.body;

    //Se genera el hash de forma asíncrona
    //Generamos hash para no guardar la contraseña directamente en la base de datos
    const passwordHash = await bcrypt.hash(password, saltRounds);

    //El hash se guarda en MySQL
    const query = "INSERT INTO usuarios (email, pass) VALUES (?, ?)";
    db.query(query, [email, passwordHash], (err, result) => {
        if (err) {
            //Esta línea hace que el middleware de manejo de errores se ocupe de este error
            return next(err);
        }
        res.json({ mensaje: "Usuario creado con éxito" });
    });
}

function Login (req, res, next) {
    const { email, password } = req.body;

    // Se busca al usuario por email para obtener su hash
    const query = "SELECT id_usuario, email, pass FROM usuarios WHERE email = ?";

    db.query(query, [email], async (err, results) => {
        if (err) {
            return next(err);
        }

        // Se verifica si el usuario existe
        if (results.length === 0) {
            //Enviamos respuesta al frontend en caso de que no
            return res.status(401).json({ error: "El correo no está registrado." });
        }
        const usuario = results[0];

        // Se compara la contraseña ingresada con el hash en la base de datos
        const coinciden = await bcrypt.compare(password, usuario.pass);

        // Si no coinciden, se envía error
        if (!coinciden) {
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        //Si todo es correcto, generamos el JWT
        //Guardamos el id_usuario dentro del token para que el middleware (verificarToken) lo use después
        const token = jwt.sign(
            { id: usuario.id_usuario }, 
            llave_jwt, 
            { expiresIn: '2h' }
        );

        res.json({
            mensaje: 'Autenticación exitosa',
            token: token
        });
    });
}

function ObtenerCatalogo (req, res, next) {
    const queryGetLibros = 'SELECT * FROM libros ORDER BY id ASC';

    db.query(queryGetLibros, (err, results) => {
        if (err) {
            return next(err);
        }
        else {
            //Obtenemos el último lanzamiento
            const proximoLanzamiento = results.pop();

            //Lo que quedó en 'results' después del pop se guarda como el resto del catálogo
            const catalogoActual = results;

            //Obtenemos un objeto con la información de próximo lanzamiento Y el catálogo actual
            res.json({
                proximo: proximoLanzamiento,
                catalogo: catalogoActual
            });
        }     
    });
}

function ObtenerListaDeseos (req, res, next) {
    let id_usuario_token = req.user.id;
    const queryGetDeseos = `
        SELECT deseos.id_lista, libros.titulo, libros.autor, libros.descripcion, libros.url_portada, libros.alt_portada, libros.id
        FROM deseos
        INNER JOIN libros ON deseos.id_libro = libros.id
        WHERE deseos.id_usuario = ?
    `;

    db.query(queryGetDeseos, [id_usuario_token], (err, results) => {
        if (err) {
            return next(err);
        }
        else{
            res.json(results); // Esto enviará un JSON con toda la info lista para el HTML
        }
    });
}

function AgregarListaDeseos (req, res, next) {
    let id_usuario_token = req.user.id;
    let id_libro = req.body.id_libro;
    const queryPost = "INSERT IGNORE INTO deseos (id_usuario, id_libro) VALUES (?, ?)";

    // Validación de seguridad para que no llegue null a la DB
    if (!id_libro) {
        return res.status(400).json({ error: "No se proporcionó el ID del libro." });
    }

    //Se pasa un arreglo para evitar inyecciones SQL
    db.query(queryPost, [id_usuario_token, id_libro], (err, results)=>{
        if (err){
            return next(err);
        }

        if (results.affectedRows === 0) {
            // El UNIQUE evitó el duplicado
            return res.status(409).json({ mensaje: "El libro ya está en tu lista" });
        }

        //Si se llegó aquí, es porque se insertó correctamente
        res.status(201).json({ mensaje: '¡Añadido con éxito!' });
    });
}

function EliminarListaDeseos (req, res, next) {
    let id_usuario_token = req.user.id;
    let id_libro = req.body.id_libro;
    const queryDel = "DELETE FROM deseos WHERE id_usuario = ? AND id_libro = ?";

    db.query(queryDel, [id_usuario_token, id_libro], (err, results)=> {
        if (err) {
            return next(err);
        }

        res.status(200).json({mensaje: 'Libro eliminado de la lista de deseos'});
    });
}

function EnviarMensaje (req, res, next) {
    const { nombre, email, mensaje} = req.body;

    //Se confirma que no se intente enviar un formulario sin los datos requeridos
    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ error: "Nombre, email y mensaje son obligatorios." });
    }

    const queryMensaje = `
        INSERT INTO mensaje (nombre, email, mensaje) 
        VALUES (?, ?, ?)
    `;

    const valores = [nombre, email, mensaje];

    db.query(queryMensaje, valores, (err, result) => {
        if (err) {
            return next(err); // Usamos el middleware de errores centralizado
        }
        
        res.status(201).json({ 
            mensaje: "¡Mensaje enviado con éxito! Nos pondremos en contacto pronto." 
        });
    });
}

module.exports = { Registro, Login, ObtenerCatalogo, ObtenerListaDeseos, AgregarListaDeseos, EliminarListaDeseos, EnviarMensaje }