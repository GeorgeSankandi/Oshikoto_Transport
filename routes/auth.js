const express = require('express');
const router = express.Router();
const passport = require('passport');
const Service = require('../models/Service');
const User = require('../models/User');
const { preventCaching } = require('../middleware/auth'); 

// Login Page
router.get('/login', (req, res) => res.render('login', {
    layout: 'main',
    page: 'login'
}));

// Register Page
router.get('/register', (req, res) => res.render('register', {
    layout: 'main',
    page: 'register'
}));

// Register Route
router.post('/register', async (req, res) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  // --- Validation Checks ---
  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  // --- STRICT PASSWORD VALIDATION ---
  // 1. Length >= 8
  if (password.length < 8) {
    errors.push({ msg: 'Password must be at least 8 characters long.' });
  }

  // 2. One or two capital letters
  const upperCaseCount = (password.match(/[A-Z]/g) || []).length;
  if (upperCaseCount < 1 || upperCaseCount > 2) {
      errors.push({ msg: 'Password must contain exactly one or two uppercase letters.' });
  }

  // 3. Two or more numbers
  const numberCount = (password.match(/[0-9]/g) || []).length;
  if (numberCount < 2) {
      errors.push({ msg: 'Password must contain 2 or more numbers.' });
  }

  if (errors.length > 0) {
    return res.render('register', { errors, name, email });
  }

  // --- User Creation Logic ---
  try {
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      errors.push({ msg: 'An account with that email already exists' });
      return res.render('register', { errors, name, email });
    }
    
    // Force role to 'client' for all public registrations
    const role = 'client';

    const newUser = new User({ name, email, password, role });
    await newUser.save();
    
    req.flash('success_msg', 'You have successfully registered and can now log in');
    res.redirect('/login');

  } catch (err) {
    console.error('Error during registration:', err);
    req.flash('error_msg', 'Something went wrong on our end. Please try registering again.');
    res.redirect('/register');
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
});

// Logout
router.get('/logout', preventCaching, (req, res, next) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error during logout:', err);
      return next(err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});


// Home Page
router.get('/', async (req, res) => {
    try {
        const services = await Service.find()
            .populate('provider')
            .sort({ createdAt: 'desc' })
            .limit(3)
            .lean();
        res.render('index', { 
            services,
            page: 'home'
        });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

module.exports = router;