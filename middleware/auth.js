// In middleware/auth.js

module.exports = {
  ensureAuthenticated: function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error_msg', 'Please log in to view that resource');
    res.redirect('/login');
  },
  ensureProvider: function(req, res, next) {
    if(req.isAuthenticated() && (req.user.role === 'provider' || req.user.role === 'admin')) {
        return next();
    }
    req.flash('error_msg', 'You must be a Service Provider to access this page');
    res.redirect('/dashboard');
  },
  ensureAdmin: function(req, res, next) {
    if(req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'This action requires Admin privileges');
    res.redirect('/dashboard');
  },
  
  // --- ADD THIS NEW MIDDLEWARE FUNCTION ---
  preventCaching: function(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  }
};