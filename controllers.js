const db = require('./db');
const jwt = require('jsonwebtoken');
const llave_jwt = process.env.SECRET_KEY;
const bcrypt = require('bcryptjs');
const saltRounds = 10; // Nivel de seguridad
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("605750387077-bdif5mblfjdii3sogiqr5iscpt0gt9q2.apps.googleusercontent.com");
const provider = 'google';

async function Registro (req, res, next) {
    const { email, password } = req.body;

    //Se genera el hash de forma asíncrona
    //Generamos hash para no guardar la contraseña directamente en la base de datos
    const passwordHash = await bcrypt.hash(password, saltRounds);

    //El hash se guarda en MySQL
    const query = "INSERT INTO usuarios (email, pass) VALUES (?, ?)";
    db.query(query, [email, passwordHash], (err, results) => {
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

function ProxLanzamiento (req, res, next) {
    const queryGetProx = 'SELECT * FROM libros ORDER BY id DESC LIMIT 1';

    db.query(queryGetProx, (err, results) => {
        if (err) {
            return next(err);
        }
        else{
            const prox = results.pop();
            res.json({ proximo: prox }); // Esto enviará un JSON con toda la info lista para el HTML
        }
    });
}

function ObtenerCatalogo (req, res, next) {
    const page = parseInt(req.query.page) || 1; // Página actual, por defecto 1
    const offset = (page - 1) * 3;
    const queryProx = 'SELECT * FROM libros ORDER BY id DESC LIMIT 1';

    db.query(queryProx, (err, results) => {
        if(err){
            return next(err);
        }
        else {
            const proxExcluido = results[0].id;
            const queryGetLibros = 'SELECT * FROM libros WHERE id != ? ORDER BY id DESC LIMIT ? OFFSET ?';

            db.query(queryGetLibros, [proxExcluido, 3, offset], (err, results) => {
                if(err){
                    return next(err);
                }
                else {
                    const catalogoActual = results;
                    const queryTotalRegistros = 'SELECT COUNT(*) AS total FROM libros WHERE id != ?';

                    db.query(queryTotalRegistros, [proxExcluido], (err, results) => {
                        if(err){
                            return next(err);
                        }
                        else {
                            const totalRegistros = results[0].total;

                            res.json({
                                catalogo: catalogoActual,
                                totalPaginas: Math.ceil(totalRegistros / 3),
                                paginaActual: page
                            });
                        }
                    });
                }
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

//Controlador para autenticación con Google (OAuth)
async function AuthGoogle(req, res) {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: "605750387077-bdif5mblfjdii3sogiqr5iscpt0gt9q2.apps.googleusercontent.com",
        });
        const payload = ticket.getPayload();
        const { sub: provider_id, email, name } = payload;

        // 1. BUSCAR VÍNCULO
        db.query('SELECT id_usuario FROM usuarios_externos WHERE provider_id = ?', [provider_id], (err, extResults) => {
            if (err) {
                console.error("--- ERROR EN SELECT USUARIOS_EXTERNOS ---");
                console.error(err.message);
                return res.status(500).json({ error: 'Error DB', detalle: err.message });
            }

            if (extResults.length > 0) {
                const miToken = jwt.sign({ id: extResults[0].id_usuario, email }, llave_jwt, { expiresIn: '2h' });
                return res.json({ success: true, token: miToken });
            }

            // 2. BUSCAR EMAIL EN TABLA PRINCIPAL
            db.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email], (err, userResults) => {
                if (err) {
                    console.error("--- ERROR EN SELECT USUARIOS ---");
                    console.error(err.message);
                    return res.status(500).json({ error: 'Error DB' });
                }

                if (userResults.length > 0) {
                    // El usuario ya existe en la tabla principal, usamos la función interna para vincular
                    vincularYEnviar(userResults[0].id_usuario);
                } else {
                    // 3. INSERTAR NUEVO USUARIO
                    db.query('INSERT INTO usuarios (email) VALUES (?)', [email], (err, insertRes) => {
                        if (err) return res.status(500).json({ error: 'Error al crear usuario' });

                        const idGenerado = insertRes.insertId || (insertRes.results && insertRes.results.insertId);
                        console.log("ID capturado para vincular:", idGenerado);

                        if (!idGenerado) {
                            return res.status(500).json({ error: 'El servidor no pudo recuperar el ID generado' });
                        }

                        // El segundo INSERT: Vinculamos el nuevo usuario
                        db.query(
                            'INSERT INTO usuarios_externos (id_usuario, provider, provider_id) VALUES (?, "google", ?)',
                            [idGenerado, provider_id], 
                            (err) => {
                                if (err) {
                                    console.error("Error en vinculación:", err.message);
                                    return res.status(500).json({ error: 'Error al vincular' });
                                }

                                const miToken = jwt.sign({ id: idGenerado, email }, llave_jwt, { expiresIn: '2h' });
                                res.json({ success: true, token: miToken });
                            }
                        );
                    });
                }
            });

            // Definición de la función interna para vincular usuarios existentes
            function vincularYEnviar(userId) {
                db.query(
                    'INSERT INTO usuarios_externos (id_usuario, provider, provider_id) VALUES (?, "google", ?)',
                    [userId, provider_id],
                    (err) => {
                        if (err) {
                            console.error("--- ERROR EN INSERT VÍNCULO ---");
                            console.error(err.message);
                            return res.status(500).json({ error: 'Error DB' });
                        }
                        const miToken = jwt.sign({ id: userId, email }, llave_jwt, { expiresIn: '2h' });
                        res.json({ success: true, token: miToken });
                    }
                );
            }
        });

    } catch (e) {
        res.status(401).json({ error: "Token de Google inválido" });
    }
}

module.exports = { Registro, Login, ObtenerCatalogo, ObtenerListaDeseos, AgregarListaDeseos, EliminarListaDeseos, ProxLanzamiento, AuthGoogle }