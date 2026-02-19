const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin, preventCaching } = require('../middleware/auth');
const SiteContent = require('../models/SiteContent');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Article = require('../models/Article');
const Checklist = require('../models/Checklist');
const { uploadSiteContent } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// @desc    Dashboard Landing
// @route   GET /dashboard
router.get('/', ensureAuthenticated, preventCaching, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            const services = await Service.find().populate('provider').lean();
            const bookings = await Booking.find().populate('client').populate('provider').populate('service').sort({ bookingDate: 'desc' }).lean();
            const providers = await User.find({ role: 'provider' }).lean();
            const articles = await Article.find().sort({ createdAt: 'desc' }).lean();
            const contentDocs = await SiteContent.find().lean();
            const allUsers = await User.find().sort({ createdAt: 'desc' }).lean();

            for (const booking of bookings) {
                const checklist = await Checklist.findOne({ booking: booking._id }).lean();
                booking.hasChecklist = !!checklist;
            }

            const siteContent = contentDocs.reduce((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {});

            const uploadsDir = path.join(__dirname, '../public/uploads');
            let uploadedImages = [];
            if (fs.existsSync(uploadsDir)) {
                const files = fs.readdirSync(uploadsDir);
                uploadedImages = files.filter(file => {
                    return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
                }).map(file => ({
                    name: file,
                    url: '/uploads/' + file
                }));
            }

            res.render('dashboard/admin', {
                user: req.user, 
                services, 
                bookings, 
                providers, 
                allUsers, 
                siteContent, 
                articles,
                uploadedImages, 
                isAdminPage: true,
                hideNavigation: true // Hide nav for Admin
            });
        } else if (req.user.role === 'clerk') {
            const services = await Service.find().populate('provider').lean();
            const bookings = await Booking.find().populate('client').populate('provider').populate('service').lean();
            for (const booking of bookings) {
                const checklist = await Checklist.findOne({ booking: booking._id }).lean();
                booking.hasChecklist = !!checklist;
            }
            res.render('dashboard/clerk', { 
                user: req.user, 
                services, 
                bookings,
                hideNavigation: true // Hide nav for Clerk
            });
        } else if (req.user.role === 'client') {
            const bookings = await Booking.find({ client: req.user.id }).populate('service').populate('provider').sort({ bookingDate: 'desc' }).lean();
            for (const booking of bookings) {
                const checklist = await Checklist.findOne({ booking: booking._id }).lean();
                booking.hasChecklist = !!checklist;
            }
            res.render('dashboard/client', { bookings });
        } else if (req.user.role === 'provider') {
            const services = await Service.find({ provider: req.user.id }).lean();
            const bookings = await Booking.find({ provider: req.user.id }).populate('client').populate('service').lean();
            for (const booking of bookings) {
                const checklist = await Checklist.findOne({ booking: booking._id }).lean();
                booking.hasChecklist = !!checklist;
            }
            res.render('dashboard/provider', { services, bookings });
        } else {
            res.redirect('/');
        }
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});


// @desc    Update Site Content (Includes Contact Page fields)
// @route   POST /dashboard/site-content
router.post('/site-content', ensureAdmin, preventCaching, uploadSiteContent, async (req, res) => {
    try {
        const textContent = req.body;
        const imageContent = req.files;
        const operations = [];

        // 1. Process Text fields
        for (const key in textContent) {
            operations.push({
                updateOne: {
                    filter: { key: key },
                    update: { $set: { value: textContent[key] } },
                    upsert: true
                }
            });
        }

        // 2. Process File uploads
        for (const key in imageContent) {
            if (imageContent[key] && imageContent[key].length > 0) {
                const filePath = '/uploads/' + imageContent[key][0].filename;
                operations.push({
                    updateOne: {
                        filter: { key: key },
                        update: { $set: { value: filePath } },
                        upsert: true
                    }
                });
            }
        }

        if (operations.length > 0) {
            await SiteContent.bulkWrite(operations);
        }

        req.flash('success_msg', 'Site content updated successfully');
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Error updating site content:", err);
        req.flash('error_msg', 'Failed to update content.');
        res.redirect('/dashboard');
    }
});

// @desc    Delete User
// @route   DELETE /dashboard/users/:id
router.delete('/users/:id', ensureAdmin, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.user.id) {
            req.flash('error_msg', 'You cannot delete your own admin account.');
            return res.redirect('/dashboard');
        }
        await User.deleteOne({ _id: req.params.id });
        req.flash('success_msg', 'User removed successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Delete a specific image file from uploads
// @route   DELETE /dashboard/images/:filename
router.delete('/images/:filename', ensureAdmin, async (req, res) => {
    try {
        // Sanitize filename to prevent directory traversal
        const filename = path.basename(req.params.filename);
        const filePath = path.join(__dirname, '../public/uploads', filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            req.flash('success_msg', 'Image deleted successfully');
        } else {
            req.flash('error_msg', 'Image not found');
        }
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting image');
        res.redirect('/dashboard');
    }
});

// ==========================================
// ===  CHECKLIST VIEW/EDIT CONTROLLER    ===
// ==========================================

// @desc    View or Fill Checklist for a Booking
// @route   GET /dashboard/checklist/:bookingId
router.get('/checklist/:bookingId', ensureAuthenticated, async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        
        // 1. Fetch Booking and Service details
        const booking = await Booking.findById(bookingId).populate('service').lean();
        if (!booking) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/dashboard');
        }

        // 2. Check if a checklist already exists
        const existingChecklist = await Checklist.findOne({ booking: bookingId }).lean();

        // 3. Render the Checklist Form
        res.render('checklist_form', { 
            booking,
            checklist: existingChecklist, // Pass existing data if available
            isEditMode: !!existingChecklist,
            page: 'dashboard',
            hideNavigation: true // MODIFIED: Hide nav when viewing checklist form
        });

    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Handle Checklist Submission (Create or Update)
// @route   POST /dashboard/checklist/:bookingId
router.post('/checklist/:bookingId', ensureAuthenticated, async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const formData = req.body;

        // Check if checklist exists
        let checklist = await Checklist.findOne({ booking: bookingId });

        if (checklist) {
            // Update existing
            checklist.formData = formData;
            checklist.submittedBy = req.user.id;
            await checklist.save();
             res.json({ message: 'Checklist updated successfully', redirectUrl: '/dashboard' });
        } else {
            // Create new
            await Checklist.create({
                booking: bookingId,
                formData: formData,
                submittedBy: req.user.id
            });
             res.json({ message: 'Checklist submitted successfully', redirectUrl: '/dashboard' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error saving checklist' });
    }
});

module.exports = router;