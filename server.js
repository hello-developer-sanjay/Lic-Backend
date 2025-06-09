const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const LICFeedback = require('./models/LICFeedback');
const LICQuery = require('./models/LICQuery');
const LICReview = require('./models/LICReview');
const LICRating = require('./models/LICRating');
const homePageSSR = require('./homePageSSR');

dotenv.config();

const app = express();

// Log environment variables
console.log('Environment variables during startup:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI_LIC:', process.env.MONGODB_URI_LIC ? '[REDACTED]' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://lic-neemuch-jitendra-patidar.vercel.app', 'https://lic-backend-8jun.onrender.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true,
  maxAge: 86400,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url} at ${new Date().toISOString()}`);
  next();
});

// Serve static assets from frontend dist
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI_LIC, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Explicit root route for SSR
app.get('/', (req, res, next) => {
  console.log('Explicit / route hit at', new Date().toISOString());
  homePageSSR(req, res, next);
});

// API routes
app.post('/api/lic/submit-feedback', async (req, res) => {
  try {
    const { name, feedback } = req.body;
    if (!name || !feedback) return res.status(400).json({ error: 'Name and feedback required' });
    const newFeedback = new LICFeedback({ name, feedback });
    await newFeedback.save();
    res.status(201).json({ message: 'Feedback submitted' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/lic/submit-query', async (req, res) => {
  try {
    const { name, query } = req.body;
    if (!name || !query) return res.status(400).json({ error: 'Name and query required' });
    const newQuery = new LICQuery({ name, query });
    await newQuery.save();
    res.status(201).json({ message: 'Query submitted' });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/lic/reviews', async (req, res) => {
  try {
    const { username, comment } = req.body;
    if (!username || !comment) return res.status(400).json({ error: 'Username and comment required' });
    const newReview = new LICReview({ username, comment });
    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/lic/ratings', async (req, res) => {
  try {
    const { userId, rating } = req.body;
    if (!userId || !rating) return res.status(400).json({ error: 'User ID and rating required' });
    const existingRating = await LICRating.findOneAndUpdate(
      { userId },
      { rating },
      { upsert: true, new: true }
    );
    res.json(existingRating);
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fallback to client-side routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
