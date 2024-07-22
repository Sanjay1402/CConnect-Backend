const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config()


const app = express();

app.use(cors());
app.use(express.static('public'))
const connectToDatabase = require('./controllers/dbConfig');

app.use(express.json())
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)
const courses = new Map([
    
  [1, {priceInCents:10000, name:'Yasir Plumber' }],

])






// middle ware
app.use(bodyParser.json());

const port = 3000;

connectToDatabase();

app.post('/register', async (req, res) => {
  const { username, dob, gender, phone, email, cnic,password } = req.body;

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // SQL query to insert a new user
  const query = `
    INSERT INTO USER_TBL (USERNAME, DOB, GENDER, PHONE, EMAIL, CNIC, PASSWORD)
    VALUES (@username, @dob, @gender, @phone, @email, @cnic, @password)
  `;

  try {
    const request = new sql.Request();
    request.input('username', sql.VarChar, username);
    request.input('dob', sql.Date, dob);
    request.input('gender', sql.VarChar, gender);
    request.input('phone', sql.Char, phone);
    request.input('email', sql.VarChar, email);
    request.input('cnic', sql.Char, cnic)
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


// Fetch categories
app.get('/categories', async (req, res) => {
  const query = 'SELECT * FROM CATEGORY';

  try {
    const request = new sql.Request();
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send('Error fetching categories: ' + err.message);
  }
});

// Fetch services by category ID
app.get('/services/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  const query = 'SELECT * FROM SERVICES WHERE CATEGORY_ID = @categoryId';

  try {
    const request = new sql.Request();
    request.input('categoryId', sql.Int, categoryId);
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send('Error fetching services: ' + err.message);
  }
});

app.post('/create-checkout-session', async (req, res) => {

  
  try{
     const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: req.body.items.map(item => {
          const course = courses.get(item.id)
          return {
              price_data:{
                  currency:'usd',
                  product_data: {
                      name: course.name
                  },
                  unit_amount: course.priceInCents
              },
              quantity: item.quantity
          }
      }),
      success_url: `${process.env.SERVER_URL}/success.html`,
      cancel_url: `${process.env.SERVER_URL}/cancel.html`
     })
     res.json({url: session.url})
  }catch(e){
      res.status(500).json({error: e.message})
  }
})


app.get('/', (req, res) => {
  res.send('Hello World!');
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
