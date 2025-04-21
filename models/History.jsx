const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema({
    id:String,
    date:String,
    Cartno:String,
    Name:String,
  
    Email:String,
    
    OrderId:String,
    Amount:String,
    SessionId:Number,
})
const CustomerModel = mongoose.model(" History",HistorySchema)

module.exports = CustomerModel;