const sql = require('mssql');

const config = {
  user: 'CCONNECT',
  password: 'KEYBOARD99.', 
  server: 'cconnect.database.windows.net', 
  database: 'cc', 
  port:1433,
  options: {
    encrypt: true 
  }
};

async function connectToDatabase() {
  try {
    await sql.connect(config);
    console.log('Connected to the database');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

module.exports = connectToDatabase;
