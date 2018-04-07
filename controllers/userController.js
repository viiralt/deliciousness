const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
  res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
  res.render('register', { title: 'Register' });
};

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('name'); // express validator method
  req.checkBody('name', 'You need to provide a name').notEmpty();
  req.checkBody('email', 'You need to provide a valid email address').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  }); 
  req.checkBody('password', 'You need to provide a password').notEmpty();
  req.checkBody('password-confirm', 'You need to confirm your password').notEmpty();
  req.checkBody('password-confirm', 'Your passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();
  
  if (errors) {
    req.flash('error', errors.map(err => err.msg)); // handle error locally by reloading the register form
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() }); // body will be re-populated with user inputs, not starting from blank
    return;
  }
  next();
};

exports.register = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  const register = promisify(User.register, User); // using promisify in order to not use a callback
  await register(user, req.body.password);
  next();
};

exports.account = (req, res) => {
  res.render('account', { title: 'Edit your account' });
};

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: updates },
    { new: true, runValidators: true, context: 'query' }
  );
  req.flash('success', 'User profile updated');
  res.redirect('/account');
};