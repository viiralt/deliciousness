const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed to login',
  successRedirect: '/',
  successFlash: 'You are logged in'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/');
}; 

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You must be logged in to do that');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  // 1. see if user exists
  const user = await User.findOne({ email: req.body.email });
  
  if(!user) {
    req.flash('error', 'Sorry, no account with that email address exists');
    return res.redirect('/login');
  }
  // 2. set reset tokens and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1h from now
  await user.save();
  // 3. send them an email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;

  await mail.send({
    user,
    subject: 'Password reset',
    resetURL,
    filename: 'password-reset'
  });

  req.flash('success', `An email with the password reset link has been dispatched`);
  // 4. redirect to login upon success
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({ 
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  
  if (!user) {
    req.flash('error', 'Password reset link is invalid or has expired');
    return res.redirect('/login');
  } 
  // if user, render the password reset form
  res.render('reset', { title: 'Reset your password' });
};

exports.confirmedPasswords = (req, res, next) => {
  
  if (req.body.password === req.body['password-confirm']) {
    return next();
  }
  req.flash('error', 'Passwords don\'t match');
  res.redirect('back');
};



exports.update = async (req, res) => {
  const user = await User.findOne({ 
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash('error', 'Password reset link is invalid or has expired');
    return res.redirect('/login');
  }
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  const updatedUser = await user.save();
  await req.login(updatedUser);
  
  req.flash('success', 'Your password has been updated and you are now logged in');
  res.redirect('/');
};


















