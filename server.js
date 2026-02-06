const express = require('express');
const dotenv = require('dotenv');
const exphbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const connectDB = require('./config/db');
const SiteContent = require('./models/SiteContent'); 

// Load config
dotenv.config({ path: './.env' });

// Passport config
require('./config/passport')(passport);

connectDB();

const app = express();

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override
app.use(methodOverride(function (req, res) {
    // Prefer explicit body _method when available (non-multipart forms)
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        let method = req.body._method;
        delete req.body._method;
        return method;
    }
    // Fallback to query parameter for multipart forms where body isn't parsed yet
    if (req.query && '_method' in req.query) {
        return req.query._method;
    }
}));

// Handlebars Helpers
// UPDATED: Import all helpers (including 'replace') from the file
const hbsHelpers = require('./helpers/hbs');

// Handlebars Engine Configuration
const hbs = exphbs.create({
    helpers: hbsHelpers, // Pass all helpers from the file directly
    defaultLayout: 'main',
    extname: '.hbs',
    partialsDir: path.join(__dirname, 'views/partials')
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

// Sessions
app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Middleware to load site content
app.use(async (req, res, next) => {
    try {
        const contentDocs = await SiteContent.find().lean();
        const siteContent = contentDocs.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});
        
        const defaults = {
            home_hero_title: 'Find Trusted Tradespeople, Fast.',
            home_hero_subtitle: 'The modern, reliable way to book verified technical and mechanical services across Namibia.',
            home_hero_image: '/images/default-hero.jpg',
            about_hero_title: 'About Oshikoto Transport',
            about_hero_subtitle: 'Your trusted partner for professional technical and mechanical services in Namibia.',
            about_hero_image: '/images/default-hero.jpg',
            services_hero_title: 'Our Services',
            services_hero_subtitle: 'Find the right professional for your job.',
            services_hero_image: '/images/default-hero.jpg',
            articles_hero_title: 'News & Articles',
            articles_hero_subtitle: 'Updates from the Oshikoto Transport team.',
            articles_hero_image: '/images/default-hero.jpg',
            contact_hero_title: 'Contact Us',
            contact_hero_subtitle: 'Have a question? Get in touch.',
            contact_hero_image: '/images/default-hero.jpg',
            // UPDATED MAP DEFAULT
            contact_map_query: 'Oshikoto Transport & Investment CC, Lafrenz, Windhoek',
        };
        res.locals.siteContent = { ...defaults, ...siteContent };
        next();
    } catch (error) {
        console.error("Failed to load site content:", error);
        next(error);
    }
});

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.now = new Date(); 
  next();
});

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/pages'));
app.use('/services', require('./routes/services'));
app.use('/articles', require('./routes/articles')); 
app.use('/dashboard', require('./routes/dashboard'));
app.use('/bookings', require('./routes/bookings'));
app.use('/api', require('./routes/api'));
app.use('/api', require('./routes/api_checklists'));
app.use('/provider', require('./routes/provider'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));