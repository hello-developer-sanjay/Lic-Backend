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

// Log environment variables to debug potential issues during startup
console.log('Environment variables during startup:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI_LIC:', process.env.MONGODB_URI_LIC ? '[REDACTED]' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Health check route as the very first route to ensure Render can use it
console.log('Registering route: GET /health');
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (including the client-side React bundle)
console.log('Registering static route: /dist');
app.use('/dist', express.static(path.join(__dirname, '../dist')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI_LIC, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Use the SSR route for the homepage
console.log('Registering route: / (homePageSSR)');
app.use('/', homePageSSR);

// Feedback Endpoints
console.log('Registering route: POST /api/lic/submit-feedback');
app.post('/api/lic/submit-feedback', async (req, res) => {
  try {
    const { name, email, feedback } = req.body;
    if (!name || !feedback) {
      return res.status(400).json({ error: 'Name and feedback are required' });
    }
    const newFeedback = new LICFeedback({ name, email, feedback });
    await newFeedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

console.log('Registering route: GET /api/lic/feedbacks');
app.get('/api/lic/feedbacks', async (req, res) => {
  try {
    const feedbacks = await LICFeedback.find();
    res.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Query Endpoints
console.log('Registering route: POST /api/lic/submit-query');
app.post('/api/lic/submit-query', async (req, res) => {
  try {
    const { name, email, query } = req.body;
    if (!name || !query) {
      return res.status(400).json({ error: 'Name and query are required' });
    }
    const newQuery = new LICQuery({ name, email, query });
    await newQuery.save();
    res.status(201).json({ message: 'Query submitted successfully' });
  } catch (error) {
    console.error('Error submitting query:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

console.log('Registering route: GET /api/lic/queries');
app.get('/api/lic/queries', async (req, res) => {
  try {
    const queries = await LICQuery.find();
    res.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Review Endpoints
console.log('Registering route: POST /api/lic/reviews');
app.post('/api/lic/reviews', async (req, res) => {
  try {
    const { username, comment } = req.body;
    if (!username || !comment) {
      return res.status(400).json({ error: 'Username and comment are required' });
    }
    const newReview = new LICReview({ username, comment });
    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

console.log('Registering route: GET /api/lic/reviews');
app.get('/api/lic/reviews', async (req, res) => {
  try {
    const reviews = await LICReview.find();
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Rating Endpoints
console.log('Registering route: POST /api/lic/ratings');
app.post('/api/lic/ratings', async (req, res) => {
  try {
    const { userId, rating } = req.body;
    if (!userId || !rating) {
      return res.status(400).json({ error: 'User ID and rating are required' });
    }
    const existingRating = await LICRating.findOneAndUpdate(
      { userId },
      { rating },
      { upsert: true, new: true }
    );
    res.json(existingRating);
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

console.log('Registering route: GET /api/lic/ratings');
app.get('/api/lic/ratings', async (req, res) => {
  try {
    const ratings = await LICRating.find();
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fallback for client-side routing (e.g., /reviews, /join)
console.log('Registering route: GET * (fallback)');
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware for invalid routes
app.use((err, req, res, next) => {
  if (err instanceof TypeError && err.message.includes('Missing parameter name')) {
    console.error(`Invalid route path detected: ${req.path}`);
    res.status(500).json({ error: 'Invalid route configuration' });
  } else {
    next(err);
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
