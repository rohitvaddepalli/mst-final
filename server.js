const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors({
    origin: 'http://127.0.0.1:5500', // Match your frontend origin exactly
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
        const {fullname, email, password } = req.body;
        const user = new User({fullname, email, password });
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
                email: user.email
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

const Product = mongoose.model('Product', new mongoose.Schema({
    name: String,
    price: Number,
    stock: Number
}));

// Product CRUD endpoints
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, price, stock } = req.body;
        const product = new Product({ name, price, stock });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        const { id } = req.params;
        await Product.findByIdAndDelete(id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add to server.js (after your other models)

const Store = mongoose.model('Store', new mongoose.Schema({
    seller: String,
    storeName: String,
    storeAddress: String,
    taxId: String,
    gstNumber: String,
    description: String,
    logoImage: String,
    createdAt: { type: Date, default: Date.now }
}));

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

        const store = new Store({ 
            seller, 
            storeName, 
            storeAddress, 
            taxId, 
            gstNumber, 
            description,
            logoImage 
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
        res.status(500).json({ error: error.message });
    }
});

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

// Get latest store
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