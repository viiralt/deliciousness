const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
  email: {
    type: String,
    unique: true, // make sure each email address is linked to specific acoounts
    lowercase: true, // always save addresses in lower case
    trim: true, // get rid of whitespace
    validate: [validator.isEmail, 'Invalid email address'], // middleware: 2nd arg is an error msg
    required: 'Please provide a valid email address'
  },
  name: {
    type: String,
    required: 'Please provide a username',
    trim: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  hearts: [
    { type: mongoose.Schema.ObjectId, ref: 'Store' }
  ]
});

userSchema.virtual('gravatar').get(function() {
  const hash = md5(this.email); // hash user email, so the avatar won't expose it
  return `https://gravatar.com/avatar/${hash}?s=200`; // provide url to user avatar
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' }); // auto add all the fields to the user schema, using email as the login field, rather than username
userSchema.plugin(mongodbErrorHandler); // handle proper error handling

module.exports = mongoose.model('User', userSchema);
