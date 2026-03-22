/* ═══════════════════════════════════════════════════
   AI AGENT — View 4: AI-Powered Template Assistant
   Simulates AI generation of template blocks/content.
   ═══════════════════════════════════════════════════ */

const AIAgent = {
    selectedIndustry: null,
    selectedResource: null,
    selectedNomenclature: 'AMC',
    chatMessages: [],
    currentAction: null,  // 'generate_full' | 'suggest_blocks' | 'fill_fields' | 'review'
    generationState: null, // null | 'generating' | 'done'
    generatedResult: null,
    stepProgress: 0,

    show() {
        this.generationState = null;
        this.generatedResult = null;
        this.currentAction = null;
        this.stepProgress = 0;

        // Default to first industry with resources
        if (!this.selectedIndustry) {
            this.selectedIndustry = Data.industries.find(i =>
                Data.getIndustryResources(i.id).length > 0
            );
        }
        if (this.selectedIndustry && !this.selectedResource) {
            const res = Data.getIndustryResources(this.selectedIndustry.id);
            if (res.length > 0) this.selectedResource = res[0];
        }

        // Seed chat
        if (this.chatMessages.length === 0) {
            this.chatMessages = [
                { role: 'agent', text: 'Welcome! I can help you generate global template content. Select an industry and resource, then choose an action.', time: this.timeStr() }
            ];
        }

        this.render();
    },

    render() {
        const container = document.getElementById('coverageView');
        container.innerHTML = '';
        container.className = '';

        const title = document.querySelector('.view-title');
        const subtitle = document.querySelector('.view-subtitle');
        if (title) title.textContent = 'AI Agent';
        if (subtitle) subtitle.textContent = 'Generate template content with AI assistance';

        const topRight = document.querySelector('.topbar-right');
        if (topRight) {
            topRight.innerHTML = '';
            topRight.appendChild(Utils.el('button', {
                className: 'btn btn-secondary',
                innerHTML: Utils.backArrowSvg + ' Coverage',
                onClick: () => App.navigate('coverage')
            }));
        }

        const layout = Utils.el('div', { className: 'agent-layout' });
        layout.appendChild(this.renderPanel());
        layout.appendChild(this.renderMain());
        container.appendChild(layout);
    },

    // ═══════════ LEFT PANEL ═══════════
    renderPanel() {
        const panel = Utils.el('div', { className: 'agent-panel' });

        // Header
        panel.appendChild(Utils.el('div', { className: 'agent-panel-header' }, [
            Utils.el('div', { className: 'agent-avatar', textContent: '\uD83E\uDD16' }),
            Utils.el('div', {}, [
                Utils.el('div', { className: 'agent-panel-title', textContent: 'Template Agent' }),
                Utils.el('div', { className: 'agent-panel-status' }, [
                    Utils.el('span', { className: 'status-dot' }),
                    document.createTextNode('Ready')
                ])
            ])
        ]));

        // Quick actions
        panel.appendChild(this.renderActions());

        // Chat
        panel.appendChild(this.renderChat());

        // Input
        panel.appendChild(this.renderInput());

        return panel;
    },

    renderActions() {
        const section = Utils.el('div', { className: 'agent-actions' });
        section.appendChild(Utils.el('div', { className: 'agent-actions-title', textContent: 'Quick Actions' }));

        const grid = Utils.el('div', { className: 'agent-action-grid' });
        const actions = [
            { id: 'generate_full', icon: '\u2728', label: 'Generate Full Template' },
            { id: 'suggest_blocks', icon: '\uD83E\uDDE9', label: 'Suggest Blocks' },
            { id: 'fill_fields', icon: '\uD83D\uDCDD', label: 'Auto-Fill Fields' },
            { id: 'review', icon: '\uD83D\uDD0D', label: 'Review & Improve' }
        ];

        actions.forEach(a => {
            grid.appendChild(Utils.el('button', {
                className: `agent-action-btn ${this.currentAction === a.id ? 'active' : ''}`,
                onClick: () => this.executeAction(a.id)
            }, [
                Utils.el('span', { className: 'agent-action-icon', textContent: a.icon }),
                Utils.el('span', { className: 'agent-action-label', textContent: a.label })
            ]));
        });

        section.appendChild(grid);
        return section;
    },

    renderChat() {
        const chat = Utils.el('div', { className: 'agent-chat' });

        this.chatMessages.forEach(msg => {
            const bubble = Utils.el('div', { className: `chat-msg ${msg.role}` }, [
                Utils.el('div', {
                    className: 'chat-msg-avatar',
                    textContent: msg.role === 'agent' ? '\uD83E\uDD16' : 'CK'
                }),
                Utils.el('div', { className: 'chat-msg-body' }, [
                    Utils.el('div', { className: 'chat-msg-bubble', textContent: msg.text }),
                    Utils.el('div', { className: 'chat-msg-time', textContent: msg.time })
                ])
            ]);
            chat.appendChild(bubble);
        });

        // Scroll to bottom after render
        setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 50);

        return chat;
    },

    renderInput() {
        const area = Utils.el('div', { className: 'agent-input-area' });
        const row = Utils.el('div', { className: 'agent-input-row' });

        const input = Utils.el('input', {
            className: 'agent-input',
            type: 'text',
            placeholder: 'Ask the agent anything...',
            onKeydown: (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                    this.sendMessage(e.target.value.trim());
                    e.target.value = '';
                }
            }
        });
        row.appendChild(input);

        row.appendChild(Utils.el('button', {
            className: 'agent-send-btn',
            innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
            onClick: () => {
                if (input.value.trim()) {
                    this.sendMessage(input.value.trim());
                    input.value = '';
                }
            }
        }));

        area.appendChild(row);
        return area;
    },

    // ═══════════ MAIN PANEL ═══════════
    renderMain() {
        const main = Utils.el('div', { className: 'agent-main' });

        // Context selector row
        main.appendChild(this.renderContext());

        // Content based on state
        if (this.generationState === 'generating') {
            main.appendChild(this.renderProgress());
        } else if (this.generationState === 'done' && this.generatedResult) {
            main.appendChild(this.renderResult());
        } else {
            main.appendChild(this.renderWelcome());
        }

        return main;
    },

    renderContext() {
        const ctx = Utils.el('div', { className: 'agent-context' });
        const industries = Data.industries.filter(i => Data.getIndustryResources(i.id).length > 0);
        const resources = this.selectedIndustry ? Data.getIndustryResources(this.selectedIndustry.id) : [];

        // Industry selector
        const indCard = Utils.el('div', {
            className: 'agent-context-card',
            style: { animationDelay: '0ms' }
        });
        indCard.appendChild(Utils.el('div', { className: 'agent-context-label', textContent: 'Industry' }));
        indCard.appendChild(Utils.el('div', { className: 'agent-context-value' }, [
            Utils.el('span', { textContent: this.selectedIndustry ? this.selectedIndustry.icon : '\uD83C\uDFE2' }),
            Utils.el('span', { textContent: this.selectedIndustry ? this.selectedIndustry.name : 'Select...' })
        ]));
        const indSelect = Utils.el('select', {
            className: 'filter-select agent-context-select',
            onChange: (e) => {
                this.selectedIndustry = Data.industries.find(i => i.id === e.target.value);
                const res = Data.getIndustryResources(this.selectedIndustry.id);
                this.selectedResource = res.length > 0 ? res[0] : null;
                this.generationState = null;
                this.generatedResult = null;
                this.render();
            }
        });
        industries.forEach(i => {
            const o = Utils.el('option', { value: i.id, textContent: `${i.icon} ${i.name}` });
            if (this.selectedIndustry && this.selectedIndustry.id === i.id) o.selected = true;
            indSelect.appendChild(o);
        });
        indCard.appendChild(indSelect);
        ctx.appendChild(indCard);

        // Resource selector
        const resCard = Utils.el('div', {
            className: 'agent-context-card',
            style: { animationDelay: '60ms' }
        });
        resCard.appendChild(Utils.el('div', { className: 'agent-context-label', textContent: 'Resource Template' }));
        const typeIcons = { team_staff: '\uD83D\uDC65', equipment: '\uD83D\uDD27', consumable: '\uD83D\uDCE6', asset: '\uD83C\uDFE2', partner: '\uD83E\uDD1D' };
        resCard.appendChild(Utils.el('div', { className: 'agent-context-value' }, [
            Utils.el('span', { textContent: this.selectedResource ? (typeIcons[this.selectedResource.resource_type_id] || '\uD83D\uDCBC') : '\uD83D\uDD27' }),
            Utils.el('span', { textContent: this.selectedResource ? this.selectedResource.name : 'Select...' })
        ]));
        const resSelect = Utils.el('select', {
            className: 'filter-select agent-context-select',
            onChange: (e) => {
                this.selectedResource = Data.resourceTemplates.find(r => r.id === e.target.value);
                this.generationState = null;
                this.generatedResult = null;
                this.render();
            }
        });
        resources.forEach(r => {
            const o = Utils.el('option', { value: r.id, textContent: r.name });
            if (this.selectedResource && this.selectedResource.id === r.id) o.selected = true;
            resSelect.appendChild(o);
        });
        resCard.appendChild(resSelect);
        ctx.appendChild(resCard);

        // Nomenclature selector
        const nomCard = Utils.el('div', {
            className: 'agent-context-card',
            style: { animationDelay: '120ms' }
        });
        nomCard.appendChild(Utils.el('div', { className: 'agent-context-label', textContent: 'Nomenclature' }));
        nomCard.appendChild(Utils.el('div', { className: 'agent-context-value' }, [
            Utils.el('span', { textContent: '\uD83D\uDCC4' }),
            Utils.el('span', { textContent: this.selectedNomenclature })
        ]));
        const nomSelect = Utils.el('select', {
            className: 'filter-select agent-context-select',
            onChange: (e) => {
                this.selectedNomenclature = e.target.value;
                this.generationState = null;
                this.generatedResult = null;
                this.render();
            }
        });
        Data.nomenclatures.forEach(n => {
            const o = Utils.el('option', { value: n.code, textContent: `${n.code} \u2014 ${n.name}` });
            if (this.selectedNomenclature === n.code) o.selected = true;
            nomSelect.appendChild(o);
        });
        nomCard.appendChild(nomSelect);
        ctx.appendChild(nomCard);

        return ctx;
    },

    renderWelcome() {
        const w = Utils.el('div', { className: 'agent-welcome' });
        w.appendChild(Utils.el('div', { className: 'agent-welcome-icon', textContent: '\uD83E\uDD16' }));
        w.appendChild(Utils.el('div', { className: 'agent-welcome-title', textContent: 'AI Template Agent' }));
        w.appendChild(Utils.el('div', {
            className: 'agent-welcome-desc',
            textContent: 'Select an industry, resource, and nomenclature above, then use a quick action or chat to generate template content. The AI will analyze your catalog data and produce industry-specific blocks.'
        }));

        const cards = Utils.el('div', { className: 'agent-welcome-cards' });
        [
            { icon: '\u2728', title: 'Full Template', desc: 'Generate all blocks with pre-filled content', action: 'generate_full' },
            { icon: '\uD83E\uDDE9', title: 'Smart Blocks', desc: 'AI suggests which blocks to include', action: 'suggest_blocks' },
            { icon: '\uD83D\uDD0D', title: 'Review', desc: 'Analyze existing template for improvements', action: 'review' }
        ].forEach(c => {
            cards.appendChild(Utils.el('div', {
                className: 'agent-welcome-card',
                onClick: () => this.executeAction(c.action)
            }, [
                Utils.el('div', { className: 'agent-welcome-card-icon', textContent: c.icon }),
                Utils.el('div', { className: 'agent-welcome-card-title', textContent: c.title }),
                Utils.el('div', { className: 'agent-welcome-card-desc', textContent: c.desc })
            ]));
        });
        w.appendChild(cards);

        return w;
    },

    // ═══════════ GENERATION PROGRESS ═══════════
    renderProgress() {
        const p = Utils.el('div', { className: 'gen-progress' });
        p.appendChild(Utils.el('div', { className: 'gen-progress-spinner' }));
        p.appendChild(Utils.el('div', { className: 'gen-progress-text', textContent: 'Generating template content...' }));
        p.appendChild(Utils.el('div', {
            className: 'gen-progress-detail',
            textContent: `${this.selectedResource?.name} \u2022 ${this.selectedNomenclature} \u2022 ${this.selectedIndustry?.name}`
        }));

        const steps = [
            'Analyzing industry context',
            'Identifying resource attributes',
            'Generating scope of work',
            'Building pricing structure',
            'Defining SLA parameters',
            'Compiling compliance requirements',
            'Finalizing template'
        ];

        const stepsEl = Utils.el('div', { className: 'gen-progress-steps' });
        steps.forEach((s, i) => {
            const state = i < this.stepProgress ? 'done' : i === this.stepProgress ? 'active' : 'pending';
            stepsEl.appendChild(Utils.el('div', { className: `gen-step ${state}` }, [
                Utils.el('div', { className: 'gen-step-icon', textContent: state === 'done' ? '\u2713' : state === 'active' ? '\u25CF' : '\u25CB' }),
                document.createTextNode(s)
            ]));
        });
        p.appendChild(stepsEl);

        return p;
    },

    // ═══════════ GENERATION RESULT ═══════════
    renderResult() {
        const wrapper = Utils.el('div', {});

        // Summary header
        wrapper.appendChild(Utils.el('div', {
            style: {
                fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)'
            }
        }, [
            Utils.el('span', { textContent: '\u2713', style: { color: 'var(--success)', fontWeight: 'bold' } }),
            document.createTextNode(`Generated ${this.generatedResult.blocks.length} blocks for "${this.selectedResource?.name} ${this.selectedNomenclature}"`)
        ]));

        // Render each generated block
        this.generatedResult.blocks.forEach((block, i) => {
            wrapper.appendChild(this.renderGenBlock(block, i));
        });

        // Bottom actions
        wrapper.appendChild(Utils.el('div', {
            style: { display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'center' }
        }, [
            Utils.el('button', {
                className: 'btn btn-primary',
                textContent: 'Open in Template Builder',
                onClick: () => {
                    if (this.selectedResource) {
                        App.openTemplateBuilder(this.selectedResource.id, null);
                        Utils.toast('Template content loaded into builder', 'success');
                    }
                }
            }),
            Utils.el('button', {
                className: 'btn btn-secondary',
                textContent: 'Regenerate',
                onClick: () => this.executeAction(this.currentAction)
            })
        ]));

        return wrapper;
    },

    renderGenBlock(block, index) {
        const iconMap = {
            scope_of_work: { cls: 'scope', icon: '\uD83D\uDCCB' },
            pricing: { cls: 'pricing', icon: '\uD83D\uDCB0' },
            sla: { cls: 'sla', icon: '\u23F1\uFE0F' },
            terms: { cls: 'terms', icon: '\uD83D\uDCC4' }
        };
        const look = iconMap[block.blockType] || { cls: 'full', icon: '\u2699\uFE0F' };
        const bt = Data.blockTypes.find(t => t.id === block.blockType);

        const card = Utils.el('div', {
            className: 'gen-result-card',
            style: { animationDelay: `${index * 80}ms` }
        });

        // Header
        card.appendChild(Utils.el('div', { className: 'gen-result-header' }, [
            Utils.el('div', { className: `gen-result-icon ${look.cls}`, textContent: look.icon }),
            Utils.el('div', {}, [
                Utils.el('div', { className: 'gen-result-title', textContent: bt ? bt.name : block.blockType }),
                Utils.el('div', { className: 'gen-result-subtitle', textContent: `${Object.keys(block.fields).length} fields generated` })
            ]),
            Utils.el('div', { className: 'gen-result-actions' }, [
                Utils.el('button', {
                    className: 'btn btn-ghost',
                    style: { fontSize: 'var(--text-xs)', color: 'var(--success)' },
                    textContent: '\u2713 Accept All',
                    onClick: () => Utils.toast(`Accepted all fields for "${bt?.name}"`, 'success')
                })
            ])
        ]));

        // Body — fields
        const body = Utils.el('div', { className: 'gen-result-body' });
        Object.entries(block.fields).forEach(([key, value]) => {
            body.appendChild(Utils.el('div', { className: 'gen-field' }, [
                Utils.el('div', { className: 'gen-field-label', textContent: this.formatFieldName(key) }),
                Utils.el('div', { className: 'gen-field-value ai-generated', textContent: value }),
                Utils.el('div', { className: 'gen-field-action' }, [
                    Utils.el('button', { className: 'gen-field-btn accept', textContent: '\u2713', title: 'Accept', onClick: () => Utils.toast('Field accepted', 'success') }),
                    Utils.el('button', { className: 'gen-field-btn reject', textContent: '\u2717', title: 'Reject', onClick: () => Utils.toast('Field rejected', 'warning') })
                ])
            ]));
        });
        card.appendChild(body);

        return card;
    },

    // ═══════════ ACTIONS ═══════════
    executeAction(actionId) {
        if (!this.selectedResource || !this.selectedIndustry) {
            Utils.toast('Select an industry and resource first', 'warning');
            return;
        }

        this.currentAction = actionId;
        this.generationState = 'generating';
        this.stepProgress = 0;

        const actionNames = {
            generate_full: 'Generate Full Template',
            suggest_blocks: 'Suggest Blocks',
            fill_fields: 'Auto-Fill Fields',
            review: 'Review & Improve'
        };

        this.addChat('user', `${actionNames[actionId]} for ${this.selectedResource.name} (${this.selectedNomenclature})`);
        this.addChat('agent', `Starting ${actionNames[actionId].toLowerCase()}. Analyzing ${this.selectedIndustry.name} industry context...`);

        this.render();

        // Simulate step-by-step progress
        this.simulateGeneration();
    },

    simulateGeneration() {
        const totalSteps = 7;
        const stepInterval = 400;

        const advance = () => {
            this.stepProgress++;
            if (this.stepProgress < totalSteps) {
                // Re-render progress
                const main = document.querySelector('.agent-main');
                if (main) {
                    const progress = main.querySelector('.gen-progress');
                    if (progress) {
                        const newProgress = this.renderProgress();
                        progress.replaceWith(newProgress);
                    }
                }
                setTimeout(advance, stepInterval + Math.random() * 300);
            } else {
                // Done
                this.generationState = 'done';
                this.generatedResult = this.generateMockResult();
                this.addChat('agent', `Done! Generated ${this.generatedResult.blocks.length} blocks with ${this.generatedResult.totalFields} fields. Review the output and accept or edit each field.`);
                this.render();
            }
        };

        setTimeout(advance, stepInterval);
    },

    generateMockResult() {
        const res = this.selectedResource;
        const ind = this.selectedIndustry;
        const nom = this.selectedNomenclature;

        // Generate realistic content based on selected context
        const blocks = [
            {
                blockType: 'scope_of_work',
                fields: {
                    service_description: `Comprehensive ${nom === 'AMC' ? 'annual maintenance' : nom === 'CMC' ? 'comprehensive maintenance' : 'facility management'} services for ${res.name} in ${ind.name} sector. Covers preventive, corrective, and emergency maintenance as per industry standards.`,
                    inclusions: `Scheduled preventive maintenance (${nom === 'AMC' ? 'quarterly' : 'monthly'}), Emergency breakdown support, Calibration and testing, Replacement of wear parts, Performance reporting`,
                    exclusions: 'Major overhaul or replacement, Damage due to misuse or negligence, Third-party modifications, Force majeure events',
                    frequency: nom === 'AMC' ? 'Quarterly visits + on-call emergency' : nom === 'CMC' ? 'Monthly visits + 24/7 support' : 'As per schedule'
                }
            },
            {
                blockType: 'pricing',
                fields: {
                    base_rate: `$${res.pricing.suggested}/hr (suggested range: $${res.pricing.min}\u2013$${res.pricing.max}/hr)`,
                    rate_type: nom === 'BREAKDOWN' ? 'Per incident + parts at actuals' : 'Fixed monthly retainer',
                    payment_schedule: nom === 'AMC' ? 'Quarterly advance' : nom === 'CMC' ? 'Monthly advance' : 'Per invoice, Net 30',
                    tax_details: 'GST @18% applicable on service charges'
                }
            },
            {
                blockType: 'sla',
                fields: {
                    response_time: `Critical: 30 min, High: 2 hours, Normal: 4 hours, Low: 24 hours`,
                    resolution_time: `Critical: 4 hours, High: 8 hours, Normal: 2 business days, Low: 5 business days`,
                    uptime_guarantee: nom === 'CMC' ? '99.5% uptime' : nom === 'AMC' ? '98% uptime' : '95% uptime',
                    penalty_clause: `${nom === 'CMC' ? '5%' : '3%'} deduction per SLA breach, capped at 15% of quarterly value`
                }
            },
            {
                blockType: 'duration',
                fields: {
                    start_date: '{{contract.start_date}}',
                    end_date: '{{contract.end_date}}',
                    auto_renewal: `Yes, auto-renews for 1 year unless ${nom === 'AMC' ? '60' : '90'} days written notice`,
                    notice_period: `${nom === 'AMC' ? '60' : '90'} days prior to expiry`
                }
            },
            {
                blockType: 'resources',
                fields: {
                    resource_list: `{{resource.name}} \u2014 ${res.description}`,
                    quantity: '{{contract.quantity}}',
                    availability: ind.id === 'healthcare' ? '24x7 availability' : 'Mon\u2013Sat, 8 AM\u20136 PM',
                    backup_resources: `1 backup per ${ind.id === 'healthcare' ? '3' : '5'} primary resources`
                }
            },
            {
                blockType: 'compliance',
                fields: {
                    applicable_standards: (ind.compliance || []).join(', '),
                    certifications_required: `Valid ${ind.name} industry certifications, OEM authorization where applicable`,
                    audit_schedule: nom === 'CMC' ? 'Quarterly compliance audits' : 'Bi-annual compliance audits'
                }
            },
            {
                blockType: 'terms',
                fields: {
                    liability_cap: `${nom === 'CMC' ? '2x' : '1x'} Annual Contract Value`,
                    indemnity_clause: 'Mutual indemnification for negligence and willful misconduct',
                    force_majeure: 'Standard force majeure clause including pandemic, natural disasters, government actions',
                    governing_law: 'Applicable local jurisdiction laws'
                }
            }
        ];

        const totalFields = blocks.reduce((s, b) => s + Object.keys(b.fields).length, 0);
        return { blocks, totalFields };
    },

    sendMessage(text) {
        this.addChat('user', text);

        // Simple response logic
        const lower = text.toLowerCase();
        let response;

        if (lower.includes('generate') || lower.includes('create')) {
            response = 'Sure! Click "Generate Full Template" in the quick actions, or I\'ll start generating now.';
            setTimeout(() => this.executeAction('generate_full'), 1000);
        } else if (lower.includes('block') || lower.includes('suggest')) {
            response = `For ${this.selectedResource?.name || 'this resource'}, I'd recommend: Scope of Work, Pricing, SLA, Duration, Resources, Compliance, and Terms blocks. Want me to generate content?`;
        } else if (lower.includes('help')) {
            response = 'I can: 1) Generate full templates, 2) Suggest which blocks to include, 3) Auto-fill fields with industry-specific content, 4) Review existing templates for improvements. What would you like?';
        } else if (lower.includes('sla') || lower.includes('response time')) {
            response = `For ${this.selectedIndustry?.name || 'this industry'}, typical SLAs are: Critical 30min response / 4hr resolution, Normal 4hr response / 2-day resolution. Uptime guarantee usually 98-99.5%.`;
        } else if (lower.includes('pricing') || lower.includes('cost') || lower.includes('rate')) {
            response = `Suggested pricing for ${this.selectedResource?.name || 'this resource'}: $${this.selectedResource?.pricing?.min || '?'}\u2013$${this.selectedResource?.pricing?.max || '?'}/hr. Recommended: $${this.selectedResource?.pricing?.suggested || '?'}/hr.`;
        } else {
            response = `I understand you're asking about "${text}". Try using the quick action buttons on the left, or ask me about SLAs, pricing, blocks, or template generation.`;
        }

        setTimeout(() => {
            this.addChat('agent', response);
            this.render();
        }, 600);

        this.render();
    },

    addChat(role, text) {
        this.chatMessages.push({ role, text, time: this.timeStr() });
        // Keep last 20 messages
        if (this.chatMessages.length > 20) this.chatMessages.shift();
    },

    timeStr() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    formatFieldName(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
};
