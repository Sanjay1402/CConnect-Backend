const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const app = express();


const connectToDatabase = require('./controllers/dbConfig');

// middle ware
app.use(bodyParser.json());

const port = 3000;

connectToDatabase();

app.post('/register', async (req, res) => {
  const { username, dob, gender, phone, email, password } = req.body;

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // SQL query to insert a new user
  const query = `
    INSERT INTO USER_TBL (USERNAME, DOB, GENDER, PHONE, EMAIL, PASSWORD)
    VALUES (@username, @dob, @gender, @phone, @email, @password)
  `;

  try {
    const request = new sql.Request();
    request.input('username', sql.VarChar, username);
    request.input('dob', sql.Date, dob);
    request.input('gender', sql.VarChar, gender);
    request.input('phone', sql.Char, phone);
    request.input('email', sql.VarChar, email);
    request.input('password', sql.VarChar, hashedPassword);
    await request.query(query);

    res.status(201).send('User registered successfully.');
  } catch (err) {
    res.status(500).send('Error registering user: ' + err.message);
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // SQL query to find the user by email
  const query = `SELECT * FROM USER_TBL WHERE EMAIL = @mail`;

  try {
    const request = new sql.Request();
    request.input('mail', sql.VarChar, email);
    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(400).send('User not found.');
    }

    const user = result.recordset[0];

    // Compare the password with the hashed password
    const isMatch = await bcrypt.compare(password, user.PASSWORD);

    if (!isMatch) {
      return res.status(400).send('Invalid credentials.');
    }

    res.send({
      message: 'Login successful',
      user: {
        id: user.USER_ID,
        username: user.USERNAME,
        email: user.EMAIL
      }
    });
  } catch (err) {
    res.status(500).send('Error logging in: ' + err.message);
  }
});


app.get('/', (req, res) => {
  res.send('Hello World!');
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
