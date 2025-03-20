const express = require('express');
const passport = require('passport');
const router = express.Router();

// Initiate Google Login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback URL for Google
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("Authentication Error:", err); // Log the error
      return res.redirect("/login"); // Redirect on failure
    }
    if (!user) return res.redirect("/login");
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect("https://kisaan-setu-f.vercel.app/");
    });
  })(req, res, next);
});

router.get('/auth/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return next(err); 
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid'); 
      res.redirect('https://kisaan-setu-f.vercel.app/'); 
    });
  });
});

module.exports = router;
