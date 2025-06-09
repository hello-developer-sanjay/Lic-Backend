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
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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
  const cacheKey = 'ssr:home';
  if (cache.has(cacheKey)) {
    const cachedHtml = cache.get(cacheKey);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600');
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
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: pageUrl },
          { '@type': 'ListItem', position: 2, name: 'Reviews', item: `${pageUrl}reviews` },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Who is Jitendra Patidar at LIC Neemuch?', acceptedAnswer: { '@type': 'Answer', text: 'Jitendra Patidar is a Development Officer at LIC Neemuch, ensuring secure life insurance solutions and recruiting agents.' } },
          { '@type': 'Question', name: 'How to become an LIC agent in Neemuch?', acceptedAnswer: { '@type': 'Answer', text: 'Contact Jitendra Patidar, pass the IRDAI exam, and complete LIC training to become an agent.' } },
          { '@type': 'Question', name: 'How to contact Jitendra Patidar for LIC services?', acceptedAnswer: { '@type': 'Answer', text: 'Contact Jitendra Patidar via lic-neemuch-jitendra-patidar.vercel.app or call +917987235207 for secure life insurance.' } },
          { '@type': 'Question', name: 'LIC एजेंट कैसे बनें?', acceptedAnswer: { '@type': 'Answer', text: 'LIC एजेंट बनने के लिए नीमच में जीतेंद्र पाटीदार से संपर्क करें, IRDAI परीक्षा पास करें, और LIC प्रशिक्षण पूरा करें।' } },
        ],
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
                At LIC Neemuch, led by Development Officer <strong>Jitendra Patidar</strong>, we ensure your secure life through comprehensive life insurance and financial planning solutions. Serving Neemuch, Mandsaur, Ratangarh, Singoli, Manasa, Jawad, and Sarwaniya Maharaj, our mission is to empower families with trusted LIC policies for a secure future. Whether you seek term insurance, endowment plans, ULIPs, pension plans, or child plans, we offer personalized services to safeguard your life.
              </p>
              <p class="content-text" lang="hi">
                नीमच में एलआईसी, विकास अधिकारी <strong>जीतेंद्र पाटीदार</strong> के नेतृत्व में, आपके सुरक्षित जीवन को सुनिश्चित करता है। नीमच, मंदसौर, रतनगढ़, सिंगोली, मनासा, जावद और सरवानीयाँ महाराज की सेवा करते हुए, हमारा मिशन विश्वसनीय एलआईसी पॉलिसियों के माध्यम से परिवारों को सुरक्षित भविष्य प्रदान करना है। टर्म इंश्योरेंस, एंडोमेंट प्लान, ULIP, पेंशन प्लान, या चाइल्ड प्लान, हम आपके जीवन की सुरक्षा के लिए वैयक्तिकृत सेवाएँ प्रदान करते हैं।
              </p>
              ${ratingCount > 0 && averageRating >= 1 ? `
                <div class="rating-display" aria-label="Average customer rating">
                  <span>${renderStars(averageRating)}</span>
                  <span>${averageRating}/5 (${ratingCount} reviews)</span>
                </div>
              ` : ''}
            </section>
            <section aria-labelledby="contact-heading">
              <h2 id="contact-heading" class="section-heading">Contact Jitendra Patidar for a Secure Life</h2>
              <figure class="profile-figure">
                <img src="https://mys3resources.s3.ap-south-1.amazonaws.com/LIC/jitendraprofilephoto.jpg" alt="Jitendra Patidar, LIC Development Officer ensuring secure life" width="300" height="300" class="profile-image" loading="eager" decoding="async" fetchpriority="high">
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
              <p class="content-text">
                Ready to ensure your secure life? Visit the <a href="https://licindia.in/hi/home" class="content-link" target="_blank" rel="noopener noreferrer">LIC India website</a> or our <a href="/services" class="content-link">services page</a> for more details.
              </p>
            </section>
            <section aria-labelledby="agent-heading">
              <h2 id="agent-heading" class="section-heading">Become an LIC Agent with Jitendra Patidar</h2>
              <p class="content-text" lang="en">
                Join Jitendra Patidar’s team at LIC Neemuch as an LIC agent to ensure a secure career. Enjoy flexible hours, comprehensive training, and attractive commissions. Start by passing the IRDAI exam and completing LIC’s training program. <a href="/join" class="content-link">Learn more about secure agent opportunities</a>.
              </p>
              <p class="content-text" lang="hi">
                नीमच में जीतेंद्र पाटीदार की टीम में एलआईसी एजेंट के रूप में शामिल होकर सुरक्षित करियर सुनिश्चित करें। लचीले घंटों, व्यापक प्रशिक्षण और आकर्षक कमीशन का आनंद लें। IRDAI परीक्षा पास करें और LIC का प्रशिक्षण पूरा करें। <a href="/join" class="content-link">सुरक्षित एजेंट अवसरों के बारे में और जानें</a>।
              </p>
            </section>
            <img src="https://mys3resources.s3.ap-south-1.amazonaws.com/LIC/lic_neemuch_header_11zon.webp" alt="LIC Neemuch Office ensuring secure life insurance" class="office-image" width="600" height="200" loading="lazy" decoding="async">
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
                <p class="content-text">
                  Want to leave a review or rating? Visit our <a href="/reviews" class="content-link">Reviews & Feedback page</a>.
                </p>
              ` : '<p class="content-text">No reviews yet. Be the first to leave a review on our <a href="/reviews" class="content-link">Reviews & Feedback page</a>.</p>'}
            </section>
          </article>
        </main>
        <footer class="footer">
          <p class="content-text">
            Discover <a href="https://zedemy.vercel.app" class="content-link" target="_blank" rel="noopener noreferrer">Zedemy</a> by Sanjay Patidar
          </p>
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
        <meta name="content-language" content="en">
        <meta name="description" content="${escapeHTML(metaDescription)}">
        <meta name="keywords" content="${escapeHTML(keywords)}">
        <meta name="author" content="Jitendra Patidar">
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
        <meta name="geo.region" content="IN-MP">
        <meta name="geo.placename" content="Neemuch, Madhya Pradesh">
        <meta name="geo.position" content="24.476385;74.862409">
        <meta property="og:type" content="website">
        <meta property="og:title" content="LIC Neemuch: How Jitendra Patidar Ensures Your Secure Life">
        <meta property="og:description" content="${escapeHTML(metaDescription)}">
        <meta property="og:url" content="${pageUrl}">
        <meta property="og:image" content="${titleImage}">
        <meta property="og:image:width" content="600">
        <meta property="og:image:height" content="200">
        <meta property="og:image:alt" content="LIC Neemuch Logo">
        <meta property="og:site_name" content="LIC Neemuch">
        <meta property="og:locale" content="en_US">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="LIC Neemuch: How Jitendra Patidar Ensures Your Secure Life">
        <meta name="twitter:description" content="${escapeHTML(metaDescription)}">
        <meta name="twitter:image" content="${titleImage}">
        <meta name="twitter:site" content="@jitendrapatidar">
        <title>LIC Neemuch: How Jitendra Patidar Ensures Your Secure Life</title>
        <link rel="canonical" href="${pageUrl}">
        <link rel="alternate" hreflang="en" href="${pageUrl}">
        <link rel="alternate" hreflang="hi" href="${pageUrl}">
        <link rel="preload" as="image" href="https://mys3resources.s3.ap-south-1.amazonaws.com/LIC/jitendraprofilephoto.jpg" imagesrcset="https://mys3resources.s3.ap-south-1.amazonaws.com/LIC/jitendraprofilephoto.jpg 300w" imagesizes="300px">
        <link rel="preload" as="image" href="${titleImage}" imagesrcset="${titleImage} 600w" imagesizes="600px">
        <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
        <style>
          :root {
            --primary-color: #ffbb00;
            --secondary-color: #e85d04;
            --text-color: #e0e0e0;
            --bg-color: #050816;
            --bg-gradient: linear-gradient(180deg, #050816, #010204);
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; font-size: 100%; }
          body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.7; color: var(--text-color); background: var(--bg-gradient); }
          .navbar { position: sticky; top: 0; width: 100%; background: rgba(0, 0, 0, 0.8); z-index: 1000; padding: 1rem; display: flex; justify-content: center; flex-wrap: wrap; gap: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
          .nav-link { color: var(--primary-color); text-decoration: none; font-weight: 600; padding: 0.5rem 1rem; transition: color 0.2s ease; }
          .nav-link:hover { color: var(--secondary-color); }
          .container { max-width: 1200px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; align-items: center; }
          .hero-title { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 800; color: var(--primary-color); text-align: center; margin: 1rem 0; text-shadow: 0 2px 4px rgba(255, 187, 0, 0.5); }
          .section-heading { font-size: clamp(1.5rem, 3vw, 1.8rem); color: var(--primary-color); margin: 1.5rem 0 1rem; }
          .content-text { font-size: clamp(1rem, 2vw, 1.125rem); line-height: 1.8; margin-bottom: 1rem; color: var(--text-color); }
          .content-link { color: var(--primary-color); text-decoration: none; }
          .content-link:hover { color: var(--secondary-color); }
          .profile-figure { flex-shrink: 0; margin: 1rem 0; }
          .profile-image { width: 300px; height: 300px; border-radius: 50%; box-shadow: 0 0 10px rgba(255, 165, 0, 0.6); object-fit: cover; }
          .office-image { width: 600px; height: 200px; border-radius: 10px; box-shadow: 0 0 10px rgba(255, 255, 255, 0.3); margin: 1rem; }
          .rating-display { display: flex; align-items: center; gap: 0.5rem; margin: 1rem 0; font-size: 1.2rem; color: var(--primary-color); }
          .review-item { margin-bottom: 1rem; font-size: 1rem; }
          .footer { width: 100%; max-width: 1200px; padding: 1rem; text-align: center; color: var(--text-color); }
          @media (max-width: 768px) {
            .hero-title { font-size: 1.8rem; }
            .section-heading { font-size: 1.4rem; }
            .profile-image { width: 180px; height: 180px; }
            .office-image { width: 100%; height: auto; }
          }
        </style>
      </head>
      <body>
        <div id="root" data-html="${escapeHTML(htmlContent)}">
          ${htmlContent}
        </div>
        <script>
          window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
        </script>
        <script src="/dist/main.js" defer></script>
      </body>
      </html>
    `;

    cache.set(cacheKey, html);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600');
    res.setHeader('ETag', crypto.createHash('md5').update(html).digest('hex'));
    res.status(200).send(html);
  } catch (error) {
    console.error('SSR Error:', error.stack);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Error</title>
      </head>
      <body>
        <div id="root">
          <div>An error occurred. Please try again later.</div>
          <a href="/">Home</a>
        </div>
        <script src="/dist/main.js" defer></script>
      </body>
      </html>
    `);
  }
});

module.exports = router;
