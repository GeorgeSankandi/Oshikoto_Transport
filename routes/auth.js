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

// REMOVED: GET /register and POST /register routes have been completely removed.

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