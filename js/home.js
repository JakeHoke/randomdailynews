/**
 * Random Daily News — Test Homepage Script
 * Reads from `test_homepage/main` instead of `homepage/main`
 */

import { db } from './firebase.js'; 
import { doc, getDoc, collection, query, where, documentId, getDocs } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const CONFIG = {
    headerUrl:     'components/header.html',
    footerUrl:     'components/footer.html',
    enableLogging: true,
};

function log(...args) {
    if (CONFIG.enableLogging) console.log('[RDN Test Home]', ...args);
}

/* --------------------------------------------
   Component Loader
   -------------------------------------------- */
async function loadComponent(url, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        mount.insertAdjacentHTML('beforebegin', html);
        mount.remove();
    } catch (err) {
        log(`Failed to load component: ${url}`, err.message);
        mount.remove();
    }
}

function initStickyHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('is-scrolled', window.scrollY > 60);
    }, { passive: true });
}

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

function setAttr(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setClass(id, className) {
    const el = document.getElementById(id);
    if (el) el.className = className;
}

/* --------------------------------------------
   Data Fetching: Resolve IDs to Articles
   -------------------------------------------- */
async function loadHomepageData() {
    log("Fetching test_homepage/main...");
    const homeRef = doc(db, 'test_homepage', 'main');
    const homeSnap = await getDoc(homeRef);
    
    if (!homeSnap.exists()) {
        throw new Error('Test Homepage configuration (test_homepage/main) not found. Create it in Firebase Console first!');
    }
    
    const config = homeSnap.data();
    log("Homepage config loaded:", config);

    const allIds = new Set([
        config.hero,
        ...(config.featured || []),
        ...(config.top_month || [])
    ].filter(Boolean));

    if (allIds.size === 0) {
        log("No articles configured on test homepage.");
        return { hero: null, featured: [], topMonth: [] };
    }

    const idsArray = Array.from(allIds);
    const articlesMap = {};
    
    log(`Fetching ${idsArray.length} unique articles...`);
    for (let i = 0; i < idsArray.length; i += 10) {
        const chunk = idsArray.slice(i, i + 10);
        const q = query(collection(db, 'articles'), where(documentId(), 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            const data = doc.data();
            articlesMap[doc.id] = { id: doc.id, ...data };
        });
    }

    const resolved = {
        hero: articlesMap[config.hero] || null,
        featured: (config.featured || []).map(id => articlesMap[id]).filter(Boolean),
        topMonth: (config.top_month || []).map(id => articlesMap[id]).filter(Boolean)
    };

    log("Resolved homepage data:", resolved);
    return resolved;
}

/* --------------------------------------------
   Rendering Functions
   -------------------------------------------- */
function renderCard(article, prefix) {
    if (!article) return;
    const url = `/article?id=${article.id}`;
    const imageUrl = article.image || article.imageUrl || '';
    
    setAttr(`${prefix}-link`, 'href', url);
    setAttr(`${prefix}-image`, 'src', imageUrl);
    setAttr(`${prefix}-image`, 'alt', article.imageAlt || article.title);
    setText(`${prefix}-title`, article.title);
    setText(`${prefix}-tagline`, article.tagline);
    
    const badgeEl = document.getElementById(`${prefix}-badge`);
    if (badgeEl) {
        // If it's the hero, it uses category-pill, others use badge-overlay
        if (prefix === 'hero') {
            badgeEl.className = `category-pill ${getPillClass(article.category)}`;
        } else {
            badgeEl.className = `badge-overlay ${getPillClass(article.category)}`;
        }
        badgeEl.textContent = (article.category || 'Satire').toUpperCase();
    }
}

function renderHero(article) {
    if (article) renderCard(article, 'hero');
}

function renderFeatured(articles) {
    // Up to 3 featured articles: card1, card2, card3
    for (let i = 0; i < Math.min(3, articles.length); i++) {
        renderCard(articles[i], `card${i + 1}`);
    }
}

function renderTopMonth(articles) {
    // Up to 6 top month articles: top1 ... top6
    for (let i = 0; i < Math.min(6, articles.length); i++) {
        renderCard(articles[i], `top${i + 1}`);
    }
}

/* --------------------------------------------
   Initialize
   -------------------------------------------- */
async function init() {
    log('Initializing test homepage');

    loadComponent(CONFIG.headerUrl, 'header-mount').then(() => initStickyHeader());
    loadComponent(CONFIG.footerUrl, 'footer-mount');

    try {
        const data = await loadHomepageData();

        renderHero(data.hero);
        renderFeatured(data.featured);
        renderTopMonth(data.topMonth);

        // Remove shimmer effect
        const main = document.getElementById('main-content');
        if (main) main.classList.remove('is-loading');
        
    } catch (err) {
        console.error("Error loading homepage:", err);
    }
}

init();
