const mongoose = require("mongoose");

const TagIdSchema = new mongoose.Schema({
    TagId:String,
    product_id:String,
})
const TagModel = mongoose.model("tagid",TagIdSchema)

module.exports = TagModel;