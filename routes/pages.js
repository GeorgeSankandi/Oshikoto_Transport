const express = require('express');
const router = express.Router();
const SiteContent = require('../models/SiteContent');
const Service = require('../models/Service');

// @desc    Show About Us page
// @route   GET /about
router.get('/about', async (req, res) => { // <-- Make the function async
    try {
        // Fetch all site content documents from the database
        const contentDocs = await SiteContent.find().lean();
        
        // Convert the array of documents into a simple key-value object
        const siteContent = contentDocs.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});

        res.render('about', {
            page: 'about',
            siteContent // <-- Pass the content object to the template
        });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Show Contact Us page
// @route   GET /contact
router.get('/contact', (req, res) => {
    res.render('contact', {
        page: 'contact'
    });
});

// @desc    Show individual team member page
// @route   GET /team/:id
router.get('/team/:id', async (req, res) => {
  try {
    const contentDocs = await SiteContent.find().lean();
    const siteContent = contentDocs.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    const memberId = req.params.id;
    const member = {
      name: siteContent[`about_team_${memberId}_name`],
      title: siteContent[`about_team_${memberId}_title`],
      image: siteContent[`about_team_${memberId}_image`],
      bio: siteContent[`about_team_${memberId}_bio`] || 'Detailed biography coming soon. Please check back later for more information about this team member.'
    };

    // If a team member with that ID doesn't have a name, it's a 404
    if (!member.name) {
        return res.render('error/404');
    }

    res.render('team_member', {
      page: 'about', // This keeps the 'About' hero section active for consistency
      member,
      siteContent // Pass siteContent to render the hero section correctly
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});


// @desc    Show Transportation/Fleet page
// @route   GET /transportation
router.get('/transportation', async (req, res) => {
    try {
        const vehicles = await Service.find({ category: { $regex: /transport/i } }).populate('provider').sort({ createdAt: 'desc' }).lean();
        res.render('transportation', {
            page: 'services', // This keeps the hero section consistent
            services: vehicles // Pass filtered vehicles to the template
        });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Placeholder for Construction page
// @route   GET /construction
router.get('/construction', (req, res) => {
    try {
        // Show services in the Construction category and render the construction pillar page (with portfolio)
        Service.find({ category: { $regex: /construction|civil/i } }).populate('provider').sort({ createdAt: 'desc' }).lean()
            .then(services => {
                res.render('placeholder', { 
                    page: 'services', 
                    title: 'Civil & Building Construction',
                    context: 'construction',
                    services
                });
            })
            .catch(err => {
                console.error(err);
                res.render('error/500');
            });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Placeholder for Technical Services page
// @route   GET /technical
router.get('/technical', (req, res) => {
    try {
        Service.find({ category: { $regex: /technical|repair/i } }).populate('provider').sort({ createdAt: 'desc' }).lean()
            .then(services => {
                res.render('services/index', { page: 'services', services });
            })
            .catch(err => {
                console.error(err);
                res.render('error/500');
            });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Placeholder for General Supply page
// @route   GET /general-supply
router.get('/general-supply', (req, res) => {
    try {
        Service.find({ category: { $regex: /general|supply|services/i } }).populate('provider').sort({ createdAt: 'desc' }).lean()
            .then(services => {
                res.render('services/index', { page: 'services', services });
            })
            .catch(err => {
                console.error(err);
                res.render('error/500');
            });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});


module.exports = router;