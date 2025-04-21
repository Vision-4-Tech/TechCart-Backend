const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
    Date:String,
    Cartno:String,
    Name:String,
    Phone:String,
    Email:String,
    OrderId:String,
    TransactionId:String,
    Products:Object,
    Amount:String,
    SessionId:Number
})
const TransactionModel = mongoose.model("Transaction",TransactionSchema)

module.exports = TransactionModel;