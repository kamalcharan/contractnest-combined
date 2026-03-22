/* ═══════════════════════════════════════════════════
   PREVIEW — Live contract document renderer
   ═══════════════════════════════════════════════════ */

const Preview = {

    open() {
        const overlay = document.getElementById('previewOverlay');
        overlay.classList.add('active');
        overlay.classList.remove('closing');
        this.renderFullPreview();
    },

    close() {
        const overlay = document.getElementById('previewOverlay');
        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.classList.remove('active', 'closing');
        }, 300);
    },

    exportPDF() {
        Utils.toast('PDF export initiated (simulated)', 'success');
    },

    // ═══════════ FULL PREVIEW ═══════════
    renderFullPreview() {
        const container = document.getElementById('previewDocument');
        container.innerHTML = '';

        const tracks = Composer.tracks;
        const templateName = document.getElementById('templateNameInput').value || 'Untitled Template';
        const total = tracks.reduce((sum, t) => sum + (t.base_price || 0), 0);

        const doc = Utils.el('div', { className: 'contract-doc' });

        // ── Header ──
        doc.appendChild(Utils.el('div', { className: 'contract-doc-header' }, [
            Utils.el('div', { className: 'contract-doc-logo', textContent: 'ContractNest' }),
            Utils.el('div', { className: 'contract-doc-template-name', textContent: templateName }),
            Utils.el('div', {
                className: 'contract-doc-meta',
                textContent: `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} \u2022 ${tracks.length} blocks`
            })
        ]));

        // ── Body ──
        const body = Utils.el('div', { className: 'contract-doc-body' });

        // Group blocks by type for organized display
        const pricedBlocks = tracks.filter(t => t.base_price > 0);
        const textBlocks = tracks.filter(t => t.type === 'text');
        const checklistBlocks = tracks.filter(t => t.type === 'checklist');
        const otherBlocks = tracks.filter(t =>
            t.base_price === 0 && t.type !== 'text' && t.type !== 'checklist'
        );

        // Render each block as a section
        tracks.forEach((track, index) => {
            const section = this.renderSection(track, index);
            body.appendChild(section);
        });

        // ── Pricing Summary ──
        if (pricedBlocks.length > 0) {
            body.appendChild(this.renderPricingSummary(pricedBlocks, total));
        }

        doc.appendChild(body);

        // ── Footer (signatures) ──
        doc.appendChild(this.renderSignatures());

        container.appendChild(doc);
    },

    renderSection(track, index) {
        const section = Utils.el('div', {
            className: 'contract-section',
            style: { animationDelay: `${index * 80}ms` }
        });

        const color = Utils.getCategoryColor(track.type);

        // Section header
        section.appendChild(Utils.el('div', { className: 'contract-section-header' }, [
            Utils.el('div', {
                className: 'contract-section-icon',
                textContent: track.icon,
                style: { background: Utils.getCategoryBg(track.type) }
            }),
            Utils.el('div', {
                className: 'contract-section-title',
                textContent: track.name,
                style: { color: color }
            }),
            Utils.el('span', {
                className: 'contract-section-seq',
                textContent: `#${(index + 1).toString().padStart(2, '0')}`
            })
        ]));

        // Type-specific content
        switch (track.type) {
            case 'service':
                section.appendChild(this.renderServiceSection(track));
                break;
            case 'spare':
                section.appendChild(this.renderSpareSection(track));
                break;
            case 'billing':
                section.appendChild(this.renderBillingSection(track));
                break;
            case 'text':
                section.appendChild(this.renderTextSection(track));
                break;
            case 'checklist':
                section.appendChild(this.renderChecklistSection(track));
                break;
            case 'video':
                section.appendChild(this.renderMediaSection(track, 'Video'));
                break;
            case 'image':
                section.appendChild(this.renderMediaSection(track, 'Image'));
                break;
            case 'document':
                section.appendChild(this.renderDocumentSection(track));
                break;
        }

        return section;
    },

    renderServiceSection(track) {
        const frag = document.createDocumentFragment();

        // Description
        frag.appendChild(Utils.el('p', {
            textContent: track.description,
            style: { color: '#475569', marginBottom: '12px', fontSize: '13px' }
        }));

        // Details grid
        const grid = Utils.el('div', { className: 'contract-service-detail' });
        const config = track.config || {};

        if (config.duration) {
            grid.appendChild(this.detailItem('Duration', `${config.duration} minutes`));
        }
        if (config.location) {
            grid.appendChild(this.detailItem('Location', config.location.charAt(0).toUpperCase() + config.location.slice(1)));
        }
        if (track.pricing_mode) {
            grid.appendChild(this.detailItem('Pricing', track.pricing_mode.replace('_', ' ')));
        }
        if (track.base_price > 0) {
            grid.appendChild(this.detailItem('Price',
                Utils.formatCurrencyFull(track.base_price, track.currency) + Utils.getPriceTypeLabel(track.price_type)
            ));
        }

        frag.appendChild(grid);

        // Evidence requirements
        const evidence = [];
        if (config.requirePhoto) evidence.push('Photo documentation');
        if (config.requireSignature) evidence.push('Digital signature');
        if (config.requireGPS) evidence.push('GPS verification');
        if (config.requireOTP) evidence.push('OTP authentication');

        if (evidence.length > 0) {
            const evidenceEl = Utils.el('div', {
                style: {
                    padding: '8px 12px', background: '#F0F9FF', borderRadius: '8px',
                    border: '1px solid #BAE6FD', fontSize: '12px', color: '#0369A1'
                }
            }, [
                Utils.el('strong', { textContent: 'Evidence Required: ' }),
                document.createTextNode(evidence.join(' \u2022 '))
            ]);
            frag.appendChild(evidenceEl);
        }

        return frag;
    },

    renderSpareSection(track) {
        const frag = document.createDocumentFragment();

        frag.appendChild(Utils.el('p', {
            textContent: track.description,
            style: { color: '#475569', marginBottom: '12px', fontSize: '13px' }
        }));

        const grid = Utils.el('div', { className: 'contract-service-detail' });
        if (track.config && track.config.sku) {
            grid.appendChild(this.detailItem('SKU', track.config.sku));
        }
        grid.appendChild(this.detailItem('Price',
            Utils.formatCurrencyFull(track.base_price, track.currency) + Utils.getPriceTypeLabel(track.price_type)
        ));

        frag.appendChild(grid);
        return frag;
    },

    renderBillingSection(track) {
        const frag = document.createDocumentFragment();
        const config = track.config || {};

        frag.appendChild(Utils.el('p', {
            textContent: track.description,
            style: { color: '#475569', marginBottom: '12px', fontSize: '13px' }
        }));

        const grid = Utils.el('div', { className: 'contract-service-detail' });
        if (config.paymentType) {
            grid.appendChild(this.detailItem('Payment Type', config.paymentType.replace('_', ' ')));
        }
        if (config.installments) {
            grid.appendChild(this.detailItem('Installments', config.installments.toString()));
        }
        grid.appendChild(this.detailItem('Auto Invoice', config.autoInvoice ? 'Yes' : 'No'));

        frag.appendChild(grid);
        return frag;
    },

    renderTextSection(track) {
        return Utils.el('div', { className: 'contract-text-content' }, [
            Utils.el('p', {
                textContent: track.description || (track.config && track.config.content) || 'Content to be provided...'
            }),
            (track.config && track.config.requireAcceptance) ?
                Utils.el('div', {
                    style: {
                        marginTop: '8px', fontSize: '11px', color: '#DC2626',
                        fontWeight: '600', textTransform: 'uppercase'
                    },
                    textContent: '\u26A0 Requires buyer acceptance'
                }) : null
        ]);
    },

    renderChecklistSection(track) {
        const list = Utils.el('ul', { className: 'contract-checklist' });
        const items = (track.config && track.config.items) || [];

        items.forEach(item => {
            list.appendChild(Utils.el('li', {}, [
                Utils.el('div', { className: 'contract-checklist-box' }),
                document.createTextNode(item)
            ]));
        });

        return list;
    },

    renderMediaSection(track, type) {
        return Utils.el('div', {
            style: {
                padding: '20px', background: '#F8FAFC', borderRadius: '8px',
                textAlign: 'center', border: '1px dashed #CBD5E1'
            }
        }, [
            Utils.el('div', {
                textContent: track.icon,
                style: { fontSize: '32px', marginBottom: '8px' }
            }),
            Utils.el('p', {
                textContent: track.description,
                style: { color: '#64748B', fontSize: '12px' }
            }),
            Utils.el('p', {
                textContent: `[${type} placeholder]`,
                style: { color: '#94A3B8', fontSize: '11px', marginTop: '4px' }
            })
        ]);
    },

    renderDocumentSection(track) {
        return Utils.el('div', {
            style: {
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px', background: '#F8FAFC', borderRadius: '8px',
                border: '1px solid #E2E8F0'
            }
        }, [
            Utils.el('div', {
                textContent: '\uD83D\uDCC4',
                style: { fontSize: '24px' }
            }),
            Utils.el('div', {}, [
                Utils.el('div', {
                    textContent: track.name,
                    style: { fontWeight: '600', fontSize: '13px' }
                }),
                Utils.el('div', {
                    textContent: (track.config && track.config.fileType) || 'PDF',
                    style: { color: '#94A3B8', fontSize: '11px' }
                })
            ])
        ]);
    },

    renderPricingSummary(pricedBlocks, total) {
        const section = Utils.el('div', { className: 'contract-section' });

        section.appendChild(Utils.el('div', { className: 'contract-section-header' }, [
            Utils.el('div', {
                className: 'contract-section-icon',
                textContent: '\uD83D\uDCB0',
                style: { background: 'rgba(5,150,105,0.1)' }
            }),
            Utils.el('div', {
                className: 'contract-section-title',
                textContent: 'Pricing Summary',
                style: { color: '#059669' }
            })
        ]));

        const table = Utils.el('table', { className: 'contract-pricing-table' });

        // Header
        const thead = Utils.el('thead');
        thead.appendChild(Utils.el('tr', {}, [
            Utils.el('th', { textContent: 'Item' }),
            Utils.el('th', { textContent: 'Type' }),
            Utils.el('th', { textContent: 'Tax' }),
            Utils.el('th', { textContent: 'Amount', style: { textAlign: 'right' } })
        ]));
        table.appendChild(thead);

        // Body
        const tbody = Utils.el('tbody');
        let totalTax = 0;

        pricedBlocks.forEach(block => {
            const taxAmount = block.base_price * (block.tax_rate || 0) / 100;
            totalTax += taxAmount;

            tbody.appendChild(Utils.el('tr', {}, [
                Utils.el('td', { textContent: block.name }),
                Utils.el('td', {
                    textContent: block.type.charAt(0).toUpperCase() + block.type.slice(1),
                    style: { color: '#64748B' }
                }),
                Utils.el('td', {
                    textContent: block.tax_rate > 0 ? `${block.tax_rate}%` : '\u2014',
                    style: { color: '#64748B' }
                }),
                Utils.el('td', {
                    className: 'price-cell',
                    textContent: Utils.formatCurrencyFull(block.base_price, block.currency)
                })
            ]));
        });

        table.appendChild(tbody);
        section.appendChild(table);

        // Total
        section.appendChild(Utils.el('div', { className: 'contract-pricing-total' }, [
            Utils.el('div', {}, [
                Utils.el('div', { className: 'contract-pricing-total-label', textContent: 'Grand Total' }),
                Utils.el('div', {
                    style: { fontSize: '11px', color: '#64748B' },
                    textContent: `Subtotal: ${Utils.formatCurrencyFull(total, 'INR')} + Tax: ${Utils.formatCurrencyFull(Math.round(totalTax), 'INR')}`
                })
            ]),
            Utils.el('div', {
                className: 'contract-pricing-total-amount',
                textContent: Utils.formatCurrencyFull(Math.round(total + totalTax), 'INR')
            })
        ]));

        return section;
    },

    renderSignatures() {
        return Utils.el('div', { className: 'contract-doc-footer' }, [
            Utils.el('div', { className: 'contract-signature-block' }, [
                Utils.el('div', { className: 'contract-signature-label', textContent: 'Service Provider' }),
                Utils.el('div', { className: 'contract-signature-line' }),
                Utils.el('div', { className: 'contract-signature-name', textContent: 'Authorized Signatory' }),
                Utils.el('div', { className: 'contract-signature-date', textContent: 'Date: _______________' })
            ]),
            Utils.el('div', { className: 'contract-signature-block' }, [
                Utils.el('div', { className: 'contract-signature-label', textContent: 'Client / Buyer' }),
                Utils.el('div', { className: 'contract-signature-line' }),
                Utils.el('div', { className: 'contract-signature-name', textContent: 'Customer Name' }),
                Utils.el('div', { className: 'contract-signature-date', textContent: 'Date: _______________' })
            ])
        ]);
    },

    detailItem(label, value) {
        return Utils.el('div', { className: 'contract-detail-item' }, [
            Utils.el('div', { className: 'contract-detail-label', textContent: label }),
            Utils.el('div', { className: 'contract-detail-value', textContent: value })
        ]);
    },

    // ═══════════ MINI PREVIEW (in composer sidebar) ═══════════
    renderMini(tracks) {
        const container = document.getElementById('previewMiniContent');
        if (!container) return;
        container.innerHTML = '';

        const templateName = document.getElementById('templateNameInput')?.value || 'Untitled Template';
        const total = tracks.reduce((sum, t) => sum + (t.base_price || 0), 0);

        const doc = Utils.el('div', { className: 'mini-doc' });

        // Mini header
        doc.appendChild(Utils.el('div', { className: 'mini-doc-header' }, [
            Utils.el('div', { className: 'mini-doc-title', textContent: templateName }),
            Utils.el('div', { className: 'mini-doc-subtitle', textContent: `${tracks.length} blocks` })
        ]));

        // Mini sections
        tracks.forEach(track => {
            const color = Utils.getCategoryColor(track.type);
            const section = Utils.el('div', { className: 'mini-doc-section' }, [
                Utils.el('div', {
                    className: 'mini-doc-section-title',
                    textContent: track.name,
                    style: { color: color }
                }),
                Utils.el('div', { className: 'mini-doc-line medium' }),
                Utils.el('div', { className: 'mini-doc-line short' })
            ]);

            if (track.base_price > 0) {
                section.appendChild(Utils.el('div', { className: 'mini-doc-price-row' }, [
                    Utils.el('span', { textContent: track.type }),
                    Utils.el('span', {
                        textContent: Utils.formatCurrency(track.base_price, track.currency),
                        style: { fontWeight: '600' }
                    })
                ]));
            }

            doc.appendChild(section);
        });

        // Mini total
        if (total > 0) {
            doc.appendChild(Utils.el('div', { className: 'mini-doc-total' }, [
                Utils.el('span', { textContent: 'Total' }),
                Utils.el('span', { textContent: Utils.formatCurrencyFull(total, 'INR') })
            ]));
        }

        container.appendChild(doc);
    }
};
