const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Checklist = require('../models/Checklist');

// API: Get all checklists for a service
// GET /api/services/:serviceId/checklists
router.get('/services/:serviceId/checklists', async (req, res) => {
    try {
        // Find all bookings associated with the service
        const bookings = await Booking.find({ service: req.params.serviceId }).select('_id').lean();
        if (!bookings.length) {
            return res.json({ checklists: [] });
        }

        const bookingIds = bookings.map(b => b._id);

        // Find all checklists linked to those bookings
        const checklists = await Checklist.find({ booking: { $in: bookingIds } }).sort({ createdAt: 'desc' }).lean();
        
        res.json({ checklists });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching checklists.' });
    }
});

module.exports = router;