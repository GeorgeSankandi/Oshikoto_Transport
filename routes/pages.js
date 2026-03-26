const express = require('express');
const router = express.Router();
const SiteContent = require('../models/SiteContent');
const Service = require('../models/Service');

// @desc    Show About Us page
// @route   GET /about
router.get('/about', async (req, res) => {
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
            siteContent 
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
        const vehicles = await Service.find().populate('provider').sort({ createdAt: 'desc' }).lean();
        res.render('transportation', {
            page: 'services', // This keeps the hero section consistent
            services: vehicles // Pass vehicles to the template
        });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Show Construction page
// @route   GET /construction
router.get('/construction', async (req, res) => {
    try {
        res.render('construction', { page: 'services' });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Show Technical page
// @route   GET /technical
router.get('/technical', async (req, res) => {
    try {
        res.render('technical', { page: 'services' });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Show General Supply page
// @route   GET /general-supply
router.get('/general-supply', async (req, res) => {
    try {
        res.render('general-supply', { page: 'services' });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

module.exports = router;