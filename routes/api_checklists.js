const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Checklist = require('../models/Checklist');

// API: Get the LATEST APPROVED checklist for the CURRENT USER on a specific service
// GET /api/services/:serviceId/checklists
router.get('/services/:serviceId/checklists', async (req, res) => {
    try {
        // 1. Security Check: User must be logged in
        if (!req.user) {
            return res.json({ checklist: null });
        }

        const userId = req.user._id;
        const serviceId = req.params.serviceId;

        // 2. Find the user's latest "Approved" (Confirmed or Completed) booking for this service
        // We sort by bookingDate descending to get the "last relevant" one.
        const lastBooking = await Booking.findOne({
            service: serviceId,
            client: userId,
            status: { $in: ['Confirmed', 'Completed'] } 
        })
        .sort({ bookingDate: -1 })
        .lean();

        if (!lastBooking) {
            return res.json({ checklist: null });
        }

        // 3. Find the checklist associated with that specific booking
        const checklist = await Checklist.findOne({ booking: lastBooking._id }).lean();
        
        // Return the single checklist (or null if the booking exists but checklist isn't filled yet)
        res.json({ checklist });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching checklist.' });
    }
});

module.exports = router;