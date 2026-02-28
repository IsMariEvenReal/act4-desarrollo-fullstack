const express = require('express');
const app = express();

//Carga de dotenv
require('dotenv').config();
const mysql = require('mysql2');

//Se crea conexión
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 4000,
  ssl: { minVersion: 'TLSv1.2',
    rejectUnauthorized: false },
  connectionLimit: 10 // El Pool mantiene hasta 10 conexiones listas
});

/* if (process.env.NODE_ENV !== 'test') {
    pool.connect((err) => {
        if (err) {
            console.error('Error conectando a MySQL: ' + err.stack);
            return;
        }
        console.log('Conectado a MySQL con éxito');
    });
} */

module.exports = pool;