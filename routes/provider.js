const express = require('express');
const router = express.Router();
const { ensureAdmin, preventCaching } = require('../middleware/auth');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

// @desc    Show individual service provider page for admin
// @route   GET /provider/:id
router.get('/:id', ensureAdmin, preventCaching, async (req, res) => {
    try {
        const provider = await User.findById(req.params.id).lean();

        if (!provider || provider.role !== 'provider') {
            req.flash('error_msg', 'Service provider not found.');
            return res.redirect('/dashboard');
        }

        const services = await Service.find({ provider: provider._id }).lean();
        const bookings = await Booking.find({ provider: provider._id })
            .populate('client')
            .populate('service')
            .lean();

        res.render('dashboard/provider_details', {
            provider,
            services,
            bookings
        });

    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

module.exports = router;