/* ═══════════════════════════════════════════════════
   APP — Router, state, initialization
   ═══════════════════════════════════════════════════ */

const App = {
    currentView: 'coverage',
    theme: 'dark',

    init() {
        this.theme = document.documentElement.getAttribute('data-theme') || 'dark';
        Coverage.init();
        console.log('%c Global Designer Prototype loaded', 'color: #7C3AED; font-weight: bold; font-size: 14px;');
    },

    navigate(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        // For now only coverage view is built
        if (view === 'coverage') {
            Coverage.render();
        }
    },

    drillIntoIndustry(industryId) {
        const ind = Data.industries.find(i => i.id === industryId);
        Utils.toast(`Drill into "${ind.name}" \u2192 View 2 (Resource List) coming next`, 'warning');
    },

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
