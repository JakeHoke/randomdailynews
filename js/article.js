/**
 * Random Daily News — Article Page
 *
 * URL format:
 *   /article.html?id=ARTICLE_ID
 *
 * Load sequence:
 *   1. Read ?id= from URL
 *   2. Load header.html / footer.html components in parallel
 *   3. Fetch Firestore document: articles/{id}
 *   4. Inject all article fields into the template
 *   5. Remove skeleton loading state
 *
 * Firestore fields used:
 *   title, tagline, authorName, category, readTime (number),
 *   imageUrl, imageAlt, imageCaption, body (string[]),
 *   tags (string[]), monthKey
 */

import { db }           from './firebase.js';
import { doc, getDoc }  from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

/* --------------------------------------------
   Configuration
   -------------------------------------------- */
const CONFIG = {
    headerUrl:     'components/header.html',
    footerUrl:     'components/footer.html',
    enableLogging: true,   // Set false to silence console output
};

/* --------------------------------------------
   Logging Helper
   -------------------------------------------- */
function log(message, data) {
    if (!CONFIG.enableLogging) return;
    data !== undefined
        ? console.log('[RDN Article]', message, data)
        : console.log('[RDN Article]', message);
}

/* --------------------------------------------
   Component Loader
   Fetches an HTML partial and replaces the mount div.
   insertAdjacentHTML handles multiple root elements cleanly.
   -------------------------------------------- */
async function loadComponent(url, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) {
        log(`Mount #${mountId} not found, skipping`);
        return;
    }

    log(`Loading component: ${url} → #${mountId}`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        mount.insertAdjacentHTML('beforebegin', html);
        mount.remove();
        log(`Component injected: ${url}`);
    } catch (err) {
        log(`Failed to load component: ${url}`, err.message);
        mount.remove();
    }
}

/* --------------------------------------------
   Sticky Header
   Must run AFTER header.html is injected.
   -------------------------------------------- */
function initStickyHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    log('Sticky header initialized');
    window.addEventListener('scroll', () => {
        header.classList.toggle('is-scrolled', window.scrollY > 60);
    }, { passive: true });
}

/* --------------------------------------------
   URL: Article ID
   Reads the ?id= query parameter.
   -------------------------------------------- */
function getArticleId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '';
}

/* --------------------------------------------
   Formatters
   -------------------------------------------- */

// "2026-03" → "March 2026"
function formatMonthKey(monthKey) {
    if (!monthKey) return '';
    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const [year, month] = monthKey.split('-');
    const label = MONTHS[parseInt(month, 10) - 1];
    return label ? `${label} ${year}` : monthKey;
}

// 4 → "4 min read"
function formatReadTime(readTime) {
    if (!readTime && readTime !== 0) return '';
    return `${readTime} min read`;
}

/* --------------------------------------------
   Category → CSS Pill Class
   -------------------------------------------- */
function getPillClass(category) {
    const map = {
        tech:          'pill-tech',
        politics:      'pill-politics',
        lifestyle:     'pill-lifestyle',
        business:      'pill-business',
        entertainment: 'pill-entertainment',
        satire:        'pill-satire',
    };
    const key = (category || 'satire').toLowerCase().trim();
    return map[key] || 'pill-satire';
}

/* --------------------------------------------
   DOM Helper
   -------------------------------------------- */
function setAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
}

/* --------------------------------------------
   Inject Article Data
   Maps Firestore fields to DOM elements.

   Field mapping (Firestore → HTML element):
     title        → #article-title  + document.title
     tagline      → #article-tagline
     authorName   → #article-author
     category     → #article-category (pill class + label)
     readTime     → #article-read-time  (formatted: "N min read")
     imageUrl     → #article-image src
     imageAlt     → #article-image alt
     imageCaption → #article-caption
     body[]       → <p> elements appended to #article-body
     tags[]       → .tag-pill spans appended to #article-tags
     monthKey     → #article-date (formatted: "Month YYYY")
   -------------------------------------------- */
