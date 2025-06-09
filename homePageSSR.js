const express = require('express');
const mongoose = require('mongoose');
const LICReview = require('./models/LICReview');
const LICRating = require('./models/LICRating');
const crypto = require('crypto');

const router = express.Router();
const cache = new Map();
 const escapeHTML = str => { if (!str || typeof str !== 'string') return ''; return str .replace(/&/g, '&amp;') .replace(/</g, '&lt;') .replace(/>/g, '&gt;') .replace(/"/g, '&quot;') .replace(/'/g, '&#39;'); };

// Fetch ratings and reviews from MongoDB
const fetchRatingsAndReviews = async () => {
  try {
    const ratings = await LICRating.find();
    const reviews = await LICReview.find().sort({ createdAt: -1 }).limit(3);
    const validRatings = ratings.filter(r => r.rating >= 1 && r.rating <= 5);
    const averageRating = validRatings.length
      ? validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length
      : 0;
    return {
      averageRating: averageRating.toFixed(1),
      ratingCount: validRatings.length,
      reviews: reviews.map(review => ({
        username: review.username,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
    };
  } catch (error) {
    console.error('Error fetching ratings/reviews:', error);
    return { averageRating: 0, ratingCount: 0, reviews: [] };
  }
};

// Render star ratings as HTML
const renderStars = (rating) => {
  const starCount = Math.round(rating);
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += i < starCount ? '★' : '☆';
  }
  return stars;
};

router.get('/', async (req, res) => {
  const cacheKey = `ssr:home:${Date.now() - (Date.now() % 600000)}`; // Cache for 10 minutes
  if (cache.has(cacheKey)) {
    const cachedHtml = cache.get(cacheKey);
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=600');
    res.setHeader('ETag', crypto.createHash('md5').update(cachedHtml).digest('hex'));
    return res.send(cachedHtml);
  }

  try {
    const { averageRating, ratingCount, reviews } = await fetchRatingsAndReviews();
    const pageUrl = 'https://lic-neemuch-jitendra-patidar.vercel.app/';
    const metaDescription = `Jitendra Patidar, LIC Development Officer in Neemuch, offers trusted life insurance, financial planning, and LIC agent opportunities in Madhya Pradesh. Rated ${averageRating}/5 by ${ratingCount} clients.`;
    const titleImage = 'https://mys3resources.s3.ap-south-1.amazonaws.com/LIC/titleImage_LICBlo.jpeg';

    const htmlContent = `
      <nav class="navbar">
        <a href="/" class="nav-link">Home</a>
        <a href="/reviews" class="nav-link">Reviews & Feedback</a>
        <a href="/join" class="nav-link">Join as Agent</a>
        <a href="/services" class="nav-link">Services</a>
        <a href="/about" class="nav-link">About</a>
      </nav>
      <div class="container">
        <main>
          <h1 class="hero-title">LIC Neemuch: Jitendra Patidar Ensures Your Secure Life</h1>
          <section>
            <h2 class="section-heading">Welcome to LIC Neemuch</h2>
            <p class="content-text" lang="en">
              At LIC Neemuch, led by Development Officer <strong>Jitendra Patidar</strong>, we ensure your secure life through comprehensive life insurance and financial planning solutions.
            </p>
            ${ratingCount > 0 && averageRating >= 1 ? `
              <div class="rating-display">
                <span>${renderStars(averageRating)}</span>
                <span>${averageRating}/5 (${ratingCount} reviews)</span>
              </div>
            ` : ''}
          </section>
          <section>
            <h2 class="section-heading">Contact Jitendra Patidar</h2>
            <figure>
              <img src="https://mys3resources.s3.ap-south-1.amazonaws.com/LIC/jitendraprofilephoto.jpg" alt="Jitendra Patidar" width="300" height="300" class="profile-image">
            </figure>
            <p class="content-text">
              📞 <strong>Contact Number:</strong> <a href="tel:+917987235207" class="content-link">+91 7987235207</a>
            </p>
            <address class="content-text">
              <strong>Office Address:</strong> Vikas Nagar, Scheme No. 14-3, Neemuch Chawni, Neemuch, Madhya Pradesh 458441
            </address>
          </section>
          <section>
            <h2 class="section-heading">Recent Reviews</h2>
            ${reviews.length > 0 ? `
              <ul class="review-list">
                ${reviews.map(review => `
                  <li class="review-item">
                    <strong>${escapeHTML(review.username)}:</strong> ${escapeHTML(review.comment)}
                  </li>
                `).join('')}
              </ul>
            ` : '<p class="content-text">No reviews yet.</p>'}
          </section>
        </main>
        <footer class="footer">
          <p class="content-text">
            © <strong>EduXcel</strong> by Sanjay Patidar | June 9, 2025
          </p>
        </footer>
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${escapeHTML(metaDescription)}">
        <title>LIC Neemuch: How Jitendra Patidar Ensures Your Secure Life</title>
        <style>
          body { font-family: 'Inter', sans-serif; color: #e0e0e0; background: linear-gradient(180deg, #050816, #010204); margin: 0; }
          .navbar { position: sticky; top: 0; background: rgba(0, 0, 0, 0.8); padding: 1rem; display: flex; justify-content: center; gap: 1.5rem; }
          .nav-link { color: #ffbb00; text-decoration: none; }
          .container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
          .hero-title { font-size: 2.5rem; color: #ffbb00; text-align: center; }
          .section-heading { font-size: 1.8rem; color: #ffbb00; margin: 1rem 0; }
          .content-text { font-size: 1.125rem; margin-bottom: 1rem; }
          .content-link { color: #ffbb00; }
          .profile-image { width: 300px; height: 300px; border-radius: 50%; }
          .rating-display { display: flex; gap: 0.5rem; margin: 1rem 0; color: #ffbb00; }
          .review-item { margin-bottom: 1rem; }
          .footer { text-align: center; padding: 1rem; }
        </style>
      </head>
      <body>
        <div id="root">${htmlContent}</div>
      </body>
      </html>
    `;

    cache.set(cacheKey, html);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=600, stale-while-revalidate=600');
    res.setHeader('ETag', crypto.createHash('md5').update(html).digest('hex'));
    res.status(200).send(html);
  } catch (error) {
    console.error('SSR Error:', error.stack);
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Error</title>
        <style>
          body { font-family: sans-serif; background: #050816; color: #e0e0e0; text-align: center; padding: 2rem; }
        </style>
      </head>
      <body>
        <div id="root">
          <div>An error occurred. Please try again later.</div>
          <a href="/" style="color: #ffbb00;">Home</a>
        </div>
      </body>
      </html>
    `;
    res.status(500).send(errorHtml);
  }
});

module.exports = router;
