const express = require('express');
const passport = require('passport');
const router = express.Router();

// @desc    Auth with Google
// @route   GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @desc    Google auth callback
// @route   GET /auth/google/callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: 'http://localhost:3000/' }),
    (req, res) => {
        // Successful authentication, redirect to frontend.
        res.redirect('http://localhost:3000/dashboard');
    }
);

// @desc    Get current user
// @route   GET /auth/current_user
router.get('/current_user', (req, res) => {
    if (req.user) {
        res.json(req.user);
    } else {
        res.status(401).json({ message: "Not authenticated" });
    }
});

// @desc    Logout user
// @route   GET /auth/logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('http://localhost:3000/');
    });
});

module.exports = router;