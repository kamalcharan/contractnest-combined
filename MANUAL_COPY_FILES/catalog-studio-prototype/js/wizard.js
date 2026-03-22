/* ═══════════════════════════════════════════════════
   WIZARD — Multi-step creation flow
   ═══════════════════════════════════════════════════ */

const Wizard = {
    isOpen: false,
    currentStep: 0,
    totalSteps: 4,
    selectedType: null,
    formData: {},
    editingBlock: null,

    open() {
        this.isOpen = true;
        this.currentStep = 0;
        this.selectedType = null;
        this.formData = {};
        this.editingBlock = null;

        document.getElementById('wizardTitle').textContent = 'Create New Block';
        document.getElementById('wizardOverlay').classList.add('active');
        document.getElementById('wizardOverlay').classList.remove('closing');
        document.body.style.overflow = 'hidden';

        this.renderStep();
        this.updateControls();
    },

    openEdit(block) {
        this.isOpen = true;
        this.currentStep = 1; // Skip type selection
        this.selectedType = block.type;
        this.formData = { ...block };
        this.editingBlock = block;

        document.getElementById('wizardTitle').textContent = `Edit: ${block.name}`;
        document.getElementById('wizardOverlay').classList.add('active');
        document.getElementById('wizardOverlay').classList.remove('closing');
        document.body.style.overflow = 'hidden';

        this.renderStep();
        this.updateControls();
    },

    close() {
        const overlay = document.getElementById('wizardOverlay');
        overlay.classList.add('closing');

        setTimeout(() => {
            overlay.classList.remove('active', 'closing');
            document.body.style.overflow = '';
            this.isOpen = false;
        }, 250);
    },

    next() {
        if (this.currentStep === 0 && !this.selectedType) {
            Utils.toast('Please select a block type', 'warning');
            return;
        }

        if (this.currentStep < this.totalSteps - 1) {
            this.currentStep++;
            this.renderStep();
            this.updateControls();
        } else {
            this.save();
        }
    },

    back() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep();
            this.updateControls();
        }
    },

    save() {
        const name = this.formData.name || 'Untitled Block';
        Utils.toast(
            this.editingBlock
                ? `"${name}" updated successfully`
                : `"${name}" created successfully`,
            'success'
        );
        this.close();
    },

    // ═══════════ STEP RENDERING ═══════════
    renderStep() {
        const body = document.getElementById('wizardBody');
        body.innerHTML = '';

        const stepEl = Utils.el('div', { className: 'wizard-step' });

        switch (this.currentStep) {
            case 0: this.renderTypeSelection(stepEl); break;
            case 1: this.renderBasicInfo(stepEl); break;
            case 2: this.renderConfiguration(stepEl); break;
            case 3: this.renderReview(stepEl); break;
        }

        body.appendChild(stepEl);

        // Update progress bar
        const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
        document.getElementById('wizardProgressBar').style.width = `${progress}%`;

        // Update step label
        const stepNames = ['Select Type', 'Basic Info', 'Configuration', 'Review'];
        document.getElementById('wizardStepLabel').textContent =
            `Step ${this.currentStep + 1} of ${this.totalSteps} \u2014 ${stepNames[this.currentStep]}`;

        // Update dots
        this.renderDots();
    },

    renderDots() {
        const container = document.getElementById('wizardDots');
        container.innerHTML = '';

        for (let i = 0; i < this.totalSteps; i++) {
            const dot = Utils.el('div', {
                className: `wiz-dot ${i === this.currentStep ? 'active' : ''} ${i < this.currentStep ? 'completed' : ''}`
            });
            container.appendChild(dot);
        }
    },

    updateControls() {
        const backBtn = document.getElementById('wizardBack');
        const nextBtn = document.getElementById('wizardNext');

        backBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
        nextBtn.textContent = this.currentStep === this.totalSteps - 1
            ? (this.editingBlock ? 'Save Changes' : 'Create Block')
            : 'Next';
    },

    // ═══════════ STEP 0: TYPE SELECTION ═══════════
    renderTypeSelection(container) {
        const grid = Utils.el('div', { className: 'type-grid' });

        const types = [
            { type: 'service', icon: '\u2699\uFE0F', label: 'Service', desc: 'Deliverable work items with SLA & pricing' },
            { type: 'spare', icon: '\uD83D\uDD27', label: 'Spare', desc: 'Physical products with inventory tracking' },
            { type: 'billing', icon: '\uD83D\uDCB3', label: 'Billing', desc: 'Payment structures and terms' },
            { type: 'text', icon: '\uD83D\uDCDD', label: 'Text', desc: 'Terms, conditions, and policies' },
            { type: 'video', icon: '\uD83C\uDFA5', label: 'Video', desc: 'Embedded video content' },
            { type: 'image', icon: '\uD83D\uDDBC\uFE0F', label: 'Image', desc: 'Photos and diagrams' },
            { type: 'checklist', icon: '\u2705', label: 'Checklist', desc: 'Task verification lists' },
            { type: 'document', icon: '\uD83D\uDCC4', label: 'Document', desc: 'File attachments' }
        ];

        types.forEach(t => {
            const option = Utils.el('div', {
                className: `type-option ${this.selectedType === t.type ? 'selected' : ''}`,
                onClick: () => {
                    this.selectedType = t.type;
                    grid.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                }
            }, [
                Utils.el('div', {
                    className: 'type-option-icon',
                    textContent: t.icon,
                    style: { background: Utils.getCategoryBg(t.type) }
                }),
                Utils.el('div', { className: 'type-option-label', textContent: t.label }),
                Utils.el('div', { className: 'type-option-desc', textContent: t.desc })
            ]);

            grid.appendChild(option);
        });

        container.appendChild(grid);
    },

    // ═══════════ STEP 1: BASIC INFO ═══════════
    renderBasicInfo(container) {
        const iconSection = Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', { className: 'form-label', textContent: 'Icon' }),
            this.createIconPicker()
        ]);

        const nameGroup = Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', {
                className: 'form-label',
                innerHTML: 'Block Name <span class="required">*</span>'
            }),
            Utils.el('input', {
                className: 'form-input',
                type: 'text',
                placeholder: 'e.g. AC Deep Clean Service',
                value: this.formData.name || '',
                onInput: (e) => { this.formData.name = e.target.value; }
            })
        ]);

        const descGroup = Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', { className: 'form-label', textContent: 'Description' }),
            Utils.el('textarea', {
                className: 'form-input',
                placeholder: 'Brief description of this block...',
                textContent: this.formData.description || '',
                onInput: (e) => { this.formData.description = e.target.value; }
            }),
            Utils.el('span', { className: 'form-hint', textContent: 'Shown to buyers in the contract document' })
        ]);

        const tagsGroup = Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', { className: 'form-label', textContent: 'Tags' }),
            Utils.el('input', {
                className: 'form-input',
                type: 'text',
                placeholder: 'e.g. ac, cleaning, home (comma separated)',
                value: (this.formData.tags || []).join(', '),
                onInput: (e) => { this.formData.tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean); }
            })
        ]);

        container.append(iconSection, nameGroup, descGroup, tagsGroup);
    },

    createIconPicker() {
        const icons = [
            '\u2699\uFE0F', '\uD83D\uDD27', '\uD83D\uDCB3', '\uD83D\uDCDD', '\uD83C\uDFA5',
            '\uD83D\uDDBC\uFE0F', '\u2705', '\uD83D\uDCC4', '\u2744\uFE0F', '\uD83E\uDDD8',
            '\uD83D\uDEB0', '\uD83C\uDFE0', '\uD83D\uDE97', '\uD83D\uDC1B', '\uD83D\uDCF7',
            '\u26A1', '\uD83D\uDCA8', '\uD83E\uDDEA', '\u2728', '\uD83D\uDCA1',
            '\uD83D\uDCB0', '\uD83C\uDFAF', '\uD83D\uDCC5', '\uD83D\uDCE6', '\uD83D\uDCDC',
            '\u274C', '\uD83D\uDEE1\uFE0F', '\uD83C\uDF1F', '\uD83D\uDCFA', '\uD83D\uDC65',
            '\uD83D\uDCCB', '\u26A0\uFE0F', '\uD83C\uDF93', '\uD83D\uDCC3', '\uD83C\uDFE2',
            '\uD83D\uDC8E', '\uD83C\uDF08', '\uD83D\uDD25', '\uD83C\uDF3F', '\uD83D\uDEA8'
        ];

        const grid = Utils.el('div', { className: 'icon-picker-grid' });

        icons.forEach(icon => {
            const item = Utils.el('div', {
                className: `icon-picker-item ${this.formData.icon === icon ? 'selected' : ''}`,
                textContent: icon,
                onClick: () => {
                    this.formData.icon = icon;
                    grid.querySelectorAll('.icon-picker-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                }
            });
            grid.appendChild(item);
        });

        return grid;
    },

    // ═══════════ STEP 2: CONFIGURATION ═══════════
    renderConfiguration(container) {
        const type = this.selectedType;

        if (type === 'service' || type === 'spare') {
            this.renderPricingConfig(container);
        }

        if (type === 'service') {
            this.renderServiceConfig(container);
        } else if (type === 'billing') {
            this.renderBillingConfig(container);
        } else if (type === 'text') {
            this.renderTextConfig(container);
        } else if (type === 'checklist') {
            this.renderChecklistConfig(container);
        } else {
            this.renderGenericConfig(container);
        }
    },

    renderPricingConfig(container) {
        // Pricing mode selector
        const modeSelector = Utils.el('div', { className: 'pricing-mode-selector' });
        const modes = [
            { id: 'independent', label: 'Fixed Price', desc: 'Single price for this block' },
            { id: 'resource_based', label: 'Resource Based', desc: 'Price varies by resource' },
            { id: 'variant_based', label: 'Variant Based', desc: 'Price varies by asset type' }
        ];

        modes.forEach(mode => {
            const el = Utils.el('div', {
                className: `pricing-mode ${(this.formData.pricing_mode || 'independent') === mode.id ? 'selected' : ''}`,
                onClick: () => {
                    this.formData.pricing_mode = mode.id;
                    modeSelector.querySelectorAll('.pricing-mode').forEach(m => m.classList.remove('selected'));
                    el.classList.add('selected');
                }
            }, [
                Utils.el('div', { className: 'pricing-mode-label', textContent: mode.label }),
                Utils.el('div', { className: 'pricing-mode-desc', textContent: mode.desc })
            ]);
            modeSelector.appendChild(el);
        });

        const priceRow = Utils.el('div', { className: 'form-row' }, [
            Utils.el('div', { className: 'form-group' }, [
                Utils.el('label', { className: 'form-label', textContent: 'Base Price' }),
                Utils.el('input', {
                    className: 'form-input',
                    type: 'number',
                    placeholder: '0.00',
                    value: this.formData.base_price || '',
                    onInput: (e) => { this.formData.base_price = parseFloat(e.target.value) || 0; }
                })
            ]),
            Utils.el('div', { className: 'form-group' }, [
                Utils.el('label', { className: 'form-label', textContent: 'Tax Rate (%)' }),
                Utils.el('input', {
                    className: 'form-input',
                    type: 'number',
                    placeholder: '18',
                    value: this.formData.tax_rate || '',
                    onInput: (e) => { this.formData.tax_rate = parseFloat(e.target.value) || 0; }
                })
            ])
        ]);

        container.append(
            Utils.el('div', { className: 'form-group' }, [
                Utils.el('label', { className: 'form-label', textContent: 'Pricing Mode' }),
                modeSelector
            ]),
            priceRow
        );
    },

    renderServiceConfig(container) {
        const config = this.formData.config || {};

        const durationRow = Utils.el('div', { className: 'form-row' }, [
            Utils.el('div', { className: 'form-group' }, [
                Utils.el('label', { className: 'form-label', textContent: 'Duration (minutes)' }),
                Utils.el('input', {
                    className: 'form-input',
                    type: 'number',
                    placeholder: '60',
                    value: config.duration || '',
                    onInput: (e) => {
                        if (!this.formData.config) this.formData.config = {};
                        this.formData.config.duration = parseInt(e.target.value) || 0;
                    }
                })
            ]),
            Utils.el('div', { className: 'form-group' }, [
                Utils.el('label', { className: 'form-label', textContent: 'Location' }),
                Utils.el('input', {
                    className: 'form-input',
                    type: 'text',
                    placeholder: 'on-site / virtual / hybrid',
                    value: config.location || '',
                    onInput: (e) => {
                        if (!this.formData.config) this.formData.config = {};
                        this.formData.config.location = e.target.value;
                    }
                })
            ])
        ]);

        // Evidence toggles
        const toggleGroup = Utils.el('div', { className: 'toggle-group' });
        const evidenceOptions = [
            { key: 'requirePhoto', label: 'Require Photo', desc: 'Technician must capture before/after photos' },
            { key: 'requireSignature', label: 'Require Signature', desc: 'Customer must sign off on completion' },
            { key: 'requireGPS', label: 'Require GPS', desc: 'Track technician check-in/out location' },
            { key: 'requireOTP', label: 'Require OTP', desc: 'Customer OTP verification for authentication' }
        ];

        evidenceOptions.forEach(opt => {
            const isOn = config[opt.key] || false;
            const toggle = Utils.el('div', { className: 'toggle-row' }, [
                Utils.el('div', { className: 'toggle-info' }, [
                    Utils.el('span', { className: 'toggle-name', textContent: opt.label }),
                    Utils.el('span', { className: 'toggle-desc', textContent: opt.desc })
                ]),
                Utils.el('div', {
                    className: `toggle-switch ${isOn ? 'on' : ''}`,
                    onClick: (e) => {
                        if (!this.formData.config) this.formData.config = {};
                        this.formData.config[opt.key] = !this.formData.config[opt.key];
                        e.currentTarget.classList.toggle('on');
                    }
                })
            ]);
            toggleGroup.appendChild(toggle);
        });

        container.append(
            durationRow,
            Utils.el('div', { className: 'form-group', style: { marginTop: '16px' } }, [
                Utils.el('label', { className: 'form-label', textContent: 'Evidence Requirements' }),
                toggleGroup
            ])
        );
    },

    renderBillingConfig(container) {
        const toggleGroup = Utils.el('div', { className: 'toggle-group' });
        const options = [
            { key: 'autoInvoice', label: 'Auto Invoice', desc: 'Automatically generate invoice on each milestone' },
            { key: 'lateFees', label: 'Late Fees', desc: 'Apply late payment penalties' },
            { key: 'partialPayment', label: 'Allow Partial Payment', desc: 'Accept partial payments towards total' }
        ];

        options.forEach(opt => {
            const isOn = (this.formData.config && this.formData.config[opt.key]) || false;
            toggleGroup.appendChild(Utils.el('div', { className: 'toggle-row' }, [
                Utils.el('div', { className: 'toggle-info' }, [
                    Utils.el('span', { className: 'toggle-name', textContent: opt.label }),
                    Utils.el('span', { className: 'toggle-desc', textContent: opt.desc })
                ]),
                Utils.el('div', {
                    className: `toggle-switch ${isOn ? 'on' : ''}`,
                    onClick: (e) => {
                        if (!this.formData.config) this.formData.config = {};
                        this.formData.config[opt.key] = !this.formData.config[opt.key];
                        e.currentTarget.classList.toggle('on');
                    }
                })
            ]));
        });

        container.appendChild(Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', { className: 'form-label', textContent: 'Billing Options' }),
            toggleGroup
        ]));
    },

    renderTextConfig(container) {
        container.appendChild(Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', { className: 'form-label', textContent: 'Content' }),
            Utils.el('textarea', {
                className: 'form-input',
                placeholder: 'Enter terms, conditions, or policy text...',
                style: { minHeight: '160px' },
                textContent: (this.formData.config && this.formData.config.content) || '',
                onInput: (e) => {
                    if (!this.formData.config) this.formData.config = {};
                    this.formData.config.content = e.target.value;
                }
            }),
            Utils.el('span', { className: 'form-hint', textContent: 'Supports plain text. Rich text editor available in production.' })
        ]));

        const toggleGroup = Utils.el('div', { className: 'toggle-group' });
        const isOn = (this.formData.config && this.formData.config.requireAcceptance) || false;
        toggleGroup.appendChild(Utils.el('div', { className: 'toggle-row' }, [
            Utils.el('div', { className: 'toggle-info' }, [
                Utils.el('span', { className: 'toggle-name', textContent: 'Require Acceptance' }),
                Utils.el('span', { className: 'toggle-desc', textContent: 'Buyer must explicitly accept this text block' })
            ]),
            Utils.el('div', {
                className: `toggle-switch ${isOn ? 'on' : ''}`,
                onClick: (e) => {
                    if (!this.formData.config) this.formData.config = {};
                    this.formData.config.requireAcceptance = !this.formData.config.requireAcceptance;
                    e.currentTarget.classList.toggle('on');
                }
            })
        ]));

        container.appendChild(Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', { className: 'form-label', textContent: 'Options' }),
            toggleGroup
        ]));
    },

    renderChecklistConfig(container) {
        const items = (this.formData.config && this.formData.config.items) || [''];

        const listContainer = Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', { className: 'form-label', textContent: 'Checklist Items' })
        ]);

        const renderItems = () => {
            const existing = listContainer.querySelectorAll('.toggle-row');
            existing.forEach(e => e.remove());

            items.forEach((item, i) => {
                const row = Utils.el('div', { className: 'toggle-row' }, [
                    Utils.el('input', {
                        className: 'form-input',
                        type: 'text',
                        value: item,
                        placeholder: `Item ${i + 1}`,
                        style: { flex: '1', marginRight: '8px', border: 'none', padding: '0' },
                        onInput: (e) => { items[i] = e.target.value; }
                    }),
                    Utils.el('button', {
                        className: 'track-action-btn delete',
                        innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
                        onClick: () => { items.splice(i, 1); renderItems(); }
                    })
                ]);
                listContainer.appendChild(row);
            });

            const addBtn = Utils.el('button', {
                className: 'action-btn',
                style: { marginTop: '8px' },
                innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Item',
                onClick: () => { items.push(''); renderItems(); }
            });
            listContainer.appendChild(addBtn);
        };

        renderItems();
        container.appendChild(listContainer);
    },

    renderGenericConfig(container) {
        container.appendChild(Utils.el('div', { className: 'form-group' }, [
            Utils.el('label', { className: 'form-label', textContent: 'Status' }),
            Utils.el('input', {
                className: 'form-input',
                type: 'text',
                placeholder: 'active / draft',
                value: this.formData.status || 'active',
                onInput: (e) => { this.formData.status = e.target.value; }
            })
        ]));
    },

    // ═══════════ STEP 3: REVIEW ═══════════
    renderReview(container) {
        const color = Utils.getCategoryColor(this.selectedType);

        const reviewCard = Utils.el('div', {
            style: {
                background: 'var(--input-bg)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-default)',
                overflow: 'hidden'
            }
        });

        // DNA bar
        const dna = Utils.generateDNA(this.formData);
        reviewCard.appendChild(this.createReviewDNA(dna, color));

        // Info
        const info = Utils.el('div', { style: { padding: '24px' } });

        info.appendChild(Utils.el('div', {
            style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }
        }, [
            Utils.el('div', {
                textContent: this.formData.icon || Utils.getCategoryIcon(this.selectedType),
                style: {
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: Utils.getCategoryBg(this.selectedType),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px'
                }
            }),
            Utils.el('div', {}, [
                Utils.el('h3', {
                    textContent: this.formData.name || 'Untitled Block',
                    style: { fontSize: '18px', fontWeight: '700' }
                }),
                Utils.el('span', {
                    textContent: this.selectedType.charAt(0).toUpperCase() + this.selectedType.slice(1),
                    style: {
                        fontSize: '12px', fontWeight: '600',
                        padding: '2px 8px', borderRadius: '999px',
                        background: Utils.getCategoryBg(this.selectedType),
                        color: color
                    }
                })
            ])
        ]));

        if (this.formData.description) {
            info.appendChild(Utils.el('p', {
                textContent: this.formData.description,
                style: { color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '16px' }
            }));
        }

        // Details grid
        const details = Utils.el('div', {
            style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }
        });

        const addDetail = (label, value) => {
            details.appendChild(Utils.el('div', {
                style: { padding: '8px 12px', background: 'var(--bg-raised)', borderRadius: '8px' }
            }, [
                Utils.el('div', {
                    textContent: label,
                    style: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }
                }),
                Utils.el('div', {
                    textContent: value,
                    style: { fontSize: '13px', fontWeight: '600', marginTop: '2px' }
                })
            ]));
        };

        if (this.formData.base_price > 0) {
            addDetail('Price', Utils.formatCurrencyFull(this.formData.base_price, this.formData.currency || 'INR'));
        }
        if (this.formData.tax_rate > 0) {
            addDetail('Tax', `${this.formData.tax_rate}% GST`);
        }
        if (this.formData.pricing_mode) {
            addDetail('Pricing Mode', this.formData.pricing_mode.replace('_', ' '));
        }
        if (this.formData.config && this.formData.config.duration) {
            addDetail('Duration', `${this.formData.config.duration} min`);
        }
        if (this.formData.config && this.formData.config.location) {
            addDetail('Location', this.formData.config.location);
        }
        addDetail('Status', this.formData.status || 'active');

        info.appendChild(details);
        reviewCard.appendChild(info);
        container.appendChild(reviewCard);
    },

    createReviewDNA(segments, color) {
        const dna = Utils.el('div', { style: { height: '6px', display: 'flex' } });
        segments.forEach(seg => {
            dna.appendChild(Utils.el('div', {
                style: {
                    height: '100%', flex: Math.max(seg.width, 0.1),
                    background: color, opacity: seg.opacity
                }
            }));
        });
        return dna;
    }
};
