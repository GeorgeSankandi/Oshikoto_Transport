const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload'); // Re-using the single upload middleware
const { ensureAdmin } = require('../middleware/auth');
const Article = require('../models/Article');

// @desc    Show all articles
// @route   GET /articles
router.get('/', async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: 'desc' }).lean();
        res.render('articles/index', {
            articles,
            page: 'articles'
        });
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Show single article
// @route   GET /articles/:id
router.get('/:id', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id).lean();
        if (!article) {
            return res.render('error/404');
        }
        res.render('articles/show', {
            article,
            page: 'articles' // For hero image consistency
        });
    } catch (err) {
        console.error(err);
        res.render('error/404');
    }
});


// @desc    Process add form for new article
// @route   POST /articles
router.post('/', ensureAdmin, upload, async (req, res) => {
    try {
        req.body.author = req.user.id;
        if (req.file) {
            req.body.imageUrl = '/uploads/' + req.file.filename;
        }
        await Article.create(req.body);
        req.flash('success_msg', 'Article Created Successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('error/500');
    }
});

// @desc    Show edit page for an article
// @route   GET /articles/edit/:id
router.get('/edit/:id', ensureAdmin, async (req, res) => {
    try {
        const article = await Article.findOne({ _id: req.params.id }).lean();
        if (!article) {
            return res.render('error/404');
        }
        res.render('articles/edit', { article });
    } catch (err) {
        console.error(err);
        return res.render('error/500');
    }
});

// @desc    Update article
// @route   PUT /articles/:id
router.put('/:id', ensureAdmin, upload, async (req, res) => {
    try {
        let article = await Article.findById(req.params.id).lean();
        if (!article) {
            return res.render('error/404');
        }

        const updateData = req.body;
        if (req.file) {
            updateData.imageUrl = '/uploads/' + req.file.filename;
        }

        await Article.findOneAndUpdate({ _id: req.params.id }, updateData, {
            new: true,
            runValidators: true,
        });

        req.flash('success_msg', 'Article Updated Successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        return res.render('error/500');
    }
});

// @desc    Delete article
// @route   DELETE /articles/:id
router.delete('/:id', ensureAdmin, async (req, res) => {
    try {
        await Article.deleteOne({ _id: req.params.id });
        req.flash('success_msg', 'Article Removed Successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        return res.render('error/500');
    }
});

module.exports = router;