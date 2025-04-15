const { ObjectId } = require('mongoose').Types;
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:5501'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(bodyParser.json());

const mongoURI = 'mongodb+srv://rohitvaddepalli:oiKUkWyTbPW9KkdH@cluster0.xlefa4l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';


mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

const User = mongoose.model('User', new mongoose.Schema({
    fullname: String,
    email: String,
    password: String
}));

app.post('/api/register', async (req, res) => {
    try {
        const { fullname, email, password } = req.body;
        const user = new User({ fullname, email, password });
        await user.save();
        res.status(201).json({
            message: 'User created successfully',
            user: {
                fullname: user.fullname,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.status(200).json({
            message: 'Login successful',
            user: {
                _id: user._id, // Include the user ID
                fullname: user.fullname,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

const Product = mongoose.model('Product', new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    stock: Number,
    image: String,
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }
}));


// Product CRUD endpoints
app.get('/api/products', async (req, res) => {
    try {
        const { storeId } = req.query;
        let query = {};

        if (storeId) {
            query.storeId = storeId;
        }

        const products = await Product.find(query);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update your GET product endpoint
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid product ID format' });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Update the POST endpoint for products
app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock, storeId } = req.body;

        // Validate required fields
        if (!name || !description || !price || !stock || !storeId) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate storeId format
        if (!ObjectId.isValid(storeId)) {
            return res.status(400).json({ error: 'Invalid store ID format' });
        }

        // Check if store exists
        const storeExists = await Store.findById(storeId);
        if (!storeExists) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const imagePath = req.file ? '/uploads/' + req.file.filename : '';

        const product = new Product({
            name,
            description,
            price: Number(price),
            stock: Number(stock),
            image: imagePath,
            storeId
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            error: 'Failed to create product',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Delete the associated image file
        if (product.image) {
            const imagePath = path.join(__dirname, product.image);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image:', err);
            });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const Store = mongoose.model('Store', new mongoose.Schema({
    seller: String,
    storeName: { type: String, unique: true },
    storeAddress: String,
    taxId: String,
    gstNumber: String,
    description: String,
    logoImage: String,
    storeUrl: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now }
}));

// Add this with your other endpoints
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        res.json({
            imageUrl: `/uploads/${req.file.filename}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Store creation endpoint
app.post('/api/stores', async (req, res) => {
    try {
        const { seller, storeName, storeAddress, taxId, gstNumber, description, logoImage } = req.body;

        // Basic validation
        if (!seller || !storeName || !storeAddress || !taxId || !gstNumber) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }

        // Additional validation for tax ID and GST number
        if (!/^\d{10}$/.test(taxId)) {
            return res.status(400).json({ error: 'Tax ID must be 10 digits' });
        }

        if (!/^\d{15}$/.test(gstNumber)) {
            return res.status(400).json({ error: 'GST Number must be 15 digits' });
        }

        // Check for existing store with same name
        const existingStore = await Store.findOne({
            $or: [
                { storeName },
                { storeUrl: storeName.toLowerCase().replace(/\s+/g, '-') }
            ]
        });

        if (existingStore) {
            return res.status(400).json({ error: 'Store name already exists. Please choose a different name.' });
        }

        const store = new Store({
            seller,
            storeName,
            storeAddress,
            taxId,
            gstNumber,
            description,
            logoImage,
            storeUrl: storeName.toLowerCase().replace(/\s+/g, '-')
        });

        await store.save();

        res.status(201).json({
            message: 'Store created successfully',
            store: {
                id: store._id,
                seller: store.seller,
                storeName: store.storeName,
                storeAddress: store.storeAddress,
                description: store.description,
                logoImage: store.logoImage
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Store name already exists. Please choose a different name.' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get latest store (move this before the :id route)
app.get('/api/stores/latest', async (req, res) => {
    try {
        const store = await Store.findOne().sort({ createdAt: -1 });
        if (!store) {
            return res.status(404).json({ error: 'No stores found' });
        }
        res.json({
            id: store._id,
            seller: store.seller,
            storeName: store.storeName,
            storeAddress: store.storeAddress,
            description: store.description,
            logoImage: store.logoImage
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Keep these routes in this order
app.get('/api/stores/:id', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }
        res.json(store);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/stores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const store = await Store.findByIdAndUpdate(id, updates, { new: true });
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json({
            id: store._id,
            storeName: store.storeName,
            description: store.description,
            logoImage: store.logoImage
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/stores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const store = await Store.findByIdAndDelete(id);
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }
        res.json({ message: 'Store deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all stores
app.get('/api/stores', async (req, res) => {
    try {
        const { sellerId } = req.query;
        let query = {};

        if (sellerId) {
            query.seller = sellerId;
        }

        const stores = await Store.find(query, {
            storeName: 1,
            description: 1,
            logoImage: 1,
            createdAt: 1
        }).sort({ createdAt: -1 });

        res.json(stores);
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({
            error: 'Failed to fetch stores',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/stores/check-name', async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ error: 'Name parameter is required' });
        }

        const existingStore = await Store.findOne({
            $or: [
                { storeName: name },
                { storeUrl: name.toLowerCase().replace(/\s+/g, '-') }
            ]
        });

        res.json({ exists: !!existingStore });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this with your other models
const Order = mongoose.model('Order', new mongoose.Schema({
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 }
    }],
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    customerName: String,
    customerEmail: String,
    customerAddress: String,
    paymentMethod: String,
    orderDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' },
    totalAmount: Number
}));


// Add this with your other endpoints
app.post('/api/orders', async (req, res) => {
    try {
        const { products, customerName, customerEmail, customerAddress, paymentMethod, totalAmount, storeId } = req.body;

        // Validate required fields
        const missingFields = [];
        if (!products || !products.length) missingFields.push('products');
        if (!customerName) missingFields.push('customerName');
        if (!customerEmail) missingFields.push('customerEmail');
        if (!customerAddress) missingFields.push('customerAddress');
        if (!paymentMethod) missingFields.push('paymentMethod');
        if (!totalAmount) missingFields.push('totalAmount');
        if (!storeId) missingFields.push('storeId');

        if (missingFields.length > 0) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                missingFields
            });
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate product IDs and quantities
        for (const product of products) {
            if (!ObjectId.isValid(product.productId)) {
                return res.status(400).json({ error: 'Invalid product ID format' });
            }
            if (product.quantity < 1) {
                return res.status(400).json({ error: 'Product quantity must be at least 1' });
            }
        }

        // Validate store ID
        if (!ObjectId.isValid(storeId)) {
            return res.status(400).json({ error: 'Invalid store ID format' });
        }

        // Check if store exists
        const storeExists = await Store.findById(storeId);
        if (!storeExists) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // Check product availability
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ 
                    error: `Product not found: ${item.productName}` 
                });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `Insufficient stock for ${item.productName}` 
                });
            }
        }

        // Create the order
        const order = new Order({
            products: products.map(p => ({
                productId: p.productId,
                name: p.productName,
                price: p.price,
                quantity: p.quantity
            })),
            storeId,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerAddress: customerAddress.trim(),
            paymentMethod,
            totalAmount,
            status: 'Pending'
        });

        await order.save();
        
        // Update product stock levels
        for (const item of products) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }

        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ 
            error: 'Failed to create order',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const { storeId, email } = req.query;
        let query = {};

        if (storeId) {
            query.storeId = storeId;
        }

        if (email) {
            query.customerEmail = email;
        }

        const orders = await Order.find(query)
            .sort({ orderDate: -1 })
            .populate('products.productId', 'name image'); // Populate product details

        res.json(orders);
    } catch (error) {
        console.error('Error in /api/orders:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Order.findByIdAndDelete(id);
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/analytics', async (req, res) => {
    try {
        const { storeId } = req.query;
        let match = {};

        if (storeId) {
            match.storeId = new mongoose.Types.ObjectId(storeId);
        }

        const data = await Order.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                    totalSales: { $sum: { $multiply: ["$price", "$quantity"] } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
        ]);

        res.json({
            labels: data.map(item => item._id),
            values: data.map(item => item.totalSales)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Product analytics endpoint
app.get('/api/products/analytics', async (req, res) => {
    try {
        const { storeId } = req.query;
        let match = {};

        if (storeId) {
            match.storeId = new mongoose.Types.ObjectId(storeId);
        }

        const data = await Order.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$productId",
                    productName: { $first: "$productName" },
                    totalQuantity: { $sum: "$quantity" },
                    totalSales: { $sum: { $multiply: ["$price", "$quantity"] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this with your other models in server.js
const Seller = mongoose.model('Seller', new mongoose.Schema({
    fullname: String,
    email: { type: String, unique: true },
    password: String,
    createdAt: { type: Date, default: Date.now }
}));

// Seller Registration
app.post('/api/seller/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email already exists
        const existingSeller = await Seller.findOne({ email });
        if (existingSeller) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const seller = new Seller({ email, password });
        await seller.save();

        res.status(201).json({
            message: 'Seller registered successfully',
            seller: {
                id: seller._id,
                email: seller.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Seller Login
app.post('/api/seller/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const seller = await Seller.findOne({ email });

        if (!seller) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (seller.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.status(200).json({
            message: 'Login successful',
            seller: {
                id: seller._id,
                email: seller.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Add this with your other models
const Cart = mongoose.model('Cart', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        image: String,
        quantity: { type: Number, default: 1 }
    }],
    updatedAt: { type: Date, default: Date.now }
}));

// Cart endpoints
app.get('/api/cart', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        let cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cart', async (req, res) => {
    try {
        const { userId, items } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        cart.items = items;
        cart.updatedAt = new Date();
        await cart.save();

        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this to your server.js (with the other cart endpoints)
app.delete('/api/cart/item', async (req, res) => {
    try {
        const { userId, productId } = req.query;
        if (!userId || !productId) {
            return res.status(400).json({ error: 'User ID and Product ID are required' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();

        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});