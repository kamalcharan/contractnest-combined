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

        if (view === 'coverage') {
            // Restore topbar
            const title = document.querySelector('.view-title');
            const subtitle = document.querySelector('.view-subtitle');
            if (title) title.textContent = 'Coverage Dashboard';
            if (subtitle) subtitle.textContent = 'Industry-wise template coverage analysis';

            // Restore topbar buttons
            const topRight = document.querySelector('.topbar-right');
            if (topRight) {
                topRight.innerHTML = '';
                topRight.appendChild(Utils.el('button', {
                    className: 'btn btn-secondary',
                    innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Refresh',
                    onClick: () => Utils.toast('Refreshing coverage data...', 'success')
                }));
            }

            Coverage.render();
        }
    },

    drillIntoIndustry(industryId) {
        this.currentView = 'resourceList';
        ResourceList.show(industryId);
    },

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
