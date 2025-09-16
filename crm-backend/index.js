require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// Passport Middleware
require('./config/passport')(passport); // Pass passport for configuration
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 API Server running on port ${PORT}`));