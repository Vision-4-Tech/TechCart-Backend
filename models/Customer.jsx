const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
    name:String,
    email:String,
    password:String,
    secretkey:String,

    type:String,
    token:String
})
const CustomerModel = mongoose.model(" customer",CustomerSchema)

module.exports = CustomerModel;