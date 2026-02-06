const express = require('express');
const router = express.Router();
const { uploadService } = require('../middleware/upload');
const { ensureAuthenticated, ensureProvider } = require('../middleware/auth');
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

        // 3. Construction Portfolio
        const portfolio = [];
        for (let i = 1; i <= 3; i++) {
            const titleField = `portfolio_${i}_title`;
            const descField = `portfolio_${i}_desc`;
            const imgField = `portfolio_${i}_image`;
            
            if (req.body[titleField] || (filesMap[imgField] && filesMap[imgField][0])) {
                const imgUrl = (filesMap[imgField] && filesMap[imgField][0])
                    ? '/uploads/' + filesMap[imgField][0].filename
                    : '';
                
                portfolio.push({
                    title: req.body[titleField] || `Project ${i}`,
                    description: req.body[descField] || '',
                    imageUrl: imgUrl
                });
            }
        }
        if (portfolio.length > 0) req.body.portfolio = portfolio;

        // 4. Checklist Template JSON
        if (req.body.checklist_template_json) {
            try {
                req.body.checklistTemplate = JSON.parse(req.body.checklist_template_json);
            } catch (err) { /* ignore */ }
        }

        req.body.onSale = !!req.body.onSale;

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
        const isTransport = (service.category && (service.category.includes('Transportation') || service.category.includes('Carwash')));

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
router.get('/edit/:id', ensureProvider, async (req, res) => {
    try {
        const service = await Service.findOne({ _id: req.params.id }).lean();
        if (!service) return res.render('error/404');
        
        if (service.provider.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error_msg', 'Not Authorized');
            return res.redirect('/services');
        }
        res.render('services/edit', { service });
    } catch (err) {
        console.error(err);
        return res.render('error/500');
    }
});

// @desc    Update service
// @route   PUT /services/:id
router.put('/:id', ensureProvider, uploadService, async (req, res) => {
    try {
        let service = await Service.findById(req.params.id).lean();
        if (!service) return res.render('error/404');
        
        if (service.provider.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error_msg', 'Not Authorized');
            return res.redirect('/services');
        }
        
        req.body.onSale = !!req.body.onSale;
        const updateData = req.body;
        
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
            
            // Check if user marked this slot for deletion
            if (req.body[deleteField] === 'true') {
                continue; // Skip adding this doc to newDocs, effectively deleting it
            }

            const docName = req.body[nameField];
            
            // Case 1: New File Uploaded (Replace or Create)
            if (filesMap[fileField] && filesMap[fileField][0]) {
                const fleetDoc = {
                    name: docName || `Document ${i}`,
                    url: '/uploads/' + filesMap[fileField][0].filename,
                    checklist: []
                };
                // Parse items
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
            // Case 2: No new file, but name exists (Update Meta or Keep Existing)
            else if (docName) {
                // Find existing doc by name/index logic. 
                // To keep it simple: we try to match by name from old array, or just keep url if we can find it.
                // Better approach for "Edit": We iterate slots. If existing slot i had a doc, we keep it unless deleted.
                
                // Find original doc at this approximate index or by name
                // (Simple logic: look for name match in old docs)
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

        // --- Handle Construction Portfolio Update ---
        const currentPortfolio = service.portfolio || [];
        const newPortfolio = [];
        
        for (let i = 1; i <= 3; i++) {
             const titleField = `portfolio_${i}_title`;
             const descField = `portfolio_${i}_desc`;
             const imgField = `portfolio_${i}_image`;
             const deleteField = `delete_portfolio_${i}`;

             if (req.body[deleteField] === 'true') continue;

             const title = req.body[titleField];
             
             if (title || (filesMap[imgField] && filesMap[imgField][0])) {
                let imgUrl = '';
                // New image?
                if (filesMap[imgField] && filesMap[imgField][0]) {
                    imgUrl = '/uploads/' + filesMap[imgField][0].filename;
                } else {
                    // Keep old image
                    // Try to find matching entry or index
                    const existing = currentPortfolio[i-1]; 
                    imgUrl = existing ? existing.imageUrl : '';
                }

                newPortfolio.push({
                    title: title || `Project ${i}`,
                    description: req.body[descField] || '',
                    imageUrl: imgUrl
                });
             }
        }
        updateData.portfolio = newPortfolio;


        // Checklist Template JSON
        if (req.body.checklist_template_json) {
            try {
                updateData.checklistTemplate = JSON.parse(req.body.checklist_template_json);
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