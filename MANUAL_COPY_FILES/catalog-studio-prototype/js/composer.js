/* ═══════════════════════════════════════════════════
   COMPOSER — Template sequencer / drag-drop engine
   ═══════════════════════════════════════════════════ */

const Composer = {
    tracks: [],
    draggedBlock: null,
    draggedTrackIndex: null,
    activeTemplate: null,

    init() {
        this.renderPalette();
        this.loadTemplate(Data.templates[0]); // Load first template by default
    },

    // ═══════════ PALETTE ═══════════
    renderPalette() {
        const container = document.getElementById('paletteBlocks');
        container.innerHTML = '';

        Data.categories.forEach(cat => {
            const blocks = Data.getBlocksByType(cat.type);
            if (blocks.length === 0) return;

            const category = Utils.el('div', { className: 'palette-category' }, [
                Utils.el('div', { className: 'palette-category-label' }, [
                    Utils.el('span', {
                        className: 'palette-category-dot',
                        style: { background: Utils.getCategoryColor(cat.type) }
                    }),
                    document.createTextNode(cat.label)
                ])
            ]);

            blocks.forEach(block => {
                const item = Utils.el('div', {
                    className: 'palette-block',
                    dataset: { blockId: block.id },
                    draggable: 'true'
                }, [
                    Utils.el('div', {
                        className: 'palette-block-icon',
                        textContent: block.icon,
                        style: { background: Utils.getCategoryBg(block.type) }
                    }),
                    Utils.el('div', { className: 'palette-block-info' }, [
                        Utils.el('div', { className: 'palette-block-name', textContent: block.name }),
                        Utils.el('div', {
                            className: 'palette-block-type',
                            textContent: block.base_price > 0
                                ? Utils.formatCurrency(block.base_price, block.currency)
                                : cat.label
                        })
                    ]),
                    Utils.el('div', {
                        className: 'palette-block-drag',
                        innerHTML: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>'
                    })
                ]);

                // Drag events
                item.addEventListener('dragstart', (e) => {
                    this.draggedBlock = block;
                    e.dataTransfer.effectAllowed = 'copy';
                    item.style.opacity = '0.5';
                });

                item.addEventListener('dragend', () => {
                    item.style.opacity = '1';
                    this.draggedBlock = null;
                });

                // Double-click to add
                item.addEventListener('dblclick', () => {
                    this.addBlock(block);
                });

                category.appendChild(item);
            });

            container.appendChild(category);
        });
    },

    filterPalette(query) {
        const items = document.querySelectorAll('.palette-block');
        const q = query.toLowerCase();

        items.forEach(item => {
            const name = item.querySelector('.palette-block-name').textContent.toLowerCase();
            item.style.display = name.includes(q) ? '' : 'none';
        });

        // Show/hide category labels
        document.querySelectorAll('.palette-category').forEach(cat => {
            const visibleItems = cat.querySelectorAll('.palette-block:not([style*="display: none"])');
            cat.style.display = visibleItems.length > 0 ? '' : 'none';
        });
    },

    // ═══════════ TEMPLATE LOADING ═══════════
    loadTemplate(template) {
        this.activeTemplate = template;
        this.tracks = [];

        document.getElementById('templateNameInput').value = template.name;

        template.blockIds.forEach(blockId => {
            const block = Data.getBlock(blockId);
            if (block) {
                this.tracks.push({ ...block, trackId: Utils.uid() });
            }
        });

        this.renderTracks();
        this.updateSummary();
        Preview.renderMini(this.tracks);
    },

    // ═══════════ TRACK MANAGEMENT ═══════════
    addBlock(block) {
        this.tracks.push({ ...block, trackId: Utils.uid() });
        this.renderTracks();
        this.updateSummary();
        Preview.renderMini(this.tracks);
        Utils.toast(`Added "${block.name}" to template`, 'success');
    },

    removeTrack(index) {
        const removed = this.tracks.splice(index, 1)[0];
        this.renderTracks();
        this.updateSummary();
        Preview.renderMini(this.tracks);
        Utils.toast(`Removed "${removed.name}"`, 'warning');
    },

    moveTrack(fromIndex, toIndex) {
        const [track] = this.tracks.splice(fromIndex, 1);
        this.tracks.splice(toIndex, 0, track);
        this.renderTracks();
        Preview.renderMini(this.tracks);
    },

    // ═══════════ RENDER TRACKS ═══════════
    renderTracks() {
        const container = document.getElementById('timelineTracks');
        container.innerHTML = '';

        const dropzone = document.getElementById('timelineDropzone');
        dropzone.classList.toggle('has-blocks', this.tracks.length > 0);

        this.tracks.forEach((track, index) => {
            const color = Utils.getCategoryColor(track.type);

            const trackEl = Utils.el('div', {
                className: 'track',
                dataset: { index: index.toString(), type: track.type },
                draggable: 'true',
                style: { animationDelay: `${index * 60}ms` }
            }, [
                Utils.el('div', {
                    className: 'track-color-bar',
                    style: { background: color }
                }),
                Utils.el('div', {
                    className: 'track-handle',
                    innerHTML: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>'
                }),
                Utils.el('div', {
                    className: 'track-sequence',
                    textContent: `${(index + 1).toString().padStart(2, '0')}`
                }),
                Utils.el('div', {
                    className: 'track-icon',
                    textContent: track.icon,
                    style: { background: Utils.getCategoryBg(track.type) }
                }),
                Utils.el('div', { className: 'track-content' }, [
                    Utils.el('div', { className: 'track-name', textContent: track.name }),
                    Utils.el('div', {
                        className: 'track-desc',
                        textContent: track.type.charAt(0).toUpperCase() + track.type.slice(1) +
                            (track.config && track.config.duration ? ` \u2022 ${track.config.duration} min` : '')
                    })
                ]),
                track.base_price > 0 ?
                    Utils.el('div', {
                        className: 'track-price',
                        textContent: Utils.formatCurrencyFull(track.base_price, track.currency)
                    }) : Utils.el('div', { className: 'track-price', style: { color: 'var(--text-muted)' }, textContent: '\u2014' }),
                Utils.el('div', { className: 'track-actions' }, [
                    Utils.el('button', {
                        className: 'track-action-btn',
                        title: 'Move up',
                        innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>',
                        onClick: () => { if (index > 0) this.moveTrack(index, index - 1); }
                    }),
                    Utils.el('button', {
                        className: 'track-action-btn',
                        title: 'Move down',
                        innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
                        onClick: () => { if (index < this.tracks.length - 1) this.moveTrack(index, index + 1); }
                    }),
                    Utils.el('button', {
                        className: 'track-action-btn delete',
                        title: 'Remove',
                        innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
                        onClick: () => this.removeTrack(index)
                    })
                ])
            ]);

            // Track drag events (reordering)
            trackEl.addEventListener('dragstart', (e) => {
                this.draggedTrackIndex = index;
                trackEl.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            trackEl.addEventListener('dragend', () => {
                trackEl.classList.remove('dragging');
                this.draggedTrackIndex = null;
                document.querySelectorAll('.track').forEach(t => t.classList.remove('drag-over'));
            });

            trackEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                trackEl.classList.add('drag-over');
            });

            trackEl.addEventListener('dragleave', () => {
                trackEl.classList.remove('drag-over');
            });

            trackEl.addEventListener('drop', (e) => {
                e.preventDefault();
                trackEl.classList.remove('drag-over');

                if (this.draggedTrackIndex !== null) {
                    // Reorder
                    this.moveTrack(this.draggedTrackIndex, index);
                } else if (this.draggedBlock) {
                    // Insert from palette
                    this.tracks.splice(index, 0, { ...this.draggedBlock, trackId: Utils.uid() });
                    this.renderTracks();
                    this.updateSummary();
                    Preview.renderMini(this.tracks);
                    Utils.toast(`Inserted "${this.draggedBlock.name}"`, 'success');
                }
            });

            container.appendChild(trackEl);
        });

        // Setup dropzone drag events
        this.setupDropzone();
    },

    setupDropzone() {
        const dropzone = document.getElementById('timelineDropzone');

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-active');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-active');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-active');

            if (this.draggedBlock) {
                this.addBlock(this.draggedBlock);
            }
        });
    },

    // ═══════════ SUMMARY ═══════════
    updateSummary() {
        // Remove existing summary
        const existing = document.querySelector('.template-summary');
        if (existing) existing.remove();

        if (this.tracks.length === 0) return;

        const total = this.tracks.reduce((sum, t) => sum + (t.base_price || 0), 0);
        const serviceCount = this.tracks.filter(t => t.type === 'service').length;
        const spareCount = this.tracks.filter(t => t.type === 'spare').length;

        const summary = Utils.el('div', { className: 'template-summary' }, [
            Utils.el('span', { className: 'summary-item', innerHTML: `<strong>${this.tracks.length}</strong> blocks` }),
            Utils.el('span', { className: 'summary-item', innerHTML: `<strong>${serviceCount}</strong> services` }),
            Utils.el('span', { className: 'summary-item', innerHTML: `<strong>${spareCount}</strong> spares` }),
            Utils.el('span', {
                className: 'summary-total',
                textContent: `Total: ${Utils.formatCurrencyFull(total, 'INR')}`
            })
        ]);

        document.getElementById('composerTimeline').appendChild(summary);
    }
};
