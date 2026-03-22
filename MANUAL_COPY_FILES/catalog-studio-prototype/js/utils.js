/* ═══════════════════════════════════════════════════
   UTILS — DOM helpers, formatters, icon resolver
   ═══════════════════════════════════════════════════ */

const Utils = {

    // ── DOM Helpers ──
    $(selector) {
        return document.querySelector(selector);
    },

    $$(selector) {
        return document.querySelectorAll(selector);
    },

    el(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);
        for (const [key, val] of Object.entries(attrs)) {
            if (key === 'className') element.className = val;
            else if (key === 'innerHTML') element.innerHTML = val;
            else if (key === 'textContent') element.textContent = val;
            else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), val);
            else if (key === 'style' && typeof val === 'object') Object.assign(element.style, val);
            else if (key === 'dataset') Object.assign(element.dataset, val);
            else element.setAttribute(key, val);
        }
        children.forEach(child => {
            if (typeof child === 'string') element.appendChild(document.createTextNode(child));
            else if (child) element.appendChild(child);
        });
        return element;
    },

    // ── Format Helpers ──
    formatCurrency(amount, currency = 'INR') {
        const symbols = { INR: '\u20B9', USD: '$', EUR: '\u20AC', GBP: '\u00A3' };
        const symbol = symbols[currency] || currency;
        if (amount >= 1000) {
            return `${symbol}${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
        }
        return `${symbol}${amount.toLocaleString()}`;
    },

    formatCurrencyFull(amount, currency = 'INR') {
        const symbols = { INR: '\u20B9', USD: '$', EUR: '\u20AC', GBP: '\u00A3' };
        const symbol = symbols[currency] || currency;
        return `${symbol}${amount.toLocaleString('en-IN')}`;
    },

    // ── Category Helpers ──
    getCategoryColor(type) {
        const colors = {
            service: '#7C3AED', spare: '#0891B2', billing: '#059669',
            text: '#64748B', video: '#DC2626', image: '#EA580C',
            checklist: '#0284C7', document: '#CA8A04'
        };
        return colors[type] || '#64748B';
    },

    getCategoryBg(type) {
        const bgs = {
            service: 'rgba(124,58,237,0.12)', spare: 'rgba(8,145,178,0.12)',
            billing: 'rgba(5,150,105,0.12)', text: 'rgba(100,116,139,0.12)',
            video: 'rgba(220,38,38,0.12)', image: 'rgba(234,88,12,0.12)',
            checklist: 'rgba(2,132,199,0.12)', document: 'rgba(202,138,4,0.12)'
        };
        return bgs[type] || 'rgba(100,116,139,0.12)';
    },

    getCategoryIcon(type) {
        const icons = {
            service: '\u2699\uFE0F',   // gear
            spare: '\uD83D\uDD27',     // wrench
            billing: '\uD83D\uDCB3',   // credit card
            text: '\uD83D\uDCDD',      // memo
            video: '\uD83C\uDFA5',     // movie camera
            image: '\uD83D\uDDBC\uFE0F', // framed picture
            checklist: '\u2705',       // check mark
            document: '\uD83D\uDCC4'   // page facing up
        };
        return icons[type] || '\uD83D\uDCE6';
    },

    getPriceTypeLabel(priceType) {
        const labels = {
            per_session: '/session', per_hour: '/hr', per_day: '/day',
            per_unit: '/unit', fixed: '', per_visit: '/visit'
        };
        return labels[priceType] || '';
    },

    // ── DNA Fingerprint Generator ──
    generateDNA(block) {
        // Creates a visual "fingerprint" based on block configuration
        const segments = [];
        const color = this.getCategoryColor(block.type);

        // Segment 1: Price intensity (0-100%)
        const priceMax = 10000;
        const priceRatio = Math.min((block.base_price || 0) / priceMax, 1);
        segments.push({ width: priceRatio, color: color, opacity: 0.9 });

        // Segment 2: Config complexity
        const configKeys = block.config ? Object.keys(block.config).length : 0;
        const configRatio = Math.min(configKeys / 8, 1);
        segments.push({ width: configRatio, color: color, opacity: 0.6 });

        // Segment 3: Evidence requirements (for service blocks)
        let evidenceRatio = 0;
        if (block.config) {
            if (block.config.requirePhoto) evidenceRatio += 0.25;
            if (block.config.requireSignature) evidenceRatio += 0.25;
            if (block.config.requireGPS) evidenceRatio += 0.25;
            if (block.config.requireOTP) evidenceRatio += 0.25;
        }
        segments.push({ width: evidenceRatio, color: color, opacity: 0.4 });

        // Segment 4: Tax
        const taxRatio = Math.min((block.tax_rate || 0) / 28, 1);
        segments.push({ width: taxRatio, color: color, opacity: 0.3 });

        return segments;
    },

    // ── Toast ──
    toast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const icons = {
            success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        };

        const toast = this.el('div', {
            className: `toast ${type}`,
            innerHTML: `<span style="color: var(--${type === 'error' ? 'danger' : type}); display:flex">${icons[type]}</span><span>${message}</span>`
        });

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ── Debounce ──
    debounce(fn, delay = 250) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    // ── Random ──
    randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    },

    // ── ID Generator ──
    uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
};
