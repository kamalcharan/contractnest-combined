/* ═══════════════════════════════════════════════════
   RESOURCE LIST — View 2: Industry Drill-Down
   Shows resources, categories, and templates for
   a selected industry.
   ═══════════════════════════════════════════════════ */

const ResourceList = {
    industryId: null,
    industry: null,
    coverage: null,
    resources: [],
    categories: null,
    activeTab: 'resources', // 'resources' | 'categories'
    expandedCards: new Set(),

    show(industryId) {
        this.industryId = industryId;
        this.industry = Data.industries.find(i => i.id === industryId);
        this.coverage = Data.getIndustryCoverage(industryId);
        this.resources = Data.getIndustryResources(industryId);
        this.categories = Data.categories[industryId] || { count: 0, items: [] };
        this.expandedCards.clear();
        this.activeTab = 'resources';
        this.render();
    },

    render() {
        const container = document.getElementById('coverageView');
        container.innerHTML = '';
        container.className = 'coverage-view';

        // Update topbar
        const title = document.querySelector('.view-title');
        const subtitle = document.querySelector('.view-subtitle');
        if (title) title.textContent = this.industry.name;
        if (subtitle) subtitle.textContent = 'Resource templates & category breakdown';

        // Update topbar right buttons
        const topRight = document.querySelector('.topbar-right');
        if (topRight) {
            topRight.innerHTML = '';
            topRight.appendChild(Utils.el('button', {
                className: 'btn btn-secondary',
                innerHTML: Utils.backArrowSvg + ' Back to Coverage',
                onClick: () => App.navigate('coverage')
            }));
        }

        // 1. Breadcrumb
        container.appendChild(this.renderBreadcrumb());

        // 2. Industry header card
        container.appendChild(this.renderHeader());

        // 3. Tabs
        container.appendChild(this.renderTabs());

        // 4. Tab content
        if (this.activeTab === 'resources') {
            container.appendChild(this.renderResources());
        } else {
            container.appendChild(this.renderCategories());
        }
    },

    // ═══════════ BREADCRUMB ═══════════
    renderBreadcrumb() {
        return Utils.el('div', { className: 'breadcrumb' }, [
            Utils.el('span', {
                className: 'breadcrumb-link',
                textContent: 'Coverage Dashboard',
                onClick: () => App.navigate('coverage')
            }),
            Utils.el('span', { className: 'breadcrumb-sep', textContent: '/' }),
            Utils.el('span', {
                className: 'breadcrumb-current',
                textContent: this.industry.name
            })
        ]);
    },

    // ═══════════ HEADER ═══════════
    renderHeader() {
        const cov = this.coverage;
        const covClass = Utils.covClass(cov.coveragePercent);

        return Utils.el('div', { className: 'industry-header-card' }, [
            Utils.el('div', { className: 'industry-header-icon', textContent: this.industry.icon }),
            Utils.el('div', { className: 'industry-header-info' }, [
                Utils.el('div', { className: 'industry-header-name', textContent: this.industry.name }),
                Utils.el('div', { className: 'industry-header-desc', textContent: this.industry.description }),
                Utils.el('div', { className: 'industry-header-tags' },
                    (this.industry.compliance || []).map(c =>
                        Utils.el('span', { className: 'industry-tag', textContent: c })
                    )
                )
            ]),
            Utils.el('div', { className: 'industry-header-stats' }, [
                Utils.el('div', { className: 'industry-header-stat' }, [
                    Utils.el('div', {
                        className: `industry-header-stat-value coverage-percent ${covClass}`,
                        textContent: `${cov.coveragePercent}%`
                    }),
                    Utils.el('div', { className: 'industry-header-stat-label', textContent: 'Coverage' })
                ]),
                Utils.el('div', { className: 'industry-header-stat' }, [
                    Utils.el('div', { className: 'industry-header-stat-value', textContent: cov.categories }),
                    Utils.el('div', { className: 'industry-header-stat-label', textContent: 'Categories' })
                ]),
                Utils.el('div', { className: 'industry-header-stat' }, [
                    Utils.el('div', { className: 'industry-header-stat-value', textContent: cov.resources }),
                    Utils.el('div', { className: 'industry-header-stat-label', textContent: 'Resources' })
                ]),
                Utils.el('div', { className: 'industry-header-stat' }, [
                    Utils.el('div', {
                        className: 'industry-header-stat-value',
                        textContent: cov.publishedTemplates,
                        style: { color: 'var(--success)' }
                    }),
                    Utils.el('div', { className: 'industry-header-stat-label', textContent: 'Templates' })
                ]),
                Utils.el('div', { className: 'industry-header-stat' }, [
                    Utils.el('div', {
                        className: 'industry-header-stat-value',
                        textContent: cov.gaps,
                        style: { color: cov.gaps > 0 ? 'var(--danger)' : 'var(--success)' }
                    }),
                    Utils.el('div', { className: 'industry-header-stat-label', textContent: 'Gaps' })
                ])
            ])
        ]);
    },

    // ═══════════ TABS ═══════════
    renderTabs() {
        const tabs = Utils.el('div', { className: 'rl-tabs' });

        [
            { id: 'resources', label: 'Resources', count: this.resources.length },
            { id: 'categories', label: 'Categories', count: this.categories.count }
        ].forEach(tab => {
            tabs.appendChild(Utils.el('button', {
                className: `rl-tab ${this.activeTab === tab.id ? 'active' : ''}`,
                onClick: () => {
                    this.activeTab = tab.id;
                    this.render();
                }
            }, [
                document.createTextNode(tab.label),
                Utils.el('span', { className: 'rl-tab-count', textContent: tab.count.toString() })
            ]));
        });

        return tabs;
    },

    // ═══════════ RESOURCES TAB ═══════════
    renderResources() {
        if (this.resources.length === 0) {
            return this.renderEmptyResources();
        }

        const wrapper = Utils.el('div', { className: 'resource-card-list' });

        this.resources.forEach((res, i) => {
            wrapper.appendChild(this.renderResourceCard(res, i));
        });

        return wrapper;
    },

    renderResourceCard(res, index) {
        const templates = Data.getResourceTemplates(res.id);
        const published = templates.filter(t => t.status === 'published');
        const isExpanded = this.expandedCards.has(res.id);
        const resType = Data.resourceTypes.find(rt => rt.id === res.resource_type_id);
        const typeIcons = { team_staff: '\uD83D\uDC65', equipment: '\uD83D\uDD27', consumable: '\uD83D\uDCE6', asset: '\uD83C\uDFE2', partner: '\uD83E\uDD1D' };

        const card = Utils.el('div', {
            className: `resource-card ${isExpanded ? 'expanded' : ''}`,
            style: { animationDelay: `${index * 60}ms` }
        });

        // Main row
        const main = Utils.el('div', {
            className: 'resource-card-main',
            onClick: () => {
                if (isExpanded) this.expandedCards.delete(res.id);
                else this.expandedCards.add(res.id);
                this.render();
            }
        }, [
            Utils.el('div', {
                className: `rc-type-icon ${res.resource_type_id}`,
                textContent: typeIcons[res.resource_type_id] || '\uD83D\uDCBC'
            }),
            Utils.el('div', { className: 'rc-info' }, [
                Utils.el('div', { className: 'rc-name', textContent: res.name }),
                Utils.el('div', { className: 'rc-desc', textContent: res.description }),
                Utils.el('div', { className: 'rc-meta' }, [
                    Utils.el('span', { className: 'rc-meta-item' }, [
                        Utils.el('span', {
                            className: 'rc-meta-dot',
                            style: { background: published.length > 0 ? 'var(--success)' : 'var(--danger)' }
                        }),
                        document.createTextNode(`${published.length} published`)
                    ]),
                    Utils.el('span', { className: 'rc-meta-item' }, [
                        Utils.el('span', {
                            className: 'rc-meta-dot',
                            style: { background: 'var(--info)' }
                        }),
                        document.createTextNode(resType ? resType.name : res.resource_type_id)
                    ])
                ])
            ]),
            Utils.el('div', { className: 'rc-right' }, [
                Utils.el('div', { className: 'rc-pricing' }, [
                    Utils.el('div', {
                        className: 'rc-pricing-range',
                        textContent: `$${res.pricing.min}\u2013${res.pricing.max}/hr`
                    }),
                    Utils.el('div', { className: 'rc-pricing-label', textContent: `Suggested: $${res.pricing.suggested}` })
                ]),
                Utils.el('div', {
                    className: `rc-templates-badge ${templates.length > 0 ? 'has-templates' : 'no-templates'}`,
                    textContent: templates.length > 0 ? `${templates.length} templates` : 'No templates'
                }),
                Utils.el('div', { className: 'rc-expand-arrow', innerHTML: Utils.arrowSvg })
            ])
        ]);
        card.appendChild(main);

        // Expanded panel
        if (isExpanded) {
            card.appendChild(this.renderTemplatePanel(res, templates));
        }

        return card;
    },

    renderTemplatePanel(res, templates) {
        const panel = Utils.el('div', { className: 'rc-template-panel' });

        if (templates.length === 0) {
            panel.appendChild(Utils.el('div', { className: 'rc-no-templates' }, [
                Utils.el('div', { className: 'rc-no-templates-icon', textContent: '\u2717' }),
                Utils.el('div', {}, [
                    Utils.el('div', {
                        textContent: 'No global templates for this resource',
                        style: { fontWeight: 'var(--weight-semibold)', marginBottom: '2px' }
                    }),
                    Utils.el('div', {
                        textContent: `Consider creating AMC, CMC, or Breakdown templates for "${res.name}"`,
                        style: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }
                    })
                ])
            ]));
            return panel;
        }

        // Header
        panel.appendChild(Utils.el('div', { className: 'rc-template-panel-header' }, [
            Utils.el('span', {
                className: 'rc-template-panel-title',
                textContent: `${templates.length} template${templates.length > 1 ? 's' : ''} for "${res.name}"`
            })
        ]));

        // Column headers
        panel.appendChild(Utils.el('div', {
            className: 'rc-template-row',
            style: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'var(--weight-semibold)' }
        }, [
            Utils.el('span', { textContent: 'Template Name' }),
            Utils.el('span', { textContent: 'Type', style: { textAlign: 'center' } }),
            Utils.el('span', { textContent: 'Blocks', style: { textAlign: 'center' } }),
            Utils.el('span', { textContent: 'Status', style: { textAlign: 'center' } }),
            Utils.el('span', { textContent: 'Used', style: { textAlign: 'center' } })
        ]));

        // Rows
        templates.forEach(tpl => {
            panel.appendChild(Utils.el('div', { className: 'rc-template-row' }, [
                Utils.el('span', { className: 'rc-tpl-name', textContent: tpl.name }),
                Utils.el('span', { className: 'rc-tpl-nomenclature', textContent: tpl.nomenclature }),
                Utils.el('span', { className: 'rc-tpl-blocks', textContent: `${tpl.blocks} blocks` }),
                Utils.el('span', { className: `rc-tpl-status ${tpl.status}`, textContent: tpl.status }),
                Utils.el('span', { className: 'rc-tpl-used', textContent: `${tpl.timesUsed}x` })
            ]));
        });

        return panel;
    },

    // ═══════════ CATEGORIES TAB ═══════════
    renderCategories() {
        const items = this.categories.items || [];

        if (items.length === 0) {
            return Utils.el('div', { className: 'rl-empty' }, [
                Utils.el('div', { className: 'rl-empty-icon', textContent: '\uD83D\uDCC2' }),
                Utils.el('div', { className: 'rl-empty-title', textContent: 'No category data loaded' }),
                Utils.el('div', { className: 'rl-empty-desc', textContent: 'Category details are available in the full m_catalog_categories file.' })
            ]);
        }

        const wrapper = Utils.el('div', {});

        // Show how many of total we're displaying
        if (items.length < this.categories.count) {
            wrapper.appendChild(Utils.el('div', {
                style: {
                    fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
                    marginBottom: 'var(--space-3)',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--info-soft)',
                    borderRadius: 'var(--radius-md)',
                    display: 'inline-block'
                },
                textContent: `Showing ${items.length} of ${this.categories.count} categories (sample data)`
            }));
        }

        const grid = Utils.el('div', { className: 'category-grid' });

        items.forEach((cat, i) => {
            const card = Utils.el('div', {
                className: 'category-card',
                style: { animationDelay: `${i * 40}ms` }
            }, [
                Utils.el('div', { className: 'cat-name', textContent: cat.name }),
                Utils.el('div', { className: 'cat-id', textContent: cat.id }),
                Utils.el('div', { className: 'cat-variants' },
                    (cat.variants || []).map(v =>
                        Utils.el('span', { className: 'cat-variant', textContent: v })
                    )
                )
            ]);
            grid.appendChild(card);
        });

        wrapper.appendChild(grid);
        return wrapper;
    },

    // ═══════════ EMPTY STATE ═══════════
    renderEmptyResources() {
        return Utils.el('div', { className: 'rl-empty' }, [
            Utils.el('div', { className: 'rl-empty-icon', textContent: '\uD83D\uDD27' }),
            Utils.el('div', { className: 'rl-empty-title', textContent: 'No Resource Templates Defined' }),
            Utils.el('div', { className: 'rl-empty-desc', textContent: `"${this.industry.name}" doesn't have any resource templates in the catalog yet. Resource templates define the staff, equipment, and consumables used in service delivery.` }),
            Utils.el('button', {
                className: 'btn btn-primary',
                textContent: 'Back to Coverage',
                onClick: () => App.navigate('coverage')
            })
        ]);
    }
};
