const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();


const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// Configuración de la conexión a MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Conectar a MySQL
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Conectado a MySQL');
});

// Crear la base de datos y las tablas
db.query('CREATE DATABASE IF NOT EXISTS Habilidades_Blandas', (err) => {
  if (err) throw err;

  db.query('USE Habilidades_Blandas', (err) => {
    if (err) throw err;

    // Tabla de usuarios
    db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY
      )
    `, (err) => {
      if (err) throw err;
    });

    // Tabla de preguntas
    db.query(`
      CREATE TABLE IF NOT EXISTS preguntas (
        id NVARCHAR(50) PRIMARY KEY,  
        enunciado NVARCHAR(500)
      )
    `, (err) => {
      if (err) throw err;
    });

    db.query(`
      CREATE TABLE IF NOT EXISTS opciones (
        id INT PRIMARY KEY,  
        respuesta NVARCHAR(50)
      )
    `, (err) => {
      if (err) throw err;
    });

    // Tabla de respuestas de usuarios
    db.query(`
      CREATE TABLE IF NOT EXISTS respuestas_usuario (
        usuario_id INT,
        pregunta_id NVARCHAR(50), 
        id_respuesta int,
        respuesta NVARCHAR(50),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (pregunta_id) REFERENCES preguntas(id),
        FOREIGN KEY (id_respuesta) REFERENCES opciones(id)
      )
    `, (err) => {
      if (err) throw err;
    });
  });
});

// Ruta para obtener preguntas
app.get('/preguntas', (req, res) => {
  db.query('SELECT * FROM preguntas', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.get('/opciones', (req, res) => {
  db.query('SELECT id, respuesta FROM opciones',(err, results) => {
    if (err) {
      console.error('Error fetching options:', err);
      res.status(500).json({ error: 'Error fetching options' });
    } else {
      res.json(results);
    }
  });
});


// Ruta para registrar un usuario
app.post('/usuarios', async (req, res) => {
  try {
    console.log('Verificando si la tabla de usuarios está vacía...');
    const [rows] = await db.promise().query('SELECT COUNT(*) as count FROM usuarios');
    const userCount = rows[0].count;
    console.log('Número de usuarios en la tabla:', userCount);

    let newUserId;

    if (userCount === 0) {
      console.log('La tabla está vacía. Insertando usuario con id = 1...');

      // Insertar manualmente el primer usuario con id = 1
      await db.promise().query('INSERT INTO usuarios (id) VALUES (1)');
      newUserId = 1;

      console.log('Usuario insertado con id = 1.');
    } else {
      console.log('La tabla no está vacía. Calculando el próximo id...');

      // Obtener el máximo id actual
      const [maxIdResult] = await db.promise().query('SELECT MAX(id) as maxId FROM usuarios');
      const maxId = maxIdResult[0].maxId;

      // Calcular el próximo id
      newUserId = maxId + 1;

      // Insertar el nuevo usuario con el id calculado
      await db.promise().query('INSERT INTO usuarios (id) VALUES (?)', [newUserId]);

      console.log('Usuario insertado con id:', newUserId);
    }

    res.json({ userId: newUserId });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Ruta para guardar respuestas del usuario
app.post('/respuestas', (req, res) => {
  const { usuario_id, pregunta_id, id_respuesta, respuesta } = req.body;

  console.log("Datos recibidos en /respuestas:", req.body);

  if (!usuario_id || !pregunta_id || !id_respuesta || !respuesta) {
    return res.status(400).json({ error: "Faltan datos en la solicitud" });
  }

  const query = 'INSERT INTO respuestas_usuario (usuario_id, pregunta_id, id_respuesta, respuesta) VALUES (?, ?, ?, ?)';
  db.query(query, [usuario_id, pregunta_id, id_respuesta, respuesta], (err, results) => {
    if (err) {
      console.error("Error guardando la respuesta:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
    res.json({ success: true });
  });
});

app.listen(port,'0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});