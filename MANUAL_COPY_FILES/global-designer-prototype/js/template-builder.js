/* ═══════════════════════════════════════════════════
   TEMPLATE BUILDER — View 3: Block Editor
   Build/edit a global template for a resource.
   ═══════════════════════════════════════════════════ */

const TemplateBuilder = {
    resource: null,
    industry: null,
    template: null,       // existing template or null (new)
    nomenclature: 'AMC',
    status: 'draft',
    blocks: [],           // working copy of blocks
    activeBlockIndex: -1,
    showAddDropdown: false,
    isNew: false,

    // ── Entry point ──
    show(resourceId, templateId) {
        this.resource = Data.resourceTemplates.find(r => r.id === resourceId);
        this.industry = Data.industries.find(i => i.id === this.resource.industry_id);

        if (templateId) {
            this.template = Data.existingTemplates.find(t => t.id === templateId);
            this.nomenclature = this.template.nomenclature;
            this.status = this.template.status;
            this.isNew = false;
            // Load blocks
            const saved = Data.getTemplateBlocks(templateId);
            this.blocks = saved.length > 0 ? saved : this.generateDefaultBlocks();
        } else {
            this.template = null;
            this.nomenclature = 'AMC';
            this.status = 'draft';
            this.isNew = true;
            this.blocks = this.generateDefaultBlocks();
        }

        this.activeBlockIndex = -1;
        this.showAddDropdown = false;
        this.render();
    },

    generateDefaultBlocks() {
        // Start with required blocks + SLA
        return Data.blockTypes
            .filter(bt => bt.required || bt.id === 'sla')
            .map((bt, i) => ({
                blockType: bt.id,
                order: i + 1,
                type: bt,
                fields: Object.fromEntries(bt.defaultFields.map(f => [f, '']))
            }));
    },

    render() {
        const container = document.getElementById('coverageView');
        container.innerHTML = '';
        container.className = ''; // remove padding — layout handles it

        // Update topbar
        const title = document.querySelector('.view-title');
        const subtitle = document.querySelector('.view-subtitle');
        if (title) title.textContent = 'Template Builder';
        if (subtitle) subtitle.textContent = `${this.resource.name} \u2014 ${this.industry.name}`;

        const topRight = document.querySelector('.topbar-right');
        if (topRight) {
            topRight.innerHTML = '';
            topRight.appendChild(Utils.el('button', {
                className: 'btn btn-secondary',
                innerHTML: Utils.backArrowSvg + ' Back',
                onClick: () => App.drillIntoIndustry(this.industry.id)
            }));
            topRight.appendChild(Utils.el('button', {
                className: 'btn btn-primary',
                textContent: 'Save Template',
                onClick: () => this.handleSave()
            }));
        }

        // Two-column layout
        const layout = Utils.el('div', { className: 'tb-layout' });
        layout.appendChild(this.renderMain());
        layout.appendChild(this.renderSidebar());
        container.appendChild(layout);
    },

    // ═══════════ MAIN PANEL ═══════════
    renderMain() {
        const main = Utils.el('div', { className: 'tb-main' });

        // Breadcrumb
        main.appendChild(Utils.el('div', { className: 'breadcrumb' }, [
            Utils.el('span', { className: 'breadcrumb-link', textContent: 'Coverage', onClick: () => App.navigate('coverage') }),
            Utils.el('span', { className: 'breadcrumb-sep', textContent: '/' }),
            Utils.el('span', { className: 'breadcrumb-link', textContent: this.industry.name, onClick: () => App.drillIntoIndustry(this.industry.id) }),
            Utils.el('span', { className: 'breadcrumb-sep', textContent: '/' }),
            Utils.el('span', { className: 'breadcrumb-current', textContent: this.isNew ? 'New Template' : this.template.name })
        ]));

        // Template header
        main.appendChild(this.renderHeader());

        // Block canvas
        main.appendChild(Utils.el('div', { className: 'tb-section-label' }, [
            Utils.el('span', { textContent: `BLOCKS (${this.blocks.length})` }),
            Utils.el('span', {
                style: { fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'var(--weight-regular)', textTransform: 'none', letterSpacing: '0' },
                textContent: 'Click to expand \u2022 Drag to reorder'
            })
        ]));

        const canvas = Utils.el('div', { className: 'block-canvas' });
        this.blocks.forEach((block, i) => {
            canvas.appendChild(this.renderBlockCard(block, i));
        });

        // Add block button / dropdown
        if (this.showAddDropdown) {
            canvas.appendChild(this.renderAddDropdown());
        } else {
            canvas.appendChild(Utils.el('button', {
                className: 'add-block-btn',
                textContent: '+ Add Block',
                onClick: () => { this.showAddDropdown = true; this.render(); }
            }));
        }

        main.appendChild(canvas);
        return main;
    },

    // ── Template Header ──
    renderHeader() {
        const typeIcons = { team_staff: '\uD83D\uDC65', equipment: '\uD83D\uDD27', consumable: '\uD83D\uDCE6', asset: '\uD83C\uDFE2', partner: '\uD83E\uDD1D' };

        return Utils.el('div', { className: 'tb-header' }, [
            Utils.el('div', {
                className: `tb-header-icon ${this.resource.resource_type_id}`,
                textContent: typeIcons[this.resource.resource_type_id] || '\uD83D\uDCBC'
            }),
            Utils.el('div', { className: 'tb-header-info' }, [
                Utils.el('div', { className: 'tb-header-name', textContent: this.resource.name }),
                Utils.el('div', { className: 'tb-header-meta' }, [
                    Utils.el('span', { textContent: this.industry.name }),
                    Utils.el('span', { className: 'tb-header-meta-sep', textContent: '\u2022' }),
                    Utils.el('span', { textContent: Data.resourceTypes.find(rt => rt.id === this.resource.resource_type_id)?.name || '' }),
                    Utils.el('span', { className: 'tb-header-meta-sep', textContent: '\u2022' }),
                    Utils.el('span', { textContent: `$${this.resource.pricing.min}\u2013${this.resource.pricing.max}/hr` })
                ])
            ]),
            Utils.el('div', { className: 'tb-header-actions' }, [
                this.renderNomenclaturePicker(),
                this.renderStatusBadge()
            ])
        ]);
    },

    renderNomenclaturePicker() {
        const picker = Utils.el('div', { className: 'nomenclature-picker' });
        ['AMC', 'CMC', 'FMC', 'BREAKDOWN'].forEach(code => {
            picker.appendChild(Utils.el('button', {
                className: `nomenclature-btn ${this.nomenclature === code ? 'active' : ''}`,
                textContent: code,
                onClick: () => {
                    this.nomenclature = code;
                    this.render();
                }
            }));
        });
        return picker;
    },

    renderStatusBadge() {
        return Utils.el('button', {
            className: `tb-status-badge ${this.status}`,
            onClick: () => {
                this.status = this.status === 'draft' ? 'published' : 'draft';
                this.render();
            }
        }, [
            Utils.el('span', { className: 'status-dot' }),
            document.createTextNode(this.status === 'draft' ? 'Draft' : 'Published')
        ]);
    },

    // ── Block Card ──
    renderBlockCard(block, index) {
        const bt = block.type || Data.blockTypes.find(t => t.id === block.blockType);
        const isActive = this.activeBlockIndex === index;
        const fieldCount = Object.keys(block.fields || {}).length;
        const filledCount = Object.values(block.fields || {}).filter(v => v && v.trim()).length;

        const card = Utils.el('div', {
            className: `block-card ${isActive ? 'active' : ''} ${bt.required ? 'required' : ''}`,
            style: { animationDelay: `${index * 40}ms` },
            draggable: 'true',
            dataset: { index: index.toString() },
            onDragstart: (e) => this.handleDragStart(e, index),
            onDragover: (e) => this.handleDragOver(e),
            onDrop: (e) => this.handleDrop(e, index),
            onDragend: () => this.handleDragEnd()
        });

        // Header
        card.appendChild(Utils.el('div', {
            className: 'block-card-header',
            onClick: () => {
                this.activeBlockIndex = isActive ? -1 : index;
                this.render();
            }
        }, [
            Utils.el('div', { className: 'block-drag-handle', textContent: '\u2261' }),
            Utils.el('div', { className: 'block-icon', textContent: bt.icon }),
            Utils.el('div', {}, [
                Utils.el('div', { className: 'block-name', textContent: bt.name }),
                Utils.el('div', { className: 'block-desc', textContent: bt.description })
            ]),
            Utils.el('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' } }, [
                Utils.el('span', {
                    className: 'block-field-count',
                    textContent: `${filledCount}/${fieldCount} fields`
                }),
                bt.required ? Utils.el('span', { className: 'block-required-badge', textContent: 'REQ' }) : Utils.el('span')
            ]),
            Utils.el('span', { className: 'block-expand-icon', innerHTML: Utils.arrowSvg })
        ]));

        // Body (expanded)
        if (isActive) {
            card.appendChild(this.renderBlockBody(block, index, bt));
        }

        return card;
    },

    renderBlockBody(block, index, bt) {
        const body = Utils.el('div', { className: 'block-body' });
        const grid = Utils.el('div', { className: 'block-fields-grid' });

        const fields = bt.defaultFields || [];
        fields.forEach(fieldKey => {
            const value = (block.fields || {})[fieldKey] || '';
            const isVar = value.startsWith('{{') && value.endsWith('}}');
            const isLong = fieldKey.includes('description') || fieldKey.includes('clause') || fieldKey.includes('inclusions') || fieldKey.includes('exclusions');

            const field = Utils.el('div', { className: `block-field ${isLong ? 'full-width' : ''}` });

            const label = Utils.el('div', { className: 'block-field-label' }, [
                document.createTextNode(this.formatFieldName(fieldKey)),
                isVar ? Utils.el('span', { className: 'var-icon', textContent: '{ }' }) : Utils.el('span')
            ]);
            field.appendChild(label);

            if (isLong) {
                const textarea = Utils.el('textarea', {
                    className: `block-field-value ${isVar ? 'is-variable' : ''}`,
                    value: value,
                    rows: '3',
                    style: { resize: 'vertical', width: '100%' },
                    onInput: (e) => { this.blocks[index].fields[fieldKey] = e.target.value; }
                });
                textarea.value = value;
                field.appendChild(textarea);
            } else {
                const input = Utils.el('input', {
                    className: `block-field-value ${isVar ? 'is-variable' : ''}`,
                    type: 'text',
                    value: value,
                    onInput: (e) => { this.blocks[index].fields[fieldKey] = e.target.value; }
                });
                field.appendChild(input);
            }

            grid.appendChild(field);
        });

        body.appendChild(grid);

        // Actions
        body.appendChild(Utils.el('div', { className: 'block-actions' }, [
            !bt.required ? Utils.el('button', {
                className: 'btn btn-ghost',
                textContent: 'Remove Block',
                style: { color: 'var(--danger)', fontSize: 'var(--text-xs)' },
                onClick: () => {
                    this.blocks.splice(index, 1);
                    this.activeBlockIndex = -1;
                    this.render();
                }
            }) : Utils.el('span'),
            Utils.el('button', {
                className: 'btn btn-secondary',
                textContent: 'Collapse',
                style: { fontSize: 'var(--text-xs)' },
                onClick: () => { this.activeBlockIndex = -1; this.render(); }
            })
        ]));

        return body;
    },

    // ── Add Block Dropdown ──
    renderAddDropdown() {
        const existing = new Set(this.blocks.map(b => b.blockType));
        const dropdown = Utils.el('div', { className: 'add-block-dropdown' });

        Data.blockTypes.forEach(bt => {
            // Allow custom and non-existing blocks
            const alreadyAdded = bt.id !== 'custom' && existing.has(bt.id);

            dropdown.appendChild(Utils.el('button', {
                className: `add-block-option ${alreadyAdded ? 'disabled' : ''}`,
                onClick: () => {
                    if (!alreadyAdded) this.addBlock(bt);
                }
            }, [
                Utils.el('div', { className: 'add-block-option-icon', textContent: bt.icon }),
                Utils.el('div', {}, [
                    Utils.el('div', { className: 'add-block-option-name', textContent: bt.name }),
                    Utils.el('div', {
                        className: 'add-block-option-desc',
                        textContent: alreadyAdded ? 'Already added' : bt.description
                    })
                ])
            ]));
        });

        // Close button
        dropdown.appendChild(Utils.el('button', {
            className: 'add-block-option',
            style: { justifyContent: 'center', color: 'var(--text-muted)' },
            textContent: 'Cancel',
            onClick: () => { this.showAddDropdown = false; this.render(); }
        }));

        return dropdown;
    },

    addBlock(blockType) {
        this.blocks.push({
            blockType: blockType.id,
            order: this.blocks.length + 1,
            type: blockType,
            fields: Object.fromEntries(blockType.defaultFields.map(f => [f, '']))
        });
        this.showAddDropdown = false;
        this.activeBlockIndex = this.blocks.length - 1;
        this.render();
    },

    // ═══════════ RIGHT SIDEBAR ═══════════
    renderSidebar() {
        const sidebar = Utils.el('div', { className: 'tb-sidebar' });

        // Preview minimap
        sidebar.appendChild(this.renderPreviewSection());

        // SmartForm variables
        sidebar.appendChild(this.renderSmartFormSection());

        // Template stats
        sidebar.appendChild(this.renderStatsSection());

        return sidebar;
    },

    renderPreviewSection() {
        const section = Utils.el('div', { className: 'tb-sidebar-section' });
        section.appendChild(Utils.el('div', { className: 'tb-sidebar-title', textContent: 'TEMPLATE STRUCTURE' }));

        const map = Utils.el('div', { className: 'preview-minimap' });
        this.blocks.forEach((block, i) => {
            const bt = block.type || Data.blockTypes.find(t => t.id === block.blockType);
            if (i > 0) {
                map.appendChild(Utils.el('div', { className: 'preview-block-line' }));
            }
            map.appendChild(Utils.el('div', {
                className: `preview-block ${this.activeBlockIndex === i ? 'active' : ''}`,
                onClick: () => { this.activeBlockIndex = i; this.render(); }
            }, [
                Utils.el('span', { className: `preview-block-dot ${bt.required ? 'required' : 'optional'}` }),
                document.createTextNode(`${i + 1}. ${bt.name}`)
            ]));
        });
        section.appendChild(map);
        return section;
    },

    renderSmartFormSection() {
        const section = Utils.el('div', { className: 'tb-sidebar-section' });
        section.appendChild(Utils.el('div', { className: 'tb-sidebar-title', textContent: 'SMARTFORM VARIABLES' }));

        // Detect variables used in blocks
        const vars = new Set();
        this.blocks.forEach(b => {
            Object.values(b.fields || {}).forEach(v => {
                const matches = (v || '').match(/\{\{[^}]+\}\}/g);
                if (matches) matches.forEach(m => vars.add(m));
            });
        });

        // Common available variables
        const available = [
            '{{resource.name}}', '{{resource.pricing.suggested}}',
            '{{contract.start_date}}', '{{contract.end_date}}',
            '{{contract.quantity}}', '{{client.name}}',
            '{{client.address}}', '{{provider.name}}'
        ];

        if (vars.size > 0) {
            section.appendChild(Utils.el('div', {
                style: { fontSize: '10px', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' },
                textContent: `${vars.size} variables in use`
            }));
            vars.forEach(v => {
                section.appendChild(Utils.el('div', { className: 'smartform-var' }, [
                    Utils.el('span', { className: 'smartform-var-icon', textContent: '{ }' }),
                    document.createTextNode(v)
                ]));
            });
        }

        section.appendChild(Utils.el('div', {
            style: { fontSize: '10px', color: 'var(--text-muted)', marginTop: 'var(--space-3)', marginBottom: 'var(--space-2)' },
            textContent: 'Available variables (click to copy)'
        }));

        available.forEach(v => {
            if (!vars.has(v)) {
                section.appendChild(Utils.el('div', {
                    className: 'smartform-var',
                    style: { opacity: '0.6' },
                    onClick: () => {
                        navigator.clipboard?.writeText(v);
                        Utils.toast(`Copied ${v}`, 'success');
                    }
                }, [
                    Utils.el('span', { className: 'smartform-var-icon', textContent: '{ }' }),
                    document.createTextNode(v)
                ]));
            }
        });

        return section;
    },

    renderStatsSection() {
        const section = Utils.el('div', { className: 'tb-sidebar-section' });
        section.appendChild(Utils.el('div', { className: 'tb-sidebar-title', textContent: 'TEMPLATE STATS' }));

        const totalFields = this.blocks.reduce((s, b) => s + Object.keys(b.fields || {}).length, 0);
        const filledFields = this.blocks.reduce((s, b) => s + Object.values(b.fields || {}).filter(v => v && v.trim()).length, 0);
        const varsUsed = new Set();
        this.blocks.forEach(b => Object.values(b.fields || {}).forEach(v => {
            const matches = (v || '').match(/\{\{[^}]+\}\}/g);
            if (matches) matches.forEach(m => varsUsed.add(m));
        }));

        const stats = [
            { l: 'Blocks', v: this.blocks.length.toString() },
            { l: 'Fields', v: `${filledFields}/${totalFields}` },
            { l: 'Variables', v: varsUsed.size.toString() },
            { l: 'Nomenclature', v: this.nomenclature },
            { l: 'Status', v: this.status },
            { l: 'Resource Type', v: Data.resourceTypes.find(rt => rt.id === this.resource.resource_type_id)?.name || '' }
        ];

        if (!this.isNew && this.template) {
            stats.push({ l: 'Times Used', v: this.template.timesUsed.toString() });
        }

        stats.forEach(s => {
            section.appendChild(Utils.el('div', { className: 'tb-stat-row' }, [
                Utils.el('span', { className: 'tb-stat-label', textContent: s.l }),
                Utils.el('span', { className: 'tb-stat-value', textContent: s.v })
            ]));
        });

        return section;
    },

    // ═══════════ DRAG & DROP ═══════════
    dragIndex: null,

    handleDragStart(e, index) {
        this.dragIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    handleDrop(e, dropIndex) {
        e.preventDefault();
        if (this.dragIndex === null || this.dragIndex === dropIndex) return;
        const [moved] = this.blocks.splice(this.dragIndex, 1);
        this.blocks.splice(dropIndex, 0, moved);
        // Update order
        this.blocks.forEach((b, i) => b.order = i + 1);
        this.dragIndex = null;
        if (this.activeBlockIndex === this.dragIndex) {
            this.activeBlockIndex = dropIndex;
        } else {
            this.activeBlockIndex = -1;
        }
        this.render();
    },

    handleDragEnd() {
        this.dragIndex = null;
        document.querySelectorAll('.block-card.dragging').forEach(el => el.classList.remove('dragging'));
    },

    // ═══════════ ACTIONS ═══════════
    handleSave() {
        const filledFields = this.blocks.reduce((s, b) => s + Object.values(b.fields || {}).filter(v => v && v.trim()).length, 0);
        const totalFields = this.blocks.reduce((s, b) => s + Object.keys(b.fields || {}).length, 0);

        if (filledFields < totalFields * 0.3) {
            Utils.toast(`Only ${filledFields}/${totalFields} fields filled. Add more content before saving.`, 'warning');
            return;
        }

        Utils.toast(`Template "${this.resource.name} ${this.nomenclature}" saved as ${this.status}`, 'success');
    },

    // ═══════════ HELPERS ═══════════
    formatFieldName(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
};
