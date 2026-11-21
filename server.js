const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/audio', express.static(path.join(__dirname, 'audio')));
app.use('/archivos', express.static(path.join(__dirname, 'archivos')));

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

async function iniciarDB() {
  if (!pool) {
    console.log('Aviso: no hay DATABASE_URL configurada; el servidor iniciará sin base de datos.');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS opiniones (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      comentario TEXT NOT NULL,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Base de datos conectada y tabla "opiniones" lista.');
}

iniciarDB().catch((err) => {
  console.error('Error al inicializar la base de datos:', err.message);
});

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/comentarios', async (req, res) => {
  if (!pool) {
    return res.render('comentarios', {
      opiniones: [],
      avisoDB: 'Base de datos no conectada todavía (configura DATABASE_URL).'
    });
  }

  try {
    const resultado = await pool.query('SELECT * FROM opiniones ORDER BY fecha DESC');
    res.render('comentarios', { opiniones: resultado.rows, avisoDB: null });
  } catch (error) {
    res.status(500).send('Error al consultar comentarios: ' + error.message);
  }
});

app.post('/comentarios', async (req, res) => {
  if (!pool) {
    return res.status(503).send('No se puede guardar: falta configurar DATABASE_URL.');
  }

  const { nombre, comentario } = req.body;
  try {
    await pool.query(
      'INSERT INTO opiniones (nombre, comentario) VALUES ($1, $2)',
      [nombre, comentario]
    );
    res.redirect('/comentarios');
  } catch (error) {
    res.status(500).send('Error al guardar comentario: ' + error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
