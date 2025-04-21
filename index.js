const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose=require("mongoose");
const jwt=require("jsonwebtoken")
const Razorpay=require("razorpay");
const http = require("http");
const crypto = require("crypto");

const {Server} = require("socket.io");
const dotenv=require("dotenv")

// Use CORS middleware

const bcrypt = require("bcryptjs");
require("dotenv").config();
const app = express();
app.use(bodyParser.json());
app.use(cors());


const CartNomodel=require('./models/CartNoModel.js');
const CustomerModel  = require('./models/Customer.jsx')
const CartModel= require('./models/Items.jsx');
const CartItems=require('./models/CartItems.jsx')
const History=require('./models/History.jsx');
const Inventory=require('./models/Inventory.jsx')
const TemporaryTable=require('./models/Temporarytable.jsx')
const TransactionModel = require('./models/Transaction.jsx');
const TagModel=require('./models/TagId.jsx');
const multer = require('multer');
const CustomerModel2=require('./models/Inventory2.jsx')

// Use body-parser middleware to parse JSON

const mongoURI = process.env.MONGO_URI;
const secret=process.env.SECRET_KEY;
// const Razorpay_Key_ID = process.env.Razorpay_Key_ID;
// const Razorpay_Secret = process.env.Razorpay_Secret;

 const Razorpay_Key_ID = "rzp_test_L1JPeGnZbS2ffv";
 const Razorpay_Secret = "kM3HWuzLYF6xiljfsJmi0mir";
const server = http.createServer(app);


// setting up the connection to mongodb
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });



app.get('/', (req, res) => {
    res.send('Hello World');
});
app.use(express.json())


// app.post('/addItemsToCart', async (req, res) => {
//     try {
//         const { cart_no, product_id } = req.body;
//         console.log(cart_no, product_id);
//         res.json(`${cart_no} ${product_id} Successfully inserted the Item`);
//     } catch (e) {
//         console.log(e);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });





const io = new Server(server, {
  
  cors: {
    origin: "https://reactfrontend-fgww.onrender.com/",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },


});



app.post("/products", async (req, res) => {
  console.log("Received POST request to create product");
  console.log(req.body); // Log the request body to inspect incoming data

  try {
    // Assuming 'CustomerModel2' is your Mongoose model for products
    const newProduct = await Inventory.create(req.body);

    
    res
      .status(201)
      .json({ message: "Product saved successfully.", product: newProduct });
  } catch (error) {
    console.error("Error saving product:", error);
    res.status(500).json({ message: "Failed to save product." });
  }
});


