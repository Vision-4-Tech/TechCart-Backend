const mongoose = require("mongoose");
const dataSchema = new mongoose.Schema({
    tagId: String,
    timestamp: { type: Date, default: Date.now },
  });
  
  const DataModel = mongoose.model('Data', dataSchema);
  module.exports=DataModel;