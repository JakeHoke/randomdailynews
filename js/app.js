/**
 * Random Daily News — Homepage Content Loader
 *
 * Responsibilities:
 *  1. Load header.html / footer.html component partials
 *  2. Sticky header shadow on scroll (after header is in DOM)
 *  3. Fetch homepage content from Firestore (homepage/main)
 *  4. Inject data into fixed HTML card placeholders
 *  5. Remove shimmer loading state after injection
 *  6. Graceful fallback if Firestore read fails
 */

import { db }            from './firebase.js';
import { doc, getDoc }   from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

/* --------------------------------------------
   Configuration
   -------------------------------------------- */
const CONFIG = {
    headerUrl:     'components/header.html',
    footerUrl:     'components/footer.html',
    enableLogging: true,   // Set false to silence console output
};

/* --------------------------------------------
   Fallback Data
   Rendered when the Firestore read fails so the
   page never shows empty card placeholders.
   -------------------------------------------- */
const FALLBACK_DATA = {
    hero: {
        title:    'Man Spends Entire Weekend Optimizing Morning Routine, Forgets To Start It',
        tagline:  'Sources confirm he has 47 alarms set for "optimal wake window"',
        image:    'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=1200',
        url:      '#',
        category: 'Lifestyle',
    },
    featured: [
        { title: 'Startup Raises $12M To Reinvent Ice Cubes',                          tagline: 'Investors say the cubes are "disruptive" and "chill"',      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', url: '#', category: 'Business'  },
        { title: 'Area Dog Reportedly Between Opportunities',                            tagline: 'Taking time to "find the right fit" says concerned owner',   image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600', url: '#', category: 'Lifestyle' },
        { title: 'Local Man Discovers He Has Been Pronouncing "Gif" Correctly All Along', tagline: 'Entire office still refuses to believe him',                image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600', url: '#', category: 'Tech'      },
    ],
    top_month: [
        { title: 'Study Finds 100% Of People Who Drink Water Eventually Die',             tagline: 'Researchers urge caution',    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400', url: '#' },
        { title: 'Cat Refuses To Acknowledge Owner Until Treats Are Produced',            tagline: 'Experts call it "typical"',   image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', url: '#' },
        { title: 'Man Successfully Avoids Small Talk For 47th Consecutive Elevator Ride', tagline: 'Personal record',             image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', url: '#' },
        { title: 'New App Lets You Order Anxiety Directly To Your Phone',                 tagline: 'Already 2M downloads',       image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400', url: '#' },
        { title: 'Local Woman Still Waiting For "Right Moment" To Start Fitness Journey', tagline: 'Monday seems promising',     image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', url: '#' },
        { title: 'Scientists Confirm That Yes, You Did Need To Send That Text',           tagline: 'No take-backs',              image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400', url: '#' },
    ],
};

/* --------------------------------------------
   Logging Helper
   -------------------------------------------- */
function log(message, data) {
    if (!CONFIG.enableLogging) return;
    data !== undefined
        ? console.log('[RDN]', message, data)
        : console.log('[RDN]', message);
}

/* --------------------------------------------
   DOM Injection Helpers
   -------------------------------------------- */
function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    } else {
        log(`Element not found: #${id}`);
    }
}

function setAttribute(id, attr, value) {
    const el = document.getElementById(id);
    if (el) {
        el.setAttribute(attr, value);
    } else {
        log(`Element not found: #${id}`);
    }
}

function setLinkHref(id, url) {
    setAttribute(id, 'href', url || '#');
}

/* --------------------------------------------
   Category → CSS Pill Class
   Maps a category string to its pill color class.
   Falls back to pill-satire for unknown categories.
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
   Sticky Header: Shadow on Scroll
   Must run AFTER header.html is injected so that
   #site-header exists in the DOM.
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
   Populate: Hero Card
   Firestore fields: image, title, tagline, url, category
   -------------------------------------------- */
function populateHero(hero) {
    if (!hero) {
        log('Hero data missing, skipping');
        return;
    }
    log('Populating hero', hero.title);

    setLinkHref('hero-link', hero.url);
    setAttribute('hero-image', 'src', hero.image);
    setAttribute('hero-image', 'alt', hero.title);
    setTextContent('hero-title', hero.title);
    setTextContent('hero-tagline', hero.tagline);

    const badge = document.getElementById('hero-badge');
    if (badge) {
        badge.className   = `category-pill ${getPillClass(hero.category)}`;
        badge.textContent = (hero.category || 'Satire').toUpperCase();
    }
}

/* --------------------------------------------
   Populate: Featured Cards (card1, card2, card3)
   Firestore fields per item: image, title, tagline, url, category
   -------------------------------------------- */
function populateFeatured(featured) {
    if (!Array.isArray(featured)) {
        log('Featured data missing or not an array');
        return;
    }
    log('Populating featured cards', featured.length);

    for (let i = 0; i < 3; i++) {
        const card = featured[i];
        const n    = i + 1;
        if (!card) continue;

        setLinkHref(`card${n}-link`,        card.url);
        setAttribute(`card${n}-image`, 'src', card.image);
        setAttribute(`card${n}-image`, 'alt', card.title);
        setTextContent(`card${n}-title`,    card.title);
        setTextContent(`card${n}-tagline`,  card.tagline);
    }
}

/* --------------------------------------------
   Populate: Top Articles of the Month (top1–top6)
   Firestore fields per item: image, title, tagline, url
   -------------------------------------------- */
function populateTopMonth(topMonth) {
    if (!Array.isArray(topMonth)) {
        log('Top-month data missing or not an array');
        return;
    }
    log('Populating top-month cards', topMonth.length);

    for (let i = 0; i < 6; i++) {
        const card = topMonth[i];
        const n    = i + 1;
        if (!card) continue;

        setLinkHref(`top${n}-link`,        card.url);
        setAttribute(`top${n}-image`, 'src', card.image);
        setAttribute(`top${n}-image`, 'alt', card.title);
        setTextContent(`top${n}-title`,    card.title);
        setTextContent(`top${n}-tagline`,  card.tagline);
    }
}

/* --------------------------------------------
   Remove Shimmer Loading State
   -------------------------------------------- */
function removeLoadingState() {
    const main = document.getElementById('main-content');
    if (main) {
        main.classList.remove('is-loading');
        log('Loading state removed');
    }
}

/* --------------------------------------------
   Load Homepage Content from Firestore
   Reads: homepage/main
   Falls back to FALLBACK_DATA on any error.
   -------------------------------------------- */
async function loadHomepageContent() {
    log('Fetching Firestore document: homepage/main');

    try {
        const snap = await getDoc(doc(db, 'homepage', 'main'));

        if (!snap.exists()) {
            throw new Error('Document not found: homepage/main');
        }

        const data = snap.data();
        log('Firestore data loaded successfully');

        populateHero(data.hero);
        populateFeatured(data.featured);
        populateTopMonth(data.top_month);

    } catch (err) {
        log('Firestore error — rendering fallback data', err.message);
        populateHero(FALLBACK_DATA.hero);
        populateFeatured(FALLBACK_DATA.featured);
        populateTopMonth(FALLBACK_DATA.top_month);

    } finally {
        removeLoadingState();
    }
}

/* --------------------------------------------
   Initialize
   Components and content load concurrently.
   initStickyHeader() is chained after the header
   resolves so #site-header exists in the DOM.
   -------------------------------------------- */
async function init() {
    log('Initializing Random Daily News');

    loadComponent(CONFIG.headerUrl, 'header-mount')
        .then(() => initStickyHeader());

    loadComponent(CONFIG.footerUrl, 'footer-mount');

    // Firestore read is independent of component loading
    loadHomepageContent();
}

init();