app.delete('/api/carts/:cartn', async (req, res) => {
  const cartn = req.params.cartn;
  
  try {
      // Find cart by cart number and delete
      const cart = await CartNomodel.findOneAndDelete({ CartNo: cartn});
     console.log(cart)
      if (!cart) {
          return res.status(404).json({ error: 'Cart not found' });
      }

      res.json({ message: 'Cart deleted successfully' });
  } catch (error) {
      console.error('Error deleting cart:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/CartNo',async(req,res)=>{
  const {CustId,CartNo}=req.body;
  let items=await CartNomodel.findOne({CartNo:CartNo});
  console.log("items",items);
  if(!items){
        
    await CartNomodel.create({CustId:CustId,CartNo:CartNo});
    res.status(200).send("Valid Cart")
  }
  else{
    res.status(201).send("Cart in Use")
  }
})

app.delete('/deletecart', async (req, res) => {
  const cartno = req.body;

  try {
    // Find and delete the record with the specified cartno
    const deletedItem = await CartNomodel.findOneAndDelete({ CartNo:cartno });

    if (!deletedItem) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.status(200).json({ message: 'Record deleted successfully', deletedItem });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

  app.get('/Inventoryitem', async (req, res) => {
    try {
      // Fetch all items from the InventoryItem collection
      const items = await Inventory.find();
  
      // Send the items in the response
      res.json(items);
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server Error');
    }
  });

  io.on("connection", (socket) => {
    console.log("A user connected",socket.id);

    // Join the room based on cart number
    socket.on("joinCartRoom", (cart_no) => {
      console.log("joined room")
      socket.join(cart_no);
      console.log(`User joined cart room: ${cart_no}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

 


  app.post('/addItemsToCart', async (req, res) => {
    console.log("items")
    try {
      const { cart_no, tag_id, sessionid } = req.body;

      // Use aggregation to find TagId and its product_id
      const tagData = await TagModel.aggregate([
          { $match: { TagId: tag_id } },
          { $project: { product_id: 1, _id: 0 } }
      ]);

      if (!tagData.length) {
          return res.status(404).json({ error: 'Tag not found' });
      }

      const product_id = tagData[0].product_id;

      // Find or create cart using `upsert`
      let existingCart = await TemporaryTable.findOneAndUpdate(
          { cartNumber: cart_no },
          { $setOnInsert: { cartNumber: cart_no, items: [], sessionId: sessionid } },
          { new: true, upsert: true }
      );

      // Initialize items array if null
      existingCart.items = existingCart.items || [];

      // Filter out null values from items array
      existingCart.items = existingCart.items.filter(item => item !== null);

      const existingTagIndex = existingCart.items.findIndex(item => item.tag_id.includes(tag_id));

      if (existingTagIndex !== -1) {
          // Remove the tag_id and decrement quantity if tag_id exists
          const existingItem = existingCart.items[existingTagIndex];
          existingItem.tag_id = existingItem.tag_id.filter(tag => tag !== tag_id);
          existingItem.Quantity--;

          if (existingItem.Quantity === 0) {
              existingCart.items.splice(existingTagIndex, 1);
          }
      } else {
          const itemIndex = existingCart.items.findIndex(item => item.product_id === Number(product_id));

          if (itemIndex !== -1) {
              // Increment quantity and add the tag_id to the tag_id array
              existingCart.items[itemIndex].tag_id.push(tag_id);
              existingCart.items[itemIndex].Quantity++;
          } else {
              // Fetch the new item details from Inventory
              const newItem = await Inventory.findOne({ product_id });
              if (!newItem) {
                  return res.status(404).json({ error: 'Item not found in inventory' });
              }

              // Add the new item to the cart
              existingCart.items.push({ 
                  ...newItem.toObject(), 
                  tag_id: [tag_id], 
                  Quantity: 1, 
                  sessionId: sessionid 
              });
          }
      }

      await existingCart.save();

      // Emit socket update
      io.in(cart_no).emit("cartUpdated", existingCart);

      res.json(existingCart);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
});




  app.post('/TempItems', async (req, res) => {
    try {
      const { cartNumber } = req.body;
  
      if (!cartNumber) {
        return res.status(400).json('Cart number is required');
      }
  
      const temporaryTableData = await TemporaryTable.findOne({ cartNumber:cartNumber })
       console.log("table",temporaryTableData)
      if (temporaryTableData===null) {
        return res.status(404).json("null");
        
      }
  
      res.json(temporaryTableData);
    } catch (error) {
      console.error(error);
      res.status(500).json('Internal Server Error');
    }
  });

  app.post('/OrderId', async (req, res) => {
    try {
      const { orderId } = req.body;
  
      // Find transactions in the database based on orderId
      const transactions = await TransactionModel.find({ OrderId: orderId });
  
      // Respond with the result
      res.json(transactions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  app.post('/Customer',async(req,res)=>{
    try {
  
      const items = await CustomerModel.find();
  
      res.json(items);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  })

  
  
  app.get('/checkSession/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
  
    try {
      const order = await History.findOne({ 
        SessionId:sessionId });
  
      if (order) {
        // If session ID is found in the database
        res.status(200).json({ message: 'Success' });
      } else {
        // If session ID is not found
        res.status(404).json({ message: 'Session ID not found' });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  app.post('/histories', async (req, res) => {
    try {
      // Extract data from the request body
      console.log(req.body)
      const {id, date, Cartno, Name,  Email, OrderId,Amount,SessionId } = req.body;
      console.log(req.body);
      console.log("session",SessionId)
      // Create a new History instance
      const newHistory = new History({
        id,
        date,
        Cartno,
        Name,
        
        Email,
        OrderId,
        Amount,
        SessionId 
      });
  
      // Save the newHistory instance to the database
      await newHistory.save();
  
      res.status(201).json({ message: 'History added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });



 app.post("/histories/orders", async (req, res) => {
   const { id } = req.body;

   // Check if id is provided
   if (!id) {
     return res.status(400).json("id not defined");
   }

   try {
     // Find history records based on id
     const historyData = await History.find({ id });

     // Check if historyData is empty
     if (historyData.length === 0) {
       return res.status(404).json("No history found for the provided id");
     }

     const results = [];

     for (let i = 0; i < historyData.length; i++) {
       const order = historyData[i];

       const { OrderId } = order;
       const transactions = await TransactionModel.find({ OrderId });
       const items = transactions.map((transaction) => transaction);
       results.push(...items);
     }

    
     res.status(200).json(results);
   } catch (error) {
     console.error("Error fetching data:", error);
     res.status(500).json("Server error");
   }
 });

  
  app.delete('/deleteCart/:cart_no', async (req, res) => {
    const cartNumber = req.params.cart_no;
  
    try {
      // Check if the cart exists
      const existingCart = await TemporaryTable.findOne({ cartNumber });
  
      if (existingCart) {
        // Cart exists, delete the entry
        await TemporaryTable.deleteOne({ cartNumber });
        res.json(`Cart with cartNumber ${cartNumber} deleted successfully`);
      } else {
        // Cart doesn't exist
        res.status(404).json(`Cart with cartNumber ${cartNumber} not found`);
      }
    } catch (error) {
      // Handle any errors
      console.error(error);
      res.status(500).json('Internal Server Error');
    }
  });
  app.get('/items',async (req,res)=>{
    try{
           const {product_id} = req.body;
           console.log(product_id)
           const id={};
           if (product_id) id.product_id=product_id;
           const data=await Inventory.find(id);
           res.json(data);
    }
    catch(error){
          console.log(error);
    }
  })
  app.post('/filterHistory', async (req, res) => {
    try {
      const { date,cartNo, name, email, orderId, phoneNumber } = req.body;
      console.log(req.body);
      // Build the filter object based on the provided parameters
      const filter = {};
      console.log(typeof date);
      
      if (cartNo) filter.Cartno=cartNo;
      if (name) filter.Name = name;
      if (date) filter.date = date;
      if (email) filter.Email = email;
      if (orderId) filter.OrderId = orderId;
      if (phoneNumber) filter.Phone = phoneNumber;
       console.log(filter)
      // Query the History collection with the filter object
      const filteredData = await History.find(filter);
      console.log("filter",filteredData)
      res.json(filteredData);
    } catch (e) {
      console.error(error);
      res.status(500).send(e);
    }
  });
  
  
  

    app.post('/sendData', (req, res) => {
      console.log("hello")
      console.log(req)
      const { tagId } = req.body;
    
      const newData = new CartItems({ tagId });
      newData.save((err) => {
        if (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
        } else {
          console.log('Data saved to MongoDB');
          res.status(200).send('Data saved successfully');
        }
      });
    });
  
  app.get('/history',async(req,res)=>{
    
      const history=await History.find()
      .then(items=>res.json(items))
      .catch(err=>res.json(err));
    
  })
    app.get('/users', async (req, res) => {
      try {
        const totalUsers = await CustomerModel.countDocuments({});
        res.json({ totalUsers });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });
    
    
    
    app.get('/getItems', (req, res) => {
      console.log("get");
      CartModel.find() // Use find instead of findOne
        .then(items => res.json(items))
        .catch(err => res.json(err));
    });
  

  

  
  
  
  
  app.post("/validate",async(req,res)=>{
    console.log("validate started")
    const  {razorpay_order_id,razorpay_payment_id}=req.body;
    
    const sha = crypto.createHmac("sha256","kM3HWuzLYF6xiljfsJmi0mir");
    console.log("sha",sha)
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest=sha.digest("hex");
    if(digest!==razorpay_signature){
      return res.status(400).json({msg:"Transaction is not legit!"})
  
    }
    res.json({
      msg:"success",
      orderId:razorpay_order_id,
      paymentId:razorpay_payment_id,
    
    })
  })
  
  app.post("/order", async (req, res) => {
    console.log("order");
    
    try {
      const razorpay = new Razorpay({
        key_id: Razorpay_Key_ID,
        key_secret: Razorpay_Secret,
      });
  
      console.log("entered the order");
      const options = req.body;
      const order = await razorpay.orders.create(options);
      console.log(order);
  
      if (!order) {
        return res.status(500).send("Error has occurred");
      }
  
      res.json(order);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error has occurred");
    }
  });
  // Define the route to handle the API request
  app.post('/Transactions', async (req, res) =>{
    try {
      // Create a new instance of the Transaction model with request body
      const newTransaction = new TransactionModel(req.body);
  
      // Save the new transaction to the database
      await newTransaction.save();
  
      // Respond with success message
      res.status(201).json({ message: 'Transaction successfully added to the database' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

   app.post("/Login", async (req, res) => {
     const { email, password } = req.body;

     if (!(email && password)) {
       return res.status(400).send("Please fill all the fields");
     }

     try {
       const user = await CustomerModel.findOne({ email });

       if (!user) {
         return res.status(404).json({ message: "No record existed" });
       }

       const valid = await bcrypt.compare(password, user.password);

       if (!valid) {
         return res.status(402).json({ message: "Password is incorrect" });
       }

       const token = jwt.sign({ userId: user._id, email: user.email }, secret, {
         expiresIn: "2h",
       });
       user.token = token;
       user.password = undefined;

       res.status(200).json({ user, token });
     } catch (error) {
       console.error("Error during login:", error);
       res.status(500).json({ message: "Internal server error" });
     }
   });


  app.post('/Register', async(req, res) => {
      const { name,email,password,secretkey,type } = req.body;
       
       if(!(name && email &&  password)){
                  re.status(400).send("All fields are compulsory")
       }

      const encryptPassword=await bcrypt.hash(password,10);
      


      const existingUser=await CustomerModel.findOne({ email })
       
             console.log(existingUser)
            if (existingUser!==null) {
                   
              res.json({ message: 'Record already exists for this email' });
          } 
           else if (type=="admin"){
           
                 if ( secretkey!=="suhas"){
                
                  res.json({message:"Invalid secret key"})
                }

                 
                  else{
                      
                  const user=await CustomerModel.create({
                     name,
                     email: email,
                     password: encryptPassword,
                     secretkey: secretkey,
                     type: type,
                     
                   
                   })
                  
                    const token= jwt.sign({user},secret,{expiresIn:"2h"})
                    
                    user.token=token;
                   user.password=undefined

                   res.status(201).json({ user:user.email });
                  }

          }
            else {


              console.log("user")
                    const user=await CustomerModel.create({
                      
                       name:name,
                       email: email,
                       password: encryptPassword,
                       type: type,
                     })
                    console.log("user",user)
                       const token= await jwt.sign({id:user._id},secret,{expiresIn:"2h"})
                     console.log(token)
                    user.token=token;
                   user.password=undefined

                   console.log(user);
                   res.status(201).json({user})
                  }  
          })
        
  


   const verifyToken=(req,res,next)=>{
           const bearerHeader=req.header['x-authToken'];
           if(typeof bearerHeader !== 'undefined'){
                     const bearer=bearerHeader.split(" ");
                     const token  = bearer[1];
                     req.tokem=token;
                     next();
           }
           else{
            res.send({
              result:"Token is Invalid"
            })
           }
   }



  app.listen(5000, () => {
    console.log("app is running at 5000");
  });

