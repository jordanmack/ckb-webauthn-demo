var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/userdb');

var authenticatorSchema = new mongoose.Schema({
  fmt: String,
  publicKey: String,
  counter: Number,
  credID: String
});

var userSchema = new mongoose.Schema({
  username: String,
  name: String,
  registered: Boolean,
  id: String,
  authenticators: [authenticatorSchema]
})

var model = mongoose.model('user', userSchema);

module.exports = model;