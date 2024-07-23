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
  const courses = new Map([
    
    [1, { priceInCents: 10000, name: 'Ali', description: 'Providing the basic painting services in local area' }],
    [2, { priceInCents: 15000, name: 'Ahmed', description: 'Providing the basic electrican services' }],
    [3, { priceInCents: 20000, name: 'Yasir', description: 'Providing the water services in local area' }],
    [4, { priceInCents: 25000, name: 'Nirmal', description: 'Providing basic medical services to the local area' }],
    [5, { priceInCents: 30000, name: 'Sanjay', description: 'Provide techinal services in local area' }],
    [6, { priceInCents: 35000, name: 'Saleem', description: 'Provide basic repairing services like washbasin repairing' }],
    [7, { priceInCents: 40000, name: 'Lokesh', description: 'Providing basic home cleaning services in local area' }],
    [8, { priceInCents: 45000, name: 'Bimal', description: 'Providing some electronic services' }],
    [9, { priceInCents: 50000, name: 'Sandeep', description: 'Providing the Home cleaning Services' }],
    [10, { priceInCents: 55000, name: 'Maaz', description: 'Providing some cooking in local area' }],
    [11, { priceInCents: 60000, name: 'Shah', description: 'Providing some ac repairing in local area' }],
    [12, { priceInCents: 65000, name: 'Naseem', description: 'Providing some tv repairing in local area' }],
  
  ])
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: req.body.items.map(item => {
        const course = courses.get(item.id);
        if (!course) {
          throw new Error(`Course with ID ${item.id} not found`);
        }
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.name,
              description: course.description,
            },
            unit_amount: course.priceInCents,
          },
          quantity: item.quantity,
        };
      }),
      success_url: `http://localhost:5173/book_service`,
      cancel_url: `http://localhost:5173/book_service/`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
