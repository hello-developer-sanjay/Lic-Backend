const express = require('express');
const mongoose = require('mongoose');
const LICFeedback = require('./models/LICFeedback');
const LICQuery = require('./models/LICQuery');
const LICReview = require('./models/LICReview');
const LICRating = require('./models/LICRating');
const crypto = require('crypto');

const router = express.Router();
const cache = new Map();

// Utility to escape HTML
const escapeHTML = str => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

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
    const keywords = 'LIC Neemuch, Jitendra Patidar, secure life, life insurance Neemuch, LIC agent recruitment, financial planning Madhya Pradesh, trusted insurance solutions';
    const titleImage = 'https://mys3resources.s3.ap-south-1.amazonaws.com/LIC/titleImage_LICBlo.jpeg';

    const structuredData = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'LIC Neemuch',
        url: pageUrl,
        logo: { '@type': 'ImageObject', url: titleImage, width: 600, height: 200 },
        sameAs: ['https://www.instagram.com/jay7268patidar'],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'LIC Neemuch',
        description: metaDescription,
        url: pageUrl,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Vikas Nagar, Scheme No. 14-3, Neemuch Chawni',
          addressLocality: 'Neemuch',
          addressRegion: 'Madhya Pradesh',
          postalCode: '458441',
          addressCountry: 'IN',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 24.476385, longitude: 74.862409 },
        telephone: '+917987235207',
        image: titleImage,
        priceRange: '$$',
        openingHours: 'Mo-Fr 09:00-17:00',
        hasMap: 'https://maps.google.com/?q=Vikas+Nagar,+Neemuch,+Madhya+Pradesh+458441',
        sameAs: ['https://www.instagram.com/jay7268patidar'],
        inLanguage: ['en', 'hi'],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+917987235207',
          contactType: 'Customer Service',
          areaServed: 'IN',
          availableLanguage: ['English', 'Hindi'],
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: averageRating,
          reviewCount: ratingCount,
          bestRating: '5',
          worstRating: '1',
        },
        review: reviews.map(review => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: review.username },
          datePublished: new Date(review.createdAt).toISOString().split('T')[0],
          reviewBody: review.comment,
        })),
      },
    ];

    const initialData = {
      averageRating,
      ratingCount,
      reviews,
    };

    const htmlContent = `
      <nav class="navbar" aria-label="Main navigation">
        <a href="/" class="nav-link" aria-label="Home">Home</a>
        <a href="/reviews" class="nav-link" aria-label="Reviews and Feedback">Reviews & Feedback</a>
        <a href="/join" class="nav-link" aria-label="Join as Agent">Join as Agent</a>
        <a href="/services" class="nav-link" aria-label="Services">Services</a>
        <a href="/about" class="nav-link" aria-label="About">About</a>
      </nav>
      <div class="container">
        <main role="main">
          <h1 class="hero-title">LIC Neemuch: Jitendra Patidar Ensures Your Secure Life</h1>
          <article>
            <section aria-labelledby="welcome-heading">
              <h2 id="welcome-heading" class="section-heading">Welcome to LIC Neemuch</h2>
              <p class="content-text" lang="en">
                At LIC Neemuch, led by Development Officer <strong>Jitendra Patidar</strong>, we ensure your secure life through comprehensive life insurance and financial planning solutions.
              </p>
              <p class="content-text" lang="hi">
                नीमच में एलआईसी, विकास अधिकारी <strong>जीतेंद्र पाटीदार</strong> के नेतृत्व में, आपके सुरक्षित जीवन को सुनिश्चित करता है।
              </p>
              ${ratingCount > 0 && averageRating >= 1 ? `
                <div class="rating-display" aria-label="Average customer rating">
                  <span>${renderStars(averageRating)}</span>
                  <span>${averageRating}/5 (${ratingCount} reviews)</span>
                </div>
              ` : ''}
            </section>
            <section aria-labelledby="contact-heading">
              <h2 id="contact-heading" class="section-heading">Contact Jitendra Patidar</h2>
              <figure class="profile-figure">
                <img src="https://mys3resources.s3.ap-south-1.amazonaws.com/LIC/jitendraprofilephoto.jpg" alt="Jitendra Patidar, LIC Development Officer" width="300" height="300" class="profile-image" loading="eager" decoding="async" fetchpriority="high">
                <figcaption class="sr-only">Profile photo of Jitendra Patidar</figcaption>
              </figure>
              <p class="content-text">
                📞 <strong>Contact Number:</strong> <a href="tel:+917987235207" class="content-link">+91 7987235207</a>
              </p>
              <p class="content-text">
                📸 <strong>Instagram:</strong> <a href="https://www.instagram.com/jay7268patidar" class="content-link" target="_blank" rel="noopener noreferrer">jay7268patidar</a>
              </p>
              <address class="content-text">
                <strong>Office Address:</strong> Vikas Nagar, Scheme No. 14-3, Neemuch Chawni, Neemuch, Madhya Pradesh 458441
              </address>
            </section>
            <section aria-labelledby="reviews-heading">
              <h2 id="reviews-heading" class="section-heading">Recent Reviews</h2>
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
          </article>
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
      <html lang="mul" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${escapeHTML(metaDescription)}">
        <meta name="keywords" content="${escapeHTML(keywords)}">
        <title>LIC Neemuch: How Jitendra Patidar Ensures Your Secure Life</title>
        <link rel="canonical" href="${pageUrl}">
        <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
        <style>
          :root {
            --primary-color: #ffbb00;
            --text-color: #e0e0e0;
            --bg-gradient: linear-gradient(180deg, #050816, #010204);
          }
          body { font-family: 'Inter', sans-serif; color: var(--text-color); background: var(--bg-gradient); }
          .navbar { position: sticky; top: 0; background: rgba(0, 0, 0, 0.8); padding: 1rem; display: flex; justify-content: center; gap: 1.5rem; }
          .nav-link { color: var(--primary-color); text-decoration: none; }
          .container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
          .hero-title { font-size: 2.5rem; color: var(--primary-color); text-align: center; }
          .section-heading { font-size: 1.8rem; color: var(--primary-color); margin: 1rem 0; }
          .content-text { font-size: 1.125rem; margin-bottom: 1rem; }
          .content-link { color: var(--primary-color); }
          .profile-image { width: 300px; height: 300px; border-radius: 50%; }
          .rating-display { display: flex; gap: 0.5rem; margin: 1rem 0; color: var(--primary-color); }
          .review-item { margin-bottom: 1rem; }
          .footer { text-align: center; padding: 1rem; }
        </style>
      </head>
      <body>
        <div id="root">${htmlContent}</div>
        <script>window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};</script>
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
