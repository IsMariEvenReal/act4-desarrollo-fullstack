const express = require('express');
const app = express();

//Carga de dotenv
require('dotenv').config();
const mysql = require('mysql2');

//Se crea conexión
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_NAME,
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