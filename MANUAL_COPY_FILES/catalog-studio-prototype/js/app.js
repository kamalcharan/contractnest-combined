/* ═══════════════════════════════════════════════════
   APP — Router, state manager, initialization
   ═══════════════════════════════════════════════════ */

const App = {
    currentView: 'constellation',
    theme: 'dark',

    init() {
        // Set initial theme
        this.theme = document.documentElement.getAttribute('data-theme') || 'dark';

        // Initialize all modules
        Constellation.init();
        BlockCards.init();
        Composer.init();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + K for search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            // Escape to close overlays
            if (e.key === 'Escape') {
                if (Wizard.isOpen) Wizard.close();
                else if (document.getElementById('previewOverlay').classList.contains('active')) Preview.close();
                else if (Constellation.expandedCluster !== null) {
                    document.querySelectorAll('.cluster').forEach(c => c.classList.remove('expanded'));
                    Constellation.expandedCluster = null;
                }
            }
            // N for new block
            if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !this.isInputFocused()) {
                Wizard.open();
            }
        });

        // Render templates view
        this.renderTemplatesView();

        console.log('%c Catalog Studio Prototype loaded', 'color: #7C3AED; font-weight: bold; font-size: 14px;');
    },

    // ═══════════ NAVIGATION ═══════════
    navigate(view) {
        if (this.currentView === view) return;

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Hide current view
        const currentViewEl = document.getElementById(`view-${this.currentView}`);
        if (currentViewEl) {
            currentViewEl.classList.remove('active');
        }

        // Show new view
        const newViewEl = document.getElementById(`view-${view}`);
        if (newViewEl) {
            // Small delay for transition
            requestAnimationFrame(() => {
                newViewEl.classList.add('active');
            });
        }

        // Update topbar
        this.updateTopbar(view);
        this.currentView = view;

        // Re-render if needed
        if (view === 'constellation') {
            Constellation.resize();
        }
    },

    updateTopbar(view) {
        const titles = {
            constellation: { title: 'Block Universe', subtitle: 'Your entire catalog at a glance' },
            blocks: { title: 'All Blocks', subtitle: `${Data.blocks.length} blocks in your catalog` },
            templates: { title: 'Templates', subtitle: `${Data.templates.length} contract templates` },
            composer: { title: 'Composer', subtitle: 'Build and preview contract templates' },
            resources: { title: 'Resources', subtitle: 'Team members, equipment, and consumables' },
            buyers: { title: 'Buyers', subtitle: 'Customer records and relationships' }
        };

        const info = titles[view] || { title: view, subtitle: '' };
        document.getElementById('viewTitle').textContent = info.title;
        document.getElementById('viewSubtitle').textContent = info.subtitle;
    },

    // ═══════════ SEARCH ═══════════
    onSearch: Utils.debounce(function(query) {
        if (App.currentView === 'blocks') {
            BlockCards.search(query);
        } else if (query) {
            // Switch to blocks view for search
            App.navigate('blocks');
            BlockCards.search(query);
        }
    }, 200),

    // ═══════════ THEME ═══════════
    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);

        // Reinitialize constellation for new theme colors
        if (this.currentView === 'constellation') {
            Constellation.resize();
        }
    },

    // ═══════════ TEMPLATES VIEW ═══════════
    renderTemplatesView() {
        const container = document.getElementById('templatesGrid');
        if (!container) return;
        container.innerHTML = '';
        container.style.cssText = 'padding: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;';

        Data.templates.forEach((template, index) => {
            const blocks = Data.getTemplateBlocks(template.id);
            const total = Data.getTemplateTotal(template.id);

            const card = Utils.el('div', {
                style: {
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                    animation: `cardEnter 400ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 80}ms backwards`
                },
                onMouseenter: (e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; },
                onMouseleave: (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; },
                onClick: () => {
                    Composer.loadTemplate(template);
                    App.navigate('composer');
                }
            });

            // Color bar from block types
            const colorBar = Utils.el('div', { style: { height: '4px', display: 'flex' } });
            const typeColors = [...new Set(blocks.map(b => b.type))];
            typeColors.forEach(type => {
                colorBar.appendChild(Utils.el('div', {
                    style: { flex: '1', background: Utils.getCategoryColor(type) }
                }));
            });
            card.appendChild(colorBar);

            // Content
            const content = Utils.el('div', { style: { padding: '20px' } });

            // Header
            content.appendChild(Utils.el('div', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }
            }, [
                Utils.el('h3', {
                    textContent: template.name,
                    style: { fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }
                }),
                Utils.el('span', {
                    textContent: template.status,
                    style: {
                        fontSize: '11px', fontWeight: '600',
                        padding: '2px 8px', borderRadius: '999px',
                        background: template.status === 'active' ? 'var(--success-soft)' : 'var(--warning-soft)',
                        color: template.status === 'active' ? 'var(--success)' : 'var(--warning)',
                        textTransform: 'uppercase'
                    }
                })
            ]));

            content.appendChild(Utils.el('p', {
                textContent: template.description,
                style: { fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px', lineHeight: '1.5' }
            }));

            // Block type pills
            const pills = Utils.el('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' } });
            const typeCounts = {};
            blocks.forEach(b => { typeCounts[b.type] = (typeCounts[b.type] || 0) + 1; });

            Object.entries(typeCounts).forEach(([type, count]) => {
                pills.appendChild(Utils.el('span', {
                    textContent: `${count} ${type}`,
                    style: {
                        fontSize: '10px', fontWeight: '500',
                        padding: '2px 6px', borderRadius: '4px',
                        background: Utils.getCategoryBg(type),
                        color: Utils.getCategoryColor(type)
                    }
                }));
            });
            content.appendChild(pills);

            // Footer
            content.appendChild(Utils.el('div', {
                style: {
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: '12px', borderTop: '1px solid var(--border-subtle)'
                }
            }, [
                Utils.el('span', {
                    textContent: `${blocks.length} blocks`,
                    style: { fontSize: '12px', color: 'var(--text-muted)' }
                }),
                Utils.el('span', {
                    textContent: total > 0 ? Utils.formatCurrencyFull(total, 'INR') : 'No pricing',
                    style: {
                        fontSize: '14px', fontWeight: '700',
                        color: total > 0 ? 'var(--accent)' : 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)'
                    }
                })
            ]));

            card.appendChild(content);
            container.appendChild(card);
        });
    },

    // ═══════════ HELPERS ═══════════
    isInputFocused() {
        const active = document.activeElement;
        return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    }
};

// ═══════════ BOOT ═══════════
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