function injectArticle(data) {
    log('Injecting article data', data.title);

    // Title — update both the <h1> and the browser tab
    const titleEl = document.getElementById('article-title');
    if (titleEl && data.title) {
        titleEl.textContent = data.title;
        document.title = `${data.title} — Random Daily News`;
    }

    // Tagline
    const taglineEl = document.getElementById('article-tagline');
    if (taglineEl && data.tagline) {
        taglineEl.textContent = data.tagline;
    }

    // Category pill
    const categoryEl = document.getElementById('article-category');
    if (categoryEl && data.category) {
        categoryEl.className   = `category-pill ${getPillClass(data.category)}`;
        categoryEl.textContent = data.category.toUpperCase();
    }

    // Read time (numeric field → formatted string)
    const readTimeEl = document.getElementById('article-read-time');
    if (readTimeEl && data.readTime != null) {
        readTimeEl.textContent = formatReadTime(data.readTime);
    }

    // Author — reveal the separator dot once we have a name
    const authorEl = document.getElementById('article-author');
    const sepEl    = document.getElementById('byline-sep');
    if (authorEl && data.authorName) {
        authorEl.textContent = data.authorName;
        if (sepEl) sepEl.style.display = '';
    }

    // Date from monthKey ("2026-03" → "March 2026")
    const dateEl = document.getElementById('article-date');
    if (dateEl && data.monthKey) {
        dateEl.textContent = formatMonthKey(data.monthKey);
    }

    // Hero image (Firestore field: imageUrl)
    if (data.imageUrl) {
        setAttr('article-image', 'src', data.imageUrl);
        setAttr('article-image', 'alt', data.imageAlt || data.tagline || '');
    } else {
        // Hide figure entirely if no image is available
        const fig = document.getElementById('article-figure');
        if (fig) fig.classList.add('is-hidden');
    }

    // Image caption
    const captionEl = document.getElementById('article-caption');
    if (captionEl && data.imageCaption) {
        captionEl.textContent = data.imageCaption;
    }

    // Body paragraphs — one <p> per array item
    const bodyEl  = document.getElementById('article-body');
    const skeleton = document.getElementById('body-skeleton');
    if (bodyEl && Array.isArray(data.body)) {
        if (skeleton) skeleton.remove();
        data.body.forEach(text => {
            const p = document.createElement('p');
            p.textContent = text;
            bodyEl.appendChild(p);
        });
    }

    // Tags — one .tag-pill span per array item
    const tagsEl = document.getElementById('article-tags');
    if (tagsEl && Array.isArray(data.tags) && data.tags.length > 0) {
        data.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className   = 'tag-pill';
            span.textContent = tag;
            tagsEl.appendChild(span);
        });
    }
}

/* --------------------------------------------
   Error State
   Shown when the article document does not exist
   or the Firestore read fails.
   -------------------------------------------- */
function showError(articleId) {
    log('Showing error state for id:', articleId);

    document.title = 'Article Not Found — Random Daily News';

    const skeleton = document.getElementById('body-skeleton');
    if (skeleton) skeleton.remove();

    const bodyEl = document.getElementById('article-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
        <div class="article-error">
            <h2>Article Not Found</h2>
            <p>We couldn't find an article with ID <code>${articleId || 'unknown'}</code>.
               The link may be broken or the article may have been removed.</p>
            <a href="/" class="btn-home">&larr; Back to Home</a>
        </div>
    `;
}

/* --------------------------------------------
   Remove Body Skeleton
   Removes .is-loading from the body container
   after content is injected (or after an error).
   -------------------------------------------- */
function removeBodyLoading() {
    const bodyEl = document.getElementById('article-body');
    if (bodyEl) bodyEl.classList.remove('is-loading');
}

/* --------------------------------------------
   Share Buttons
   Twitter and Facebook use standard share URLs.
   Copy Link uses the Clipboard API.
   -------------------------------------------- */
function initShareButtons() {
    const pageUrl   = encodeURIComponent(window.location.href);
    const pageTitle = encodeURIComponent(document.title);

    const twitterBtn = document.getElementById('share-twitter');
    if (twitterBtn) {
        twitterBtn.href   = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
        twitterBtn.target = '_blank';
        twitterBtn.rel    = 'noopener noreferrer';
    }

    const fbBtn = document.getElementById('share-facebook');
    if (fbBtn) {
        fbBtn.href   = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
        fbBtn.target = '_blank';
        fbBtn.rel    = 'noopener noreferrer';
    }

    const copyBtn = document.getElementById('share-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', e => {
            e.preventDefault();
            navigator.clipboard.writeText(window.location.href)
                .then(() => {
                    copyBtn.textContent = 'Copied!';
                    copyBtn.classList.add('share-btn--copied');
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy Link';
                        copyBtn.classList.remove('share-btn--copied');
                    }, 2200);
                })
                .catch(err => {
                    log('Clipboard write failed', err.message);
                    copyBtn.textContent = 'Copy failed';
                });
        });
    }
}

/* --------------------------------------------
   Initialize
   -------------------------------------------- */
async function init() {
    log('Initializing article page');

    const articleId = getArticleId();
    log('Article ID from URL', articleId);

    // Load site-wide components concurrently
    loadComponent(CONFIG.headerUrl, 'header-mount')
        .then(() => initStickyHeader());

    loadComponent(CONFIG.footerUrl, 'footer-mount');

    // Fetch article from Firestore
    if (articleId) {
        try {
            const snap = await getDoc(doc(db, 'articles', articleId));

            if (!snap.exists()) {
                throw new Error(`Article not found: articles/${articleId}`);
            }

            const data = snap.data();
            log('Article loaded from Firestore', articleId);

            injectArticle(data);

        } catch (err) {
            log('Firestore fetch failed', err.message);
            showError(articleId);

        } finally {
            removeBodyLoading();
        }

    } else {
        log('No ?id= param in URL');
        showError('');
        removeBodyLoading();
    }

    // Share buttons build their URLs from window.location, so init after load
    initShareButtons();
}

init();
