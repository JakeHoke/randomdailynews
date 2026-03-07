/**
 * Random Daily News — Article Page
 *
 * URL format:
 *   /article.html?id=ARTICLE_ID
 *
 * Load sequence:
 *   1. Read ?id= from URL
 *   2. Load header.html / footer.html components
 *   3. Fetch Firestore document: articles/{id}
 *   4. Inject all fields into the template
 *   5. Remove skeleton loading state
 *
 * Firestore fields used (with fallback aliases in parentheses):
 *   title, tagline, authorName (author), category, readTime (number or string),
 *   imageUrl (image), imageAlt, imageCaption, body (string[]),
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
   Inject Article Data from Firestore
   Maps Firestore fields to DOM elements.

   Field aliases (primary → fallback):
     imageUrl   → image        (renamed in schema)
     authorName → author       (renamed in schema)
     readTime accepts both number (4) and string ("4 min read")

   Field mapping (Firestore → HTML element):
     title        → #article-title + document.title
     tagline      → #article-tagline
     authorName   → #article-author
     category     → #article-category (pill class + label)
     readTime     → #article-read-time ("N min read")
     imageUrl     → #article-image src
     imageAlt     → #article-image alt
     imageCaption → #article-caption
     body[]       → <p> elements in #article-body
     tags[]       → .tag-pill spans in #article-tags
     monthKey     → #article-date ("Month YYYY")
   -------------------------------------------- */
function injectArticle(data) {
    log('Injecting Firestore data', data.title);

    // Title — override Phase 1 if Firestore has one
    const title = data.title;
    if (title) {
        document.title = `${title} — Random Daily News`;
        const titleEl = document.getElementById('article-title');
        if (titleEl) titleEl.textContent = title;
    }

    // Tagline
    const taglineEl = document.getElementById('article-tagline');
    if (taglineEl && data.tagline) taglineEl.textContent = data.tagline;

    // Category pill
    const categoryEl = document.getElementById('article-category');
    if (categoryEl && data.category) {
        categoryEl.className   = `category-pill ${getPillClass(data.category)}`;
        categoryEl.textContent = data.category.toUpperCase();
    }

    // Read time — accepts number (4) or pre-formatted string ("4 min read")
    const readTimeEl = document.getElementById('article-read-time');
    if (readTimeEl && data.readTime != null) {
        const rt = data.readTime;
        readTimeEl.textContent = typeof rt === 'number' ? formatReadTime(rt) : rt;
    }

    // Author — try authorName, fall back to author
    // Reveals the separator dot once populated
    const authorName = data.authorName || data.author;
    const authorEl   = document.getElementById('article-author');
    const sepEl      = document.getElementById('byline-sep');
    if (authorEl && authorName) {
        authorEl.textContent = authorName;
        if (sepEl) sepEl.style.display = '';
    }

    // Date — use monthKey if present; otherwise keep the Phase 1 URL date
    const dateEl = document.getElementById('article-date');
    if (dateEl && data.monthKey) {
        dateEl.textContent = formatMonthKey(data.monthKey);
    }

    // Hero image — try imageUrl, fall back to image (legacy field name)
    const imageSrc = data.imageUrl || data.image;
    if (imageSrc) {
        setAttr('article-image', 'src', imageSrc);
        setAttr('article-image', 'alt', data.imageAlt || data.tagline || '');
    } else {
        // No image available — hide the figure entirely
        const fig = document.getElementById('article-figure');
        if (fig) fig.classList.add('is-hidden');
    }

    // Image caption
    const captionEl = document.getElementById('article-caption');
    if (captionEl && data.imageCaption) captionEl.textContent = data.imageCaption;

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

    // Tags — one .tag-pill span per item
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
    log('Article ID', articleId);

    // Load site-wide components concurrently with Firestore fetch
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

    // Share buttons build their URLs from window.location — init after all params are known
    initShareButtons();
}

init();
