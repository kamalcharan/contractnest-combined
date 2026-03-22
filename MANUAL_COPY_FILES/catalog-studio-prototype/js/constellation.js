/* ═══════════════════════════════════════════════════
   CONSTELLATION — Spatial block universe with canvas
   ═══════════════════════════════════════════════════ */

const Constellation = {
    canvas: null,
    ctx: null,
    clusters: [],
    lines: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    expandedCluster: null,
    animFrame: null,
    particles: [],

    init() {
        this.canvas = document.getElementById('constellationCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInteraction();
        this.generateClusters();
        this.generateParticles();
        this.render();
        this.renderClusterElements();
    },

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    },

    generateClusters() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Position 8 clusters in a pleasing layout
        const positions = [
            { x: cx - 200, y: cy - 150 }, // service (top-left area)
            { x: cx + 180, y: cy - 130 }, // spare (top-right)
            { x: cx - 280, y: cy + 50 },  // billing (left)
            { x: cx + 260, y: cy + 30 },  // text (right)
            { x: cx - 100, y: cy + 180 }, // video (bottom-left)
            { x: cx + 100, y: cy + 200 }, // image (bottom-right)
            { x: cx - 50, y: cy - 20 },   // checklist (center)
            { x: cx + 40, y: cy + 80 },   // document (center-right)
        ];

        Data.categories.forEach((cat, i) => {
            const blocks = Data.getBlocksByType(cat.type);
            this.clusters.push({
                type: cat.type,
                label: cat.label,
                icon: cat.icon,
                count: blocks.length,
                x: positions[i].x,
                y: positions[i].y,
                blocks: blocks,
                color: Utils.getCategoryColor(cat.type)
            });
        });

        // Generate connection lines between related clusters
        this.lines = [
            [0, 1], // service - spare (often paired)
            [0, 2], // service - billing
            [0, 6], // service - checklist
            [1, 7], // spare - document
            [2, 3], // billing - text
            [4, 5], // video - image
            [6, 7], // checklist - document
        ];
    },

    generateParticles() {
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                opacity: Math.random() * 0.3 + 0.05,
                angle: Math.random() * Math.PI * 2
            });
        }
    },

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(this.pan.x, this.pan.y);
        ctx.scale(this.zoom, this.zoom);

        // Draw particles
        this.particles.forEach(p => {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(124, 58, 237, ${p.opacity})`;
            ctx.fill();
        });

        // Draw connection lines
        this.lines.forEach(([a, b]) => {
            const ca = this.clusters[a];
            const cb = this.clusters[b];
            const gradient = ctx.createLinearGradient(ca.x, ca.y, cb.x, cb.y);
            gradient.addColorStop(0, this.hexToRgba(ca.color, 0.15));
            gradient.addColorStop(1, this.hexToRgba(cb.color, 0.15));

            ctx.beginPath();
            ctx.moveTo(ca.x, ca.y);

            // Subtle curve
            const midX = (ca.x + cb.x) / 2 + (Math.random() - 0.5) * 20;
            const midY = (ca.y + cb.y) / 2 + (Math.random() - 0.5) * 20;
            ctx.quadraticCurveTo(midX, midY, cb.x, cb.y);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Draw cluster glow rings
        this.clusters.forEach(cluster => {
            const time = Date.now() / 1000;
            const pulseSize = 2 + Math.sin(time * 0.8) * 1;

            // Outer glow
            const grad = ctx.createRadialGradient(
                cluster.x, cluster.y, 30,
                cluster.x, cluster.y, 60 + pulseSize * 5
            );
            grad.addColorStop(0, this.hexToRgba(cluster.color, 0.08));
            grad.addColorStop(1, this.hexToRgba(cluster.color, 0));

            ctx.beginPath();
            ctx.arc(cluster.x, cluster.y, 60 + pulseSize * 5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Orbit ring
            ctx.beginPath();
            ctx.arc(cluster.x, cluster.y, 55, 0, Math.PI * 2);
            ctx.strokeStyle = this.hexToRgba(cluster.color, 0.1);
            ctx.lineWidth = 0.5;
            ctx.setLineDash([4, 8]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Orbiting dots (representing blocks)
            cluster.blocks.forEach((block, bi) => {
                const angle = (time * 0.3 + (bi * Math.PI * 2 / cluster.blocks.length));
                const orbitR = 45 + bi * 3;
                const dotX = cluster.x + Math.cos(angle) * orbitR;
                const dotY = cluster.y + Math.sin(angle) * orbitR;
                const dotSize = 3 + (block.base_price / 2000);

                ctx.beginPath();
                ctx.arc(dotX, dotY, Math.min(dotSize, 6), 0, Math.PI * 2);
                ctx.fillStyle = this.hexToRgba(cluster.color, 0.6);
                ctx.fill();
            });
        });

        ctx.restore();
        this.animFrame = requestAnimationFrame(() => this.render());
    },

    renderClusterElements() {
        const container = document.getElementById('constellationClusters');
        container.innerHTML = '';

        this.clusters.forEach((cluster, index) => {
            const el = Utils.el('div', {
                className: 'cluster',
                dataset: { type: cluster.type, index: index.toString() },
                style: {
                    left: `${cluster.x - 40}px`,
                    top: `${cluster.y - 40}px`,
                    animationDelay: `${index * 100}ms`
                },
                onClick: () => this.toggleCluster(index)
            }, [
                Utils.el('div', { className: 'cluster-core' }, [
                    Utils.el('div', {
                        className: 'cluster-icon',
                        textContent: cluster.icon
                    })
                ]),
                Utils.el('span', {
                    className: 'cluster-label',
                    textContent: cluster.label
                }),
                Utils.el('span', {
                    className: 'cluster-count',
                    textContent: `${cluster.count} blocks`
                }),
                this.createExpandedList(cluster)
            ]);

            container.appendChild(el);
        });
    },

    createExpandedList(cluster) {
        const list = Utils.el('div', { className: 'cluster-expanded-blocks' });

        cluster.blocks.forEach(block => {
            const item = Utils.el('div', {
                className: 'cluster-block-item',
                onClick: (e) => {
                    e.stopPropagation();
                    Wizard.openEdit(block);
                }
            }, [
                Utils.el('div', {
                    className: 'cluster-block-icon',
                    textContent: block.icon,
                    style: { background: Utils.getCategoryBg(block.type) }
                }),
                Utils.el('div', { className: 'cluster-block-info' }, [
                    Utils.el('div', { className: 'cluster-block-name', textContent: block.name }),
                    Utils.el('div', {
                        className: 'cluster-block-price',
                        textContent: block.base_price > 0
                            ? Utils.formatCurrency(block.base_price, block.currency) + Utils.getPriceTypeLabel(block.price_type)
                            : 'No price'
                    })
                ])
            ]);
            list.appendChild(item);
        });

        return list;
    },

    toggleCluster(index) {
        const clusters = document.querySelectorAll('.cluster');

        if (this.expandedCluster === index) {
            clusters[index].classList.remove('expanded');
            this.expandedCluster = null;
        } else {
            clusters.forEach(c => c.classList.remove('expanded'));
            clusters[index].classList.add('expanded');
            this.expandedCluster = index;
        }
    },

    // ── Controls ──
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 3);
        this.updateClusterPositions();
    },

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.4);
        this.updateClusterPositions();
    },

    reset() {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.updateClusterPositions();
    },

    updateClusterPositions() {
        const container = document.getElementById('constellationClusters');
        container.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    },

    // ── Interaction ──
    setupInteraction() {
        const view = document.getElementById('view-constellation');

        view.addEventListener('mousedown', (e) => {
            if (e.target.closest('.cluster')) return;
            this.isDragging = true;
            this.dragStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
        });

        view.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.pan.x = e.clientX - this.dragStart.x;
            this.pan.y = e.clientY - this.dragStart.y;
            this.updateClusterPositions();
        });

        view.addEventListener('mouseup', () => { this.isDragging = false; });
        view.addEventListener('mouseleave', () => { this.isDragging = false; });

        view.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) this.zoomIn();
            else this.zoomOut();
        }, { passive: false });
    },

    // ── Helpers ──
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    destroy() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
    }
};
