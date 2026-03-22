/* ═══════════════════════════════════════════════════
   BLOCK CARDS — Card rendering with DNA fingerprints
   ═══════════════════════════════════════════════════ */

const BlockCards = {
    activeFilter: 'all',
    layout: 'grid',

    init() {
        this.renderFilterChips();
        this.renderBlocks(Data.blocks);
    },

    renderFilterChips() {
        const container = document.getElementById('filterChips');
        container.innerHTML = '';

        // "All" chip
        const allChip = Utils.el('button', {
            className: 'filter-chip active',
            dataset: { type: 'all' },
            textContent: `All (${Data.blocks.length})`,
            onClick: () => this.filter('all')
        });
        container.appendChild(allChip);

        // Category chips
        Data.categories.forEach(cat => {
            const chip = Utils.el('button', {
                className: 'filter-chip',
                dataset: { type: cat.type },
                onClick: () => this.filter(cat.type)
            }, [
                Utils.el('span', {
                    className: 'chip-dot',
                    style: { background: Utils.getCategoryColor(cat.type) }
                }),
                document.createTextNode(`${cat.label} (${cat.count})`)
            ]);
            container.appendChild(chip);
        });
    },

    filter(type) {
        this.activeFilter = type;

        // Update chip states
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.type === type);
        });

        const blocks = type === 'all' ? Data.blocks : Data.getBlocksByType(type);
        this.renderBlocks(blocks);
    },

    setLayout(layout) {
        this.layout = layout;
        const grid = document.getElementById('blocksGrid');
        grid.classList.toggle('list-layout', layout === 'list');

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === layout);
        });
    },

    renderBlocks(blocks) {
        const grid = document.getElementById('blocksGrid');
        grid.innerHTML = '';

        blocks.forEach((block, index) => {
            const card = this.createCard(block, index);
            grid.appendChild(card);
        });
    },

    createCard(block, index) {
        const dna = Utils.generateDNA(block);
        const color = Utils.getCategoryColor(block.type);

        const card = Utils.el('div', {
            className: 'block-card',
            dataset: { type: block.type, id: block.id },
            style: { animationDelay: `${index * 60}ms` },
            onClick: () => Wizard.openEdit(block)
        }, [
            // DNA strand
            this.createDNA(dna, color),
            // Status dot
            Utils.el('div', { className: `card-status ${block.status}` }),
            // Actions
            this.createActions(block),
            // Header
            this.createHeader(block),
            // Body
            Utils.el('div', { className: 'card-body' }, [
                Utils.el('p', { className: 'card-description', textContent: block.description })
            ]),
            // Fingerprint bars
            this.createFingerprint(block, color),
            // Footer
            this.createFooter(block)
        ]);

        return card;
    },

    createDNA(segments, color) {
        const dna = Utils.el('div', { className: 'card-dna' });

        segments.forEach(seg => {
            const segment = Utils.el('div', {
                className: 'dna-segment',
                style: {
                    background: color,
                    opacity: seg.opacity,
                    flex: Math.max(seg.width, 0.1)
                }
            });
            dna.appendChild(segment);
        });

        // Fill remaining
        const total = segments.reduce((s, seg) => s + Math.max(seg.width, 0.1), 0);
        if (total < 4) {
            dna.appendChild(Utils.el('div', {
                className: 'dna-segment',
                style: {
                    background: 'var(--border-subtle)',
                    flex: 4 - total
                }
            }));
        }

        return dna;
    },

    createActions(block) {
        return Utils.el('div', { className: 'card-actions' }, [
            Utils.el('button', {
                className: 'card-action-btn',
                title: 'Edit',
                innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
                onClick: (e) => { e.stopPropagation(); Wizard.openEdit(block); }
            }),
            Utils.el('button', {
                className: 'card-action-btn',
                title: 'Duplicate',
                innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
                onClick: (e) => { e.stopPropagation(); Utils.toast(`"${block.name}" duplicated`, 'success'); }
            }),
            Utils.el('button', {
                className: 'card-action-btn delete',
                title: 'Delete',
                innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
                onClick: (e) => { e.stopPropagation(); Utils.toast(`"${block.name}" deleted`, 'warning'); }
            })
        ]);
    },

    createHeader(block) {
        return Utils.el('div', { className: 'card-header' }, [
            Utils.el('div', {
                className: 'card-type-icon',
                textContent: block.icon
            }),
            Utils.el('div', { className: 'card-info' }, [
                Utils.el('h3', { className: 'card-name', textContent: block.name }),
                Utils.el('span', {
                    className: 'card-type-badge',
                    textContent: block.type.charAt(0).toUpperCase() + block.type.slice(1)
                })
            ])
        ]);
    },

    createFingerprint(block, color) {
        const container = Utils.el('div', { className: 'card-fingerprint' });

        const metrics = this.getBlockMetrics(block);
        metrics.forEach(metric => {
            const bar = Utils.el('div', {
                className: 'fp-bar',
                title: `${metric.label}: ${Math.round(metric.value * 100)}%`,
                style: { background: `${color}10` }
            }, [
                Utils.el('div', {
                    className: 'fp-bar-fill',
                    style: {
                        height: `${Math.max(metric.value * 100, 5)}%`,
                        background: `${color}${Math.round(metric.opacity * 255).toString(16).padStart(2, '0')}`
                    }
                })
            ]);
            container.appendChild(bar);
        });

        return container;
    },

    getBlockMetrics(block) {
        return [
            { label: 'Price', value: Math.min((block.base_price || 0) / 5000, 1), opacity: 0.8 },
            { label: 'Config', value: Math.min((block.config ? Object.keys(block.config).length : 0) / 8, 1), opacity: 0.6 },
            { label: 'Tax', value: Math.min((block.tax_rate || 0) / 28, 1), opacity: 0.5 },
            { label: 'Tags', value: Math.min((block.tags ? block.tags.length : 0) / 5, 1), opacity: 0.4 },
            { label: 'Evidence', value: this.getEvidenceScore(block), opacity: 0.7 }
        ];
    },

    getEvidenceScore(block) {
        if (!block.config) return 0;
        let score = 0;
        if (block.config.requirePhoto) score += 0.25;
        if (block.config.requireSignature) score += 0.25;
        if (block.config.requireGPS) score += 0.25;
        if (block.config.requireOTP) score += 0.25;
        return score;
    },

    createFooter(block) {
        const hasPrice = block.base_price > 0;

        return Utils.el('div', { className: 'card-footer' }, [
            hasPrice ?
                Utils.el('div', { className: 'card-price' }, [
                    Utils.el('span', {
                        className: 'price-amount',
                        textContent: Utils.formatCurrency(block.base_price, block.currency)
                    }),
                    Utils.el('span', {
                        className: 'price-unit',
                        textContent: Utils.getPriceTypeLabel(block.price_type)
                    }),
                    block.tax_rate > 0 ? Utils.el('span', {
                        className: 'price-tax',
                        textContent: `+${block.tax_rate}% GST`
                    }) : null
                ]) :
                Utils.el('div', { className: 'card-price' }, [
                    Utils.el('span', {
                        className: 'price-unit',
                        textContent: 'No pricing'
                    })
                ]),
            Utils.el('div', { className: 'card-meta' }, [
                Utils.el('span', {
                    className: 'meta-item',
                    textContent: block.pricing_mode === 'independent' ? 'Fixed' :
                        block.pricing_mode === 'resource_based' ? 'Resource' :
                        block.pricing_mode === 'variant_based' ? 'Variant' : 'Multi'
                })
            ])
        ]);
    },

    search(query) {
        if (!query) {
            this.filter(this.activeFilter);
            return;
        }
        const results = Data.searchBlocks(query);
        this.renderBlocks(results);
    }
};
