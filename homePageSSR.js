const express = require('express');
const mongoose = require('mongoose');
const LICReview = require('./models/LICReview');
const LICRating = require('./models/LICRating');

const router = express.Router();
const cache = new Map();

const escapeHTML = str => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

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
    console.error('[fetchRatingsAndReviews] Error:', error.stack);
    return { averageRating: 0, ratingCount: 0, reviews: [] };
  }
};

const renderStars = (rating) => {
  const starCount = Math.round(rating);
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += i < starCount ? '★' : '☆';
  }
  return stars;
};

router.get('/', async (req, res) => {
  const cacheKey = 'ssr:home';
  if (cache.has(cacheKey)) {
    console.log('SSR Cache hit for / at', new Date().toISOString());
    const cachedHtml = cache.get(cacheKey);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('ETag', require('crypto').createHash('md5').update(cachedHtml).digest('hex'));
    return res.send(cachedHtml);
  }

  console.log('SSR Request received for / at', new Date().toISOString());
  try {
    const { averageRating, ratingCount, reviews } = await fetchRatingsAndReviews();
    const pageUrl = 'https://lic-neemuch-jitendra-patidar.vercel.app/';
    const metaDescription = `Jitendra Patidar, LIC Development Officer in Neemuch, offers trusted life insurance and financial planning. Rated ${averageRating}/5 by ${ratingCount} clients.`;

    const structuredData = {
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
      telephone: '+917987235207',
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
    };

    const htmlContent = `
      <nav class="navbar" aria-label="Main navigation">
        <a href="/" class="nav-link" aria-label="Homepage">Home</a>
        <a href="/reviews" class="nav-link" aria-label="Reviews">Reviews</a>
        <a href="/join" class="nav-link" aria-label="Join as Agent">Join as Agent</a>
        <a href="/services" class="nav-link" aria-label="Services">Services</a>
        <a href="/about" class="nav-link" aria-label="About">About</a>
      </nav>
      <div class="container">
        <main role="main">
          <h1>LIC Neemuch: Jitendra Patidar Ensures Your Secure Life</h1>
          <section aria-labelledby="welcome-heading">
            <h2 id="welcome-heading">Welcome to LIC Neemuch</h2>
            <p lang="en">
              At LIC Neemuch, led by Development Officer <strong>Jitendra Patidar</strong>, we ensure your secure life through comprehensive life insurance and financial planning solutions.
            </p>
            <p lang="hi">
              नीमच में एलआईसी, विकास अधिकारी <strong>जीतेंद्र पाटीदार</strong> के नेतृत्व में, आपके सुरक्षित जीवन को सुनिश्चित करता है।
            </p>
            ${ratingCount > 0 && averageRating >= 1 ? `
              <div class="rating-display" aria-label="Average rating ${averageRating} out of 5 based on ${ratingCount} reviews">
                <span aria-hidden="true">${renderStars(averageRating)}</span>
                <span>${averageRating}/5 (${ratingCount} reviews)</span>
              </div>
            ` : ''}
          </section>
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading">Contact Jitendra Patidar</h2>
            <p>
              📞 <strong>Contact Number:</strong> <a href="tel:+917987235207" class="content-link" aria-label="Call Jitendra Patidar">+91 7987235207</a>
            </p>
            <p>
              📸 <strong>Instagram:</strong> <a href="https://www.instagram.com/jay7268patidar" class="content-link" target="_blank" rel="noopener noreferrer" aria-label="Visit Instagram profile">jay7268patidar</a>
            </p>
            <address>
              <strong>Office Address:</strong> Vikas Nagar, Scheme No. 14-3, Neemuch Chawni, Neemuch, Madhya Pradesh 458441
            </address>
          </section>
          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading">Recent Reviews</h2>
            ${reviews.length > 0 ? `
              <ul class="review-list" aria-label="Recent customer reviews">
                ${reviews.map(review => `
                  <li class="review-item">
                    <strong>${escapeHTML(review.username)}:</strong> ${escapeHTML(review.comment)}
                  </li>
                `).join('')}
              </ul>
            ` : '<p>No reviews yet.</p>'}
          </section>
        </main>
        <footer role="contentinfo">
          <p>© EduXcel by Sanjay Patidar | June 10, 2025</p>
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
        <meta name="keywords" content="LIC Neemuch, Jitendra Patidar, life insurance, financial planning">
        <meta name="author" content="Jitendra Patidar">
        <meta name="robots" content="index, follow">
        <meta property="og:type" content="website">
        <meta property="og:title" content="LIC Neemuch: How Jitendra Patidar Ensures Your Secure Life">
        <meta property="og:description" content="${escapeHTML(metaDescription)}">
        <meta property="og:url" content="${pageUrl}">
        <meta property="og:image" content="https://mys3resources.s3.ap-south-1.amazonaws.com/lic-neemuch-logo.png">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="LIC Neemuch: How Jitendra Patidar Ensures Your Secure Life">
        <meta name="twitter:description" content="${escapeHTML(metaDescription)}">
        <meta name="twitter:image" content="https://mys3resources.s3.ap-south-1.amazonaws.com/lic-neemuch-logo.png">
        <title>LIC Neemuch: How Jitendra Patidar Ensures Your Secure Life</title>
        <link rel="canonical" href="${pageUrl}">
        <link rel="icon" type="image/png" href="https://mys3resources.s3.ap-south-1.amazonaws.com/lic-neemuch-logo.png" sizes="32x32">
        <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
        <style>
          :root {
            --primary-color: #ffbb00;
            --bg-start: #050816;
            --bg-end: #010204;
            --text-color: #e0e0e0;
          }
          body {
            font-family: 'Inter', sans-serif;
            color: var(--text-color);
            background: linear-gradient(180deg, var(--bg-start), var(--bg-end));
            margin: 0;
            line-height: 1.7;
          }
          .navbar {
            position: sticky;
            top: 0;
            background: rgba(0, 0, 0, 0.8);
            padding: 1rem;
            display: flex;
            justify-content: center;
            gap: 1.5rem;
            z-index: 1000;
          }
          .nav-link {
            color: var(--primary-color);
            text-decoration: none;
            font-size: 1.125rem;
            padding: 0.5rem;
          }
          .nav-link:hover, .nav-link:focus {
            color: #fff;
            outline: 2px solid var(--primary-color);
            outline-offset: 2px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
          }
          h1 {
            font-size: 2.5rem;
            color: var(--primary-color);
            text-align: center;
            margin: 1rem 0;
          }
          h2 {
            font-size: 1.8rem;
            color: var(--primary-color);
            margin: 1.5rem 0 1rem;
            border-left: 6px solid var(--primary-color);
            padding-left: 1rem;
          }
          p {
            font-size: 1.125rem;
            margin-bottom: 1rem;
          }
          .content-link {
            color: var(--primary-color);
            text-decoration: none;
            padding-bottom: 2px;
            position: relative;
          }
          .content-link::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 2px;
            bottom: 0;
            left: 0;
            background-color: var(--primary-color);
            transform: scaleX(0);
            transform-origin: bottom right;
            transition: transform 0.3s ease;
          }
          .content-link:hover::after, .content-link:focus::after {
            transform: scaleX(1);
            transform-origin: bottom left;
          }
          .rating-display {
            display: flex;
            gap: 0.5rem;
            margin: 1rem 0;
            color: var(--primary-color);
            font-size: 1.125rem;
          }
          .review-list {
            list-style: none;
            padding: 0;
          }
          .review-item {
            margin-bottom: 1rem;
            font-size: 1rem;
          }
          footer {
            text-align: center;
            padding: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          @media (max-width: 768px) {
            h1 { font-size: 2rem; }
            h2 { font-size: 1.5rem; }
            p, .rating-display, .review-item { font-size: 1rem; }
            .navbar { flex-wrap: wrap; gap: 1rem; }
            .nav-link { font-size: 1rem; }
          }
        </style>
      </head>
      <body>
        <div id="root">${htmlContent}</div>
      </body>
      </html>
    `;

    console.log('SSR HTML length:', html.length);
    cache.set(cacheKey, html);
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('ETag', require('crypto').createHash('md5').update(html).digest('hex'));
    res.status(200).send(html);
    console.log('SSR Response sent for / at', new Date().toISOString());
  } catch (error) {
    console.error('SSR Error:', error.stack);
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="robots" content="noindex">
        <title>Server Error</title>
        <style>
          body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(180deg, #050816, #010204);
            color: #e0e0e0;
            text-align: center;
            padding: 2rem;
            margin: 0;
          }
          .error {
            color: #ffbb00;
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }
          a {
            color: #ffbb00;
            text-decoration: none;
          }
          a:hover, a:focus {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div id="root">
          <div class="error">An error occurred. Please try again later.</div>
          <a href="/" aria-label="Back to Home">Home</a>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.status(500).send(errorHtml);
  }
});

module.exports = router;
