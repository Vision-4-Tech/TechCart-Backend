const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  Product: { type: String, required: true },
  Price: { type: String, required: true },
});

const cartSchema = new mongoose.Schema({
  cartNumber: { type: String, required: true },
  items: { type: [itemSchema], required: true },
});

const CartModel = mongoose.model('Carts', cartSchema);

module.exports = CartModel;
