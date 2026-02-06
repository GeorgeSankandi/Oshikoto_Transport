const express = require('express');
const router = express.Router();
const { ensureAuthenticated, preventCaching } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Checklist = require('../models/Checklist');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const hbs = require('express-handlebars').create();

// @desc    Create new booking
// @route   POST /bookings
router.post('/', ensureAuthenticated, preventCaching, async (req, res) => {
  try {
    const service = await Service.findById(req.body.serviceId);
    if (!service) {
      req.flash('error_msg', 'Service not found.');
      return res.redirect('/services');
    }

    const newBooking = {
      service: req.body.serviceId,
      client: req.user.id,
      provider: service.provider,
      bookingDate: req.body.bookingDate,
      status: 'Pending',
    };

    await Booking.create(newBooking);
    req.flash('success_msg', 'Booking request sent successfully!');
    res.redirect('/dashboard');
} catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Update booking status (for providers/admins)
// @route   POST /bookings/status/:id
router.post('/status/:id', ensureAuthenticated, preventCaching, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if(!booking) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/dashboard');
        }
        // Allow Admin or the specific Provider
        if(booking.provider.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/dashboard');
        }
        
        booking.status = req.body.status;
        await booking.save();
        req.flash('success_msg', 'Booking status updated');
        res.redirect('/dashboard');

    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Delete Booking
// @route   DELETE /bookings/:id
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/dashboard');
        }

        // Authorization Check: Admin, Provider (owner), or Client (owner)
        const isAdmin = req.user.role === 'admin';
        const isProvider = booking.provider.toString() === req.user.id;
        const isClient = booking.client.toString() === req.user.id;

        if (!isAdmin && !isProvider && !isClient) {
            req.flash('error_msg', 'Not Authorized to delete this booking');
            return res.redirect('/dashboard');
        }

        // 1. Delete associated Checklist first (if exists)
        await Checklist.findOneAndDelete({ booking: booking._id });

        // 2. Delete the Booking
        await Booking.deleteOne({ _id: booking._id });

        req.flash('success_msg', 'Booking removed successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Download checklist as PDF
// @route   GET /bookings/:id/checklist/download
router.get('/:id/checklist/download', ensureAuthenticated, async (req, res) => {
    try {
        const checklist = await Checklist.findOne({ booking: req.params.id }).lean();
        if (!checklist) {
            req.flash('error_msg', 'No checklist found for this booking.');
            return res.redirect('/dashboard');
        }

        // Use absolute file path for logo
        const logoPath = path.join(__dirname, '../public/uploads/companylogo.png');
        // Handle case where logo might not exist locally in dev environment
        const logoUrl = fs.existsSync(logoPath) 
            ? `file:///${logoPath.replace(/\\/g, '/')}` 
            : 'https://via.placeholder.com/150x50?text=Oshikoto+Transport';

        // Render the Handlebars template to an HTML string
        const html = await hbs.render(path.join(__dirname, '../views/checklist_pdf.hbs'), {
            data: checklist.formData,
            logoUrl,
            layout: false
        });

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            // Optional: Include CSS inline if needed, but the HBS template handles basic styles
            await page.setContent(html, { waitUntil: 'domcontentloaded' });
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
            });
            await browser.close();
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Length': pdfBuffer.length,
                'Content-Disposition': `attachment; filename="checklist-${req.params.id}.pdf"`
            });
            res.send(pdfBuffer);
        } catch (pdfErr) {
            if (browser) await browser.close();
            console.error('PDF Generation Error:', pdfErr);
            res.status(500).send('PDF generation failed.');
        }

    } catch (err) {
        console.error('Checklist PDF route error:', err);
        res.status(500).send('Checklist PDF route error.');
    }
});

module.exports = router;