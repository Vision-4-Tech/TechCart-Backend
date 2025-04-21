const mongoose = require("mongoose");
const CartSchema = new mongoose.Schema({
    CustId:Number,
    CartNo:Number
  });
  
  const CartNoModel = mongoose.model('CartNo', CartSchema);
  module.exports=CartNoModel;