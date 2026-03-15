/**
 * Random Daily News — Static Page Loader
 *
 * Shared script for all static info pages (About, Contact, Privacy, Terms).
 * Responsibilities:
 *  1. Load header.html / footer.html component partials
 *  2. Activate sticky header shadow on scroll
 */

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
        ? console.log('[RDN]', message, data)
        : console.log('[RDN]', message);
}

/* --------------------------------------------
   Component Loader
   Fetches an HTML partial and replaces the mount div.
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
   Must run AFTER header.html is in the DOM.
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
   Topbar Date
   -------------------------------------------- */
function setTopbarDate() {
    const el = document.getElementById('topbar-date');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year:    'numeric',
        month:   'long',
        day:     'numeric',
    });
}

/* --------------------------------------------
   Initialize
   -------------------------------------------- */
async function init() {
    log('Initializing static page');

    await loadComponent(CONFIG.headerUrl, 'header-mount');
    initStickyHeader();
    setTopbarDate();

    loadComponent(CONFIG.footerUrl, 'footer-mount');
}

init();
