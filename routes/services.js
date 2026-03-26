const express = require('express');
const router = express.Router();
const { uploadService } = require('../middleware/upload');
const { ensureAuthenticated, ensureProvider, ensureAdmin, ensureCanEditServices } = require('../middleware/auth'); 
const Service = require('../models/Service');

// @desc    Show all services
// @route   GET /services
router.get('/', async (req, res) => {
    try {
        const services = await Service.find().populate('provider').sort({ createdAt: 'desc' }).lean();
        res.render('services/index', { 
            services,
            page: 'services' 
        });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Show add page
// @route   GET /services/add
router.get('/add', ensureProvider, (req, res) => {
    res.render('services/add');
});

// @desc    Process add form
// @route   POST /services
router.post('/', ensureProvider, uploadService, async (req, res) => {
    try {
        req.body.provider = req.user.id;
        
        let filesMap = req.files || {};
        if (Array.isArray(req.files)) {
            filesMap = {};
            req.files.forEach(f => {
                if (!filesMap[f.fieldname]) filesMap[f.fieldname] = [];
                filesMap[f.fieldname].push(f);
            });
        }

        // 1. Service Image
        if (filesMap.serviceImage && filesMap.serviceImage[0]) {
            req.body.imageUrl = '/uploads/' + filesMap.serviceImage[0].filename;
        }

        // 2. Fleet Documents
        const fleetDocs = [];
        for (let i = 1; i <= 5; i++) {
            const nameField = `fleet_doc_${i}_name`;
            const fileField = `fleet_doc_${i}`;
            const docName = req.body[nameField];
            
            if ((filesMap[fileField] && filesMap[fileField][0]) || docName) {
                const docUrl = (filesMap[fileField] && filesMap[fileField][0]) 
                    ? '/uploads/' + filesMap[fileField][0].filename 
                    : '';

                const fleetDoc = { 
                    name: docName || `Document ${i}`, 
                    url: docUrl, 
                    checklist: [] 
                };
                
                // Parse checklist items
                let itemIndex = 1;
                while (true) {
                    const itemKey = `fleet_doc_${i}_checklist_${itemIndex}_item`;
                    const catKey = `fleet_doc_${i}_checklist_${itemIndex}_category`;
                    if (req.body[itemKey]) {
                        fleetDoc.checklist.push({ item: req.body[itemKey], category: req.body[catKey] || 'General' });
                        itemIndex++;
                    } else break;
                }
                fleetDocs.push(fleetDoc);
            }
        }
        if (fleetDocs.length > 0) req.body.fleetDocs = fleetDocs;

        // 4. Checklist Template JSON
        if (req.body.checklist_template_json) {
            try {
                req.body.checklistTemplate = JSON.parse(req.body.checklist_template_json);
            } catch (err) { /* ignore */ }
        }

        // Parse Work Ticket JSON
        if (req.body.work_ticket_template_json) {
            try {
                req.body.workTicketTemplate = JSON.parse(req.body.work_ticket_template_json);
            } catch (err) { /* ignore */ }
        }

        req.body.onSale = !!req.body.onSale;

        // Automatically log the creator in the edit history
        req.body.editHistory = [{
            editorName: req.user.name,
            editorRole: req.user.role,
            editedAt: Date.now()
        }];

        await Service.create(req.body);
        req.flash('success_msg', 'Service created successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Show single service
// @route   GET /services/:id
router.get('/:id', async (req, res) => {
    try {
        let service = await Service.findById(req.params.id).populate('provider').lean();
        if (!service) {
            return res.render('error/404');
        }
        const isTransport = (service.category && (service.category.includes('Transportation') || service.category.includes('Carwash') || ['Otjiwarongo', 'Karibib', 'Walvis Bay', 'Oranjemund'].includes(service.category)));

        res.render('services/show', { 
            service,
            isWhiteBackground: isTransport 
        });
    } catch (err) {
        console.error(err);
        res.render('error/404');
    }
});

// @desc    Show edit page
// @route   GET /services/edit/:id
router.get('/edit/:id', ensureCanEditServices, async (req, res) => {
    try {
        const service = await Service.findOne({ _id: req.params.id }).lean();
        if (!service) return res.render('error/404');
        
        if (req.user.role === 'provider' && service.provider.toString() !== req.user.id) {
            req.flash('error_msg', 'Not Authorized');
            return res.redirect('/services');
        }

        // Restrict Clerk from loading the edit page if they already edited it once
        if (req.user.role === 'clerk' && service.clerkHasEditedTemplate) {
            req.flash('error_msg', 'You have already configured this service template. Further edits are restricted.');
            return res.redirect('/dashboard');
        }

        res.render('services/edit', { 
            service,
            hideNavigation: true 
        });
    } catch (err) {
        console.error(err);
        return res.render('error/500');
    }
});

// @desc    Update service
// @route   PUT /services/:id
router.put('/:id', ensureCanEditServices, uploadService, async (req, res) => {
    try {
        let service = await Service.findById(req.params.id).lean();
        if (!service) return res.render('error/404');
        
        if (req.user.role === 'provider' && service.provider.toString() !== req.user.id) {
            req.flash('error_msg', 'Not Authorized');
            return res.redirect('/services');
        }
        
        req.body.onSale = !!req.body.onSale;
        const updateData = req.body;

        // NEW: Handle edit history (Keep last 10 entries)
        const newHistoryEntry = {
            editorName: req.user.name,
            editorRole: req.user.role,
            editedAt: Date.now()
        };
        let currentHistory = service.editHistory || [];
        currentHistory.unshift(newHistoryEntry); // Add to the beginning of array
        currentHistory = currentHistory.slice(0, 10); // Keep only the last 10
        updateData.editHistory = currentHistory;

        // Block Clerk processing if locked. If first time, flag it as edited and save clerk info.
        if (req.user.role === 'clerk') {
            if (service.clerkHasEditedTemplate) {
                req.flash('error_msg', 'You are restricted from editing this template again.');
                return res.redirect('/dashboard');
            }
            updateData.clerkHasEditedTemplate = true;
            updateData.lastEditedByClerkName = req.user.name;
            updateData.lastEditedByClerkDate = Date.now();
        }
        
        let filesMap = req.files || {};
        if (Array.isArray(req.files)) {
            filesMap = {};
            req.files.forEach(f => {
                if (!filesMap[f.fieldname]) filesMap[f.fieldname] = [];
                filesMap[f.fieldname].push(f);
            });
        }

        if (filesMap.serviceImage && filesMap.serviceImage[0]) {
            updateData.imageUrl = '/uploads/' + filesMap.serviceImage[0].filename;
        }

        // --- Handle Fleet Docs (Delete/Replace/Update) ---
        const currentDocs = service.fleetDocs || [];
        const newDocs = [];

        for (let i = 1; i <= 5; i++) {
            const nameField = `fleet_doc_${i}_name`;
            const fileField = `fleet_doc_${i}`;
            const deleteField = `delete_fleet_doc_${i}`;
            
            if (req.body[deleteField] === 'true') {
                continue; 
            }

            const docName = req.body[nameField];
            
            if (filesMap[fileField] && filesMap[fileField][0]) {
                const fleetDoc = {
                    name: docName || `Document ${i}`,
                    url: '/uploads/' + filesMap[fileField][0].filename,
                    checklist: []
                };
                let itemIndex = 1;
                while (true) {
                    const itemKey = `fleet_doc_${i}_checklist_${itemIndex}_item`;
                    const catKey = `fleet_doc_${i}_checklist_${itemIndex}_category`;
                    if (req.body[itemKey]) {
                        fleetDoc.checklist.push({ item: req.body[itemKey], category: req.body[catKey] || 'General' });
                        itemIndex++;
                    } else break;
                }
                newDocs.push(fleetDoc);
            } 
            else if (docName) {
                const existing = currentDocs.find(d => d.name === docName) || currentDocs[i-1];
                
                const fleetDoc = {
                    name: docName,
                    url: existing ? existing.url : '', 
                    checklist: []
                };

                 let itemIndex = 1;
                 while (true) {
                     const itemKey = `fleet_doc_${i}_checklist_${itemIndex}_item`;
                     const catKey = `fleet_doc_${i}_checklist_${itemIndex}_category`;
                     if (req.body[itemKey]) {
                         fleetDoc.checklist.push({ item: req.body[itemKey], category: req.body[catKey] || 'General' });
                         itemIndex++;
                     } else break;
                 }
                 newDocs.push(fleetDoc);
            }
        }
        updateData.fleetDocs = newDocs;

        // Checklist Template JSON
        if (req.body.checklist_template_json) {
            try {
                updateData.checklistTemplate = JSON.parse(req.body.checklist_template_json);
            } catch (err) { /* ignore */ }
        }
        
        // Parse Work Ticket JSON
        if (req.body.work_ticket_template_json) {
            try {
                updateData.workTicketTemplate = JSON.parse(req.body.work_ticket_template_json);
            } catch (err) { /* ignore */ }
        }

        await Service.findOneAndUpdate({ _id: req.params.id }, updateData, {
            new: true,
            runValidators: true,
        });
        
        req.flash('success_msg', 'Service updated successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        return res.render('error/500');
    }
});

// @desc    Unlock service to allow clerks to edit it again
// @route   POST /services/:id/unlock-clerk
router.post('/:id/unlock-clerk', ensureAdmin, async (req, res) => {
    try {
        await Service.findByIdAndUpdate(req.params.id, { clerkHasEditedTemplate: false });
        req.flash('success_msg', 'Service successfully unlocked. Clerks can now edit this service again.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error unlocking service for clerk:', err);
        req.flash('error_msg', 'An error occurred while trying to unlock the service.');
        res.redirect('/dashboard');
    }
});

// @desc    Delete service
// @route   DELETE /services/:id
router.delete('/:id', ensureProvider, async (req, res) => {
    try {
        let service = await Service.findById(req.params.id).lean();
        if (!service) return res.render('error/404');
        
        if (service.provider.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error_msg', 'Not Authorized');
            return res.redirect('/services');
        }
        await Service.deleteOne({ _id: req.params.id });
        req.flash('success_msg', 'Service removed successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        return res.render('error/500');
    }
});

module.exports = router;
