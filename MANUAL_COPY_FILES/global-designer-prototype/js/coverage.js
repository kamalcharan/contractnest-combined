/* ═══════════════════════════════════════════════════
   COVERAGE — View 1: Industry Coverage Dashboard
   ═══════════════════════════════════════════════════ */

const Coverage = {
    viewMode: 'grid', // 'grid' or 'list'
    allCoverage: [],

    init() {
        this.allCoverage = Data.getAllCoverage();
        this.render();
    },

    render() {
        const container = document.getElementById('coverageView');
        container.innerHTML = '';

        // 1. Stats row
        container.appendChild(this.renderStats());

        // 2. Gap banner
        const stats = Data.getGlobalStats();
        if (stats.industriesWithGaps > 0) {
            container.appendChild(this.renderGapBanner(stats));
        }

        // 3. Section header with view toggle
        container.appendChild(this.renderSectionHeader());

        // 4. Industry grid or list
        if (this.viewMode === 'grid') {
            container.appendChild(this.renderGrid());
        } else {
            container.appendChild(this.renderList());
        }
    },

    // ═══════════ STATS ROW ═══════════
    renderStats() {
        const stats = Data.getGlobalStats();
        const row = Utils.el('div', { className: 'stats-row' });

        const cards = [
            { icon: '\uD83C\uDFE2', value: stats.totalIndustries, label: 'Industries', detail: `${stats.industriesWithResources} with resources`, dotColor: 'var(--accent)', type: 'accent', delay: 0 },
            { icon: '\uD83D\uDCE6', value: stats.totalResources, label: 'Resource Templates', detail: `Across ${stats.industriesWithResources} industries`, dotColor: 'var(--info)', type: 'info', delay: 60 },
            { icon: '\uD83D\uDCC4', value: stats.publishedTemplates, label: 'Published Templates', detail: `${stats.totalTemplates} total (${stats.totalTemplates - stats.publishedTemplates} drafts)`, dotColor: 'var(--success)', type: 'success', delay: 120 },
            { icon: '\u26A0\uFE0F', value: stats.totalGaps, label: 'Template Gaps', detail: `${stats.industriesWithGaps} industries fully uncovered`, dotColor: 'var(--danger)', type: 'danger', delay: 180 },
            { icon: '\uD83D\uDCCA', value: stats.avgCoverage + '%', label: 'Avg Coverage', detail: `${stats.totalSmartForms} SmartForms created`, dotColor: 'var(--warning)', type: 'warning', delay: 240 }
        ];

        cards.forEach(c => {
            const card = Utils.el('div', {
                className: `stat-card ${c.type}`,
                style: { animationDelay: `${c.delay}ms` }
            }, [
                Utils.el('div', { className: 'stat-icon', textContent: c.icon }),
                Utils.el('div', {
                    className: 'stat-value',
                    textContent: c.value,
                    style: { animationDelay: `${c.delay + 200}ms` }
                }),
                Utils.el('div', { className: 'stat-label', textContent: c.label }),
                Utils.el('div', { className: 'stat-detail' }, [
                    Utils.el('span', { className: 'dot', style: { background: c.dotColor } }),
                    document.createTextNode(c.detail)
                ])
            ]);
            row.appendChild(card);
        });

        return row;
    },

    // ═══════════ GAP BANNER ═══════════
    renderGapBanner(stats) {
        return Utils.el('div', { className: 'gap-banner' }, [
            Utils.el('div', { className: 'gap-banner-icon', textContent: '\uD83D\uDEA8' }),
            Utils.el('div', { className: 'gap-banner-text' }, [
                Utils.el('div', {
                    className: 'gap-banner-title',
                    textContent: `${stats.industriesWithGaps} industries have zero template coverage`
                }),
                Utils.el('div', {
                    className: 'gap-banner-desc',
                    textContent: `${stats.totalGaps} template gaps identified. Use AI Agent to generate templates for uncovered resources.`
                })
            ]),
            Utils.el('button', {
                className: 'btn btn-primary',
                textContent: 'Generate All Gaps',
                onClick: () => Utils.toast('Batch generation coming in Phase 2', 'warning')
            })
        ]);
    },

    // ═══════════ SECTION HEADER ═══════════
    renderSectionHeader() {
        const header = Utils.el('div', { className: 'section-header' });

        header.appendChild(Utils.el('div', {}, [
            Utils.el('div', { className: 'section-title', textContent: 'Industry Coverage' }),
            Utils.el('div', {
                className: 'section-subtitle',
                textContent: `${Data.industries.length} industries \u2022 ${Data.resourceTemplates.length} resource templates \u2022 ${Data.existingTemplates.length} templates built`
            })
        ]));

        const actions = Utils.el('div', { className: 'section-actions' });

        // View toggle
        const toggle = Utils.el('div', { className: 'view-toggle' });
        ['grid', 'list'].forEach(mode => {
            const btn = Utils.el('button', {
                className: `view-toggle-btn ${this.viewMode === mode ? 'active' : ''}`,
                textContent: mode === 'grid' ? 'Cards' : 'Table',
                onClick: () => {
                    this.viewMode = mode;
                    this.render();
                }
            });
            toggle.appendChild(btn);
        });
        actions.appendChild(toggle);

        header.appendChild(actions);
        return header;
    },

    // ═══════════ GRID VIEW ═══════════
    renderGrid() {
        const grid = Utils.el('div', { className: 'industry-grid' });

        // Sort: covered industries first, then by coverage %, then alphabetical
        const sorted = [...this.allCoverage].sort((a, b) => {
            if (b.coverage.coveragePercent !== a.coverage.coveragePercent)
                return b.coverage.coveragePercent - a.coverage.coveragePercent;
            return a.sort - b.sort;
        });

        sorted.forEach((ind, i) => {
            grid.appendChild(this.renderCard(ind, i));
        });

        return grid;
    },

    renderCard(ind, index) {
        const cov = ind.coverage;
        const covClass = Utils.covClass(cov.coveragePercent);

        const card = Utils.el('div', {
            className: `industry-card cov-${covClass}`,
            style: { animationDelay: `${index * 50}ms` },
            onClick: () => App.drillIntoIndustry(ind.id)
        });

        // Header
        const head = Utils.el('div', { className: 'card-head' }, [
            Utils.el('div', { className: 'card-head-left' }, [
                Utils.el('div', { className: 'card-industry-icon', textContent: ind.icon }),
                Utils.el('div', {}, [
                    Utils.el('div', { className: 'card-industry-name', textContent: ind.name }),
                    Utils.el('div', { className: 'card-industry-desc truncate', textContent: ind.description })
                ])
            ]),
            Utils.el('div', { className: 'card-arrow', innerHTML: Utils.arrowSvg })
        ]);
        card.appendChild(head);

        // Coverage bar
        const barContainer = Utils.el('div', { className: 'coverage-bar-container' });
        barContainer.appendChild(Utils.el('div', { className: 'coverage-bar-header' }, [
            Utils.el('span', {
                className: `coverage-percent ${covClass}`,
                textContent: `${cov.coveragePercent}%`
            }),
            Utils.el('span', { className: 'coverage-label', textContent: Utils.covLabel(cov.coveragePercent) })
        ]));
        barContainer.appendChild(Utils.el('div', { className: 'coverage-bar' }, [
            Utils.el('div', {
                className: `coverage-bar-fill ${covClass}`,
                style: { width: `${Math.max(cov.coveragePercent, 1)}%`, '--bar-width': `${cov.coveragePercent}%` }
            })
        ]));
        card.appendChild(barContainer);

        // Stats
        const statsGrid = Utils.el('div', { className: 'card-stats' });
        [
            { v: cov.categories, l: 'Categories' },
            { v: cov.resources, l: 'Resources' },
            { v: cov.publishedTemplates, l: 'Templates' },
            { v: cov.gaps, l: 'Gaps' }
        ].forEach(s => {
            statsGrid.appendChild(Utils.el('div', { className: 'card-stat' }, [
                Utils.el('div', {
                    className: 'card-stat-value',
                    textContent: s.v.toString(),
                    style: { color: s.l === 'Gaps' && s.v > 0 ? 'var(--danger)' : '' }
                }),
                Utils.el('div', { className: 'card-stat-label', textContent: s.l })
            ]));
        });
        card.appendChild(statsGrid);

        // Resource type dots
        if (cov.resources > 0) {
            const resources = Data.getIndustryResources(ind.id);
            const dots = Utils.el('div', { className: 'card-resource-dots' });
            resources.forEach(r => {
                const templates = Data.getResourceTemplates(r.id);
                const hasTemplate = templates.some(t => t.status === 'published');
                dots.appendChild(Utils.el('span', { className: 'resource-dot' }, [
                    Utils.el('span', { className: `dot ${hasTemplate ? 'has' : 'gap'}` }),
                    document.createTextNode(r.name.length > 20 ? r.name.slice(0, 18) + '..' : r.name)
                ]));
            });
            card.appendChild(dots);
        } else {
            const dots = Utils.el('div', { className: 'card-resource-dots' });
            dots.appendChild(Utils.el('span', {
                className: 'resource-dot',
                style: { color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' },
                textContent: 'No resources defined'
            }));
            card.appendChild(dots);
        }

        return card;
    },

    // ═══════════ LIST VIEW ═══════════
    renderList() {
        const list = Utils.el('div', { className: 'industry-list' });

        // Header row
        list.appendChild(Utils.el('div', { className: 'list-label-header' }, [
            Utils.el('span', {}),
            Utils.el('span', { textContent: 'Industry' }),
            Utils.el('span', { textContent: 'Coverage', style: { textAlign: 'center' } }),
            Utils.el('span', { textContent: 'Progress' }),
            Utils.el('span', { textContent: 'Categories', style: { textAlign: 'center' } }),
            Utils.el('span', { textContent: 'Resources', style: { textAlign: 'center' } }),
            Utils.el('span', { textContent: 'Tmpls', style: { textAlign: 'center' } }),
            Utils.el('span', { textContent: 'Gaps', style: { textAlign: 'center' } }),
            Utils.el('span', {})
        ]));

        const sorted = [...this.allCoverage].sort((a, b) => b.coverage.coveragePercent - a.coverage.coveragePercent);

        sorted.forEach((ind, i) => {
            const cov = ind.coverage;
            const covClass = Utils.covClass(cov.coveragePercent);

            const item = Utils.el('div', {
                className: 'industry-list-item',
                style: { animationDelay: `${i * 40}ms` },
                onClick: () => App.drillIntoIndustry(ind.id)
            }, [
                Utils.el('div', { className: 'list-icon', textContent: ind.icon }),
                Utils.el('div', {}, [
                    Utils.el('div', { className: 'list-name', textContent: ind.name }),
                    Utils.el('div', { className: 'list-desc truncate', textContent: ind.description })
                ]),
                Utils.el('div', {
                    className: `list-value coverage-percent ${covClass}`,
                    textContent: `${cov.coveragePercent}%`
                }),
                Utils.el('div', { className: 'list-bar' }, [
                    Utils.el('div', {
                        className: `list-bar-fill coverage-bar-fill ${covClass}`,
                        style: { width: `${Math.max(cov.coveragePercent, 2)}%`, '--bar-width': `${cov.coveragePercent}%` }
                    })
                ]),
                Utils.el('div', { className: 'list-value', textContent: cov.categories }),
                Utils.el('div', {
                    className: 'list-value',
                    textContent: cov.resources,
                    style: { color: cov.resources === 0 ? 'var(--danger)' : '' }
                }),
                Utils.el('div', { className: 'list-value', textContent: cov.publishedTemplates }),
                Utils.el('div', {
                    className: 'list-value',
                    textContent: cov.gaps,
                    style: { color: cov.gaps > 0 ? 'var(--danger)' : 'var(--success)' }
                }),
                Utils.el('div', { className: 'list-arrow', innerHTML: Utils.arrowSvg })
            ]);

            list.appendChild(item);
        });

        return list;
    }
};
