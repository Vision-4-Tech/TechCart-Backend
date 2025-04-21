const mongoose = require("mongoose");

const InventorySchema2 = new mongoose.Schema({
    product_id:Number,
    Product:String,
    Price:Number,
    imageFile:String
    
})
const CustomerModel2 = mongoose.model("Invent",InventorySchema2)

module.exports = CustomerModel2;