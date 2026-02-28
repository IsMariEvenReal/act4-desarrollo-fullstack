const express = require('express');
const control = require('./controllers');
const app = express();
const PORT = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const llave_jwt = process.env.SECRET_KEY;
const path = require('path');

const cors = require('cors');
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'] // ¡Es vital que Authorization esté aquí!
}));

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' 'unsafe-eval' https://accounts.google.com/gsi/client; " +
    "frame-src 'self' https://accounts.google.com/gsi/; " +
    "connect-src 'self' https://accounts.google.com/gsi/;"
  );
  next();
});

app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
});

app.use(express.json());

app.use(express.static(__dirname));

//Función para verificación del token
const verificarToken = (req, res, next) => {
    //Obtenemos el token del encabezado 'Authorization'
    const authHeader = req.get('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    console.log("Encabezado Authorization recibido:", authHeader);

    //Si no hay token, rechazamos la petición
    if (!token) {
        return res.status(401).json({ error: "Acceso denegado. No se proporcionó un token." });
    }

    //De otra forma, verificamos si el token es válido
    jwt.verify(token, llave_jwt, (err, usuarioDecodificado) => {
        if (err) {
            return res.status(403).json({ error: "Token inválido o expirado." });
        }

        //Si el token es válido, guardamos los datos del usuario dentro de 'req'
        //para que otras funciones puedan usarlos
        req.user = usuarioDecodificado;

        //'next()' le dice a Express: "Todo bien, pasa a la siguiente función"
        next();
    });
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

//Método POST para el registro de nuevos usuarios
app.post('/registro', control.Registro);

//Método POST para el inicio de sesión
app.post('/login', control.Login);

app.get('/prox', control.ProxLanzamiento);

//Método GET para obtener el catálogo
app.get('/catalogo', control.ObtenerCatalogo);

//Método GET para obtener la lista de deseos
app.get('/deseos', verificarToken, control.ObtenerListaDeseos);

app.post('/deseos', verificarToken, control.AgregarListaDeseos);

app.delete('/deseos', verificarToken, control.EliminarListaDeseos);

app.post('/auth/google/verify', control.AuthGoogle);

//Middleware básico de manejo de errores
app.use((err, req, res, next) => {
    //Imprimimos el error en la consola
    console.error(err.stack);

    //Definimos el estado (si el error tiene uno, lo usamos; si no, el default será 500)
    const statusCode = err.statusCode || 500;

    //Enviamos una respuesta JSON clara al cliente
    res.status(statusCode).json({
        error: {
            mensaje: err.message || 'Ocurrió un error interno en el servidor',
            codigo: statusCode
        }
    });
});

app.listen(PORT, ()=>{
    console.log('Servidor corriendo en el puerto ' + PORT);
});