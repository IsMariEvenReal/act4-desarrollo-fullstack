const express = require('express');
const app = express();

//Carga de dotenv
require('dotenv').config();
const mysql = require('mysql2');

//Se crea conexión
const connection = mysql.createConnection({
    host: process.env.DB_HOST,     // Lee host desde el .env
    user: process.env.DB_USER,     // Lee usuario (de la dueña de la base de datos) desde el .env
    password: process.env.DB_PASS, // Lee contraseña desde el .env
    database: process.env.DB_NAME, // Lee el nombre de la base de datos
    port: process.env.DB_PORT || 4000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true // TiDB recomienda esto para seguridad
    }
});

if (process.env.NODE_ENV !== 'test') {
    connection.connect((err) => {
        if (err) {
            console.error('Error conectando a MySQL: ' + err.stack);
            return;
        }
        console.log('Conectado a MySQL con éxito');
    });
}

module.exports = connection;