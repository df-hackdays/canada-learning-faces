let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let schema = new Schema({
  id: { type: String, required: true, unique: true },
  avgAge: { type: Number, required: true },
  gender: { type: String, required: true },
  count: { type: Number, required: true },
  ethnicity: {type: String, required: true}
});

mongoose.connect('mongodb+srv://test-user:Dominick@cluster0-fgdco.mongodb.net/test?retryWrites=true', (error) => {
  if (error) {
    console.log(error);
  } else {
    console.log('Database connection successful');
  }
});

module.exports = mongoose.model('Face', schema);
