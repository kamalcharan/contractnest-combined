/* ═══════════════════════════════════════════════════
   UTILS — DOM helpers, formatters
   ═══════════════════════════════════════════════════ */
const Utils = {
    $(s) { return document.querySelector(s); },
    $$(s) { return document.querySelectorAll(s); },

    el(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);
        for (const [key, val] of Object.entries(attrs)) {
            if (key === 'className') element.className = val;
            else if (key === 'innerHTML') element.innerHTML = val;
            else if (key === 'textContent') element.textContent = val;
            else if (key.startsWith('on') && key.length > 2) element.addEventListener(key.slice(2).toLowerCase(), val);
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

    covClass(percent) {
        if (percent >= 50) return 'high';
        if (percent >= 20) return 'mid';
        if (percent > 0) return 'low';
        return 'zero';
    },

    covLabel(percent) {
        if (percent >= 50) return 'Good';
        if (percent >= 20) return 'Partial';
        if (percent > 0) return 'Low';
        return 'No Coverage';
    },

    toast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = this.el('div', { className: `toast ${type}`, innerHTML: `<span>${message}</span>` });
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    },

    arrowSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',

    backArrowSvg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px"><polyline points="15 18 9 12 15 6"/></svg>'
};
