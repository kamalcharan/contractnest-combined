/* ═══════════════════════════════════════════════════
   DATA — Dummy blocks, templates, categories
   ═══════════════════════════════════════════════════ */

const Data = {

    categories: [
        { type: 'service',   label: 'Service',   icon: '\u2699\uFE0F',       count: 8 },
        { type: 'spare',     label: 'Spare',      icon: '\uD83D\uDD27',      count: 5 },
        { type: 'billing',   label: 'Billing',    icon: '\uD83D\uDCB3',      count: 4 },
        { type: 'text',      label: 'Text',       icon: '\uD83D\uDCDD',      count: 3 },
        { type: 'video',     label: 'Video',      icon: '\uD83C\uDFA5',      count: 2 },
        { type: 'image',     label: 'Image',      icon: '\uD83D\uDDBC\uFE0F',count: 2 },
        { type: 'checklist', label: 'Checklist',  icon: '\u2705',            count: 3 },
        { type: 'document',  label: 'Document',   icon: '\uD83D\uDCC4',      count: 2 }
    ],

    blocks: [
        // ── Services ──
        {
            id: 'svc-001', type: 'service', name: 'AC Deep Clean Service',
            icon: '\u2744\uFE0F', description: 'Complete deep cleaning of split/window AC unit with chemical wash',
            base_price: 2499, currency: 'INR', price_type: 'per_unit', tax_rate: 18,
            pricing_mode: 'variant_based', status: 'active',
            config: { duration: 120, location: 'on-site', requirePhoto: true, requireSignature: true, requireGPS: true },
            tags: ['ac', 'cleaning', 'home']
        },
        {
            id: 'svc-002', type: 'service', name: 'Yoga Session',
            icon: '\uD83E\uDDD8', description: 'One-on-one yoga training session with certified instructor',
            base_price: 800, currency: 'INR', price_type: 'per_session', tax_rate: 18,
            pricing_mode: 'resource_based', status: 'active',
            config: { duration: 60, location: 'hybrid', requirePhoto: false, requireSignature: true },
            tags: ['fitness', 'yoga', 'wellness']
        },
        {
            id: 'svc-003', type: 'service', name: 'Plumbing Repair',
            icon: '\uD83D\uDEB0', description: 'General plumbing repair including pipe fixing, tap replacement',
            base_price: 599, currency: 'INR', price_type: 'per_visit', tax_rate: 18,
            pricing_mode: 'independent', status: 'active',
            config: { duration: 90, location: 'on-site', requirePhoto: true, requireGPS: true, requireOTP: true },
            tags: ['plumbing', 'repair', 'home']
        },
        {
            id: 'svc-004', type: 'service', name: 'Interior Consultation',
            icon: '\uD83C\uDFE0', description: 'Professional interior design consultation for home or office',
            base_price: 3500, currency: 'INR', price_type: 'per_session', tax_rate: 18,
            pricing_mode: 'resource_based', status: 'active',
            config: { duration: 180, location: 'on-site', requirePhoto: true, requireSignature: true },
            tags: ['interior', 'design', 'consultation']
        },
        {
            id: 'svc-005', type: 'service', name: 'Car Detailing',
            icon: '\uD83D\uDE97', description: 'Full car detailing with exterior wash, interior vacuum and polish',
            base_price: 1999, currency: 'INR', price_type: 'per_unit', tax_rate: 18,
            pricing_mode: 'variant_based', status: 'draft',
            config: { duration: 150, location: 'on-site', requirePhoto: true, requireSignature: true, requireGPS: true },
            tags: ['automotive', 'detailing']
        },
        {
            id: 'svc-006', type: 'service', name: 'Pest Control Treatment',
            icon: '\uD83D\uDC1B', description: 'Professional pest control for cockroaches, ants, and general pests',
            base_price: 1499, currency: 'INR', price_type: 'per_visit', tax_rate: 18,
            pricing_mode: 'variant_based', status: 'active',
            config: { duration: 60, location: 'on-site', requirePhoto: true, requireSignature: true, requireOTP: true },
            tags: ['pest', 'hygiene', 'home']
        },
        {
            id: 'svc-007', type: 'service', name: 'Photography Session',
            icon: '\uD83D\uDCF7', description: 'Professional photography session for events, portraits or products',
            base_price: 5000, currency: 'INR', price_type: 'per_session', tax_rate: 18,
            pricing_mode: 'resource_based', status: 'active',
            config: { duration: 240, location: 'hybrid', requirePhoto: false, requireSignature: true },
            tags: ['photography', 'creative']
        },
        {
            id: 'svc-008', type: 'service', name: 'Electrical Inspection',
            icon: '\u26A1', description: 'Complete electrical safety inspection and report',
            base_price: 999, currency: 'INR', price_type: 'per_visit', tax_rate: 18,
            pricing_mode: 'independent', status: 'active',
            config: { duration: 90, location: 'on-site', requirePhoto: true, requireGPS: true, requireSignature: true, requireOTP: true },
            tags: ['electrical', 'safety', 'inspection']
        },

        // ── Spares ──
        {
            id: 'spr-001', type: 'spare', name: 'AC Filter (Split)',
            icon: '\uD83D\uDCA8', description: 'High-quality replacement filter for split AC units',
            base_price: 450, currency: 'INR', price_type: 'per_unit', tax_rate: 18,
            pricing_mode: 'independent', status: 'active',
            config: { sku: 'ACF-SPL-001', trackInventory: true, reorderLevel: 10 },
            tags: ['ac', 'filter', 'spare']
        },
        {
            id: 'spr-002', type: 'spare', name: 'Refrigerant Gas R32',
            icon: '\uD83E\uDDEA', description: 'R32 refrigerant gas for AC recharge (per unit)',
            base_price: 1200, currency: 'INR', price_type: 'per_unit', tax_rate: 18,
            pricing_mode: 'independent', status: 'active',
            config: { sku: 'REF-R32-001', trackInventory: true, reorderLevel: 5 },
            tags: ['ac', 'refrigerant', 'gas']
        },
        {
            id: 'spr-003', type: 'spare', name: 'Drain Pipe (6ft)',
            icon: '\uD83D\uDEB0', description: 'PVC drain pipe for AC or plumbing, 6ft length',
            base_price: 180, currency: 'INR', price_type: 'per_unit', tax_rate: 18,
            pricing_mode: 'independent', status: 'active',
            config: { sku: 'DRP-PVC-006', trackInventory: true, reorderLevel: 20 },
            tags: ['pipe', 'plumbing', 'spare']
        },
        {
            id: 'spr-004', type: 'spare', name: 'Car Wax Polish',
            icon: '\u2728', description: 'Premium car wax polish, 500ml bottle',
            base_price: 650, currency: 'INR', price_type: 'per_unit', tax_rate: 18,
            pricing_mode: 'independent', status: 'active',
            config: { sku: 'CWP-PRE-500', trackInventory: true, reorderLevel: 15 },
            tags: ['automotive', 'polish']
        },
        {
            id: 'spr-005', type: 'spare', name: 'LED Bulb 9W',
            icon: '\uD83D\uDCA1', description: 'Energy efficient LED bulb, 9W warm white',
            base_price: 120, currency: 'INR', price_type: 'per_unit', tax_rate: 18,
            pricing_mode: 'independent', status: 'draft',
            config: { sku: 'LED-9W-WW', trackInventory: true, reorderLevel: 50 },
            tags: ['electrical', 'bulb', 'led']
        },

        // ── Billing ──
        {
            id: 'bil-001', type: 'billing', name: '100% Advance Payment',
            icon: '\uD83D\uDCB0', description: 'Full payment required before service commencement',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { paymentType: 'lump_sum', autoInvoice: true },
            tags: ['advance', 'payment']
        },
        {
            id: 'bil-002', type: 'billing', name: '50-50 Milestone',
            icon: '\uD83C\uDFAF', description: '50% advance, 50% on completion milestone',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { paymentType: 'milestone', installments: 2, autoInvoice: true },
            tags: ['milestone', 'payment']
        },
        {
            id: 'bil-003', type: 'billing', name: '3-Month EMI',
            icon: '\uD83D\uDCC5', description: 'Easy monthly installments over 3 months',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { paymentType: 'emi', installments: 3, autoInvoice: true },
            tags: ['emi', 'installment']
        },
        {
            id: 'bil-004', type: 'billing', name: 'Pay on Delivery',
            icon: '\uD83D\uDCE6', description: 'Payment collected on service/product delivery',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { paymentType: 'on_delivery', autoInvoice: false },
            tags: ['delivery', 'payment']
        },

        // ── Text ──
        {
            id: 'txt-001', type: 'text', name: 'Standard Terms & Conditions',
            icon: '\uD83D\uDCDC', description: 'General terms and conditions for service contracts',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { content: 'Standard T&C content...', requireAcceptance: true },
            tags: ['legal', 'terms']
        },
        {
            id: 'txt-002', type: 'text', name: 'Cancellation Policy',
            icon: '\u274C', description: 'Service cancellation and refund policy',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { content: 'Cancellation policy content...', requireAcceptance: false },
            tags: ['policy', 'cancellation']
        },
        {
            id: 'txt-003', type: 'text', name: 'Warranty Terms',
            icon: '\uD83D\uDEE1\uFE0F', description: 'Warranty coverage details and claim process',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { content: 'Warranty terms content...', requireAcceptance: true },
            tags: ['warranty', 'terms']
        },

        // ── Video ──
        {
            id: 'vid-001', type: 'video', name: 'Welcome & Service Overview',
            icon: '\uD83C\uDF1F', description: 'Introduction video explaining service process and expectations',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { url: 'https://example.com/video1', duration: 180 },
            tags: ['intro', 'welcome']
        },
        {
            id: 'vid-002', type: 'video', name: 'AC Maintenance Guide',
            icon: '\uD83D\uDCFA', description: 'Video guide on AC maintenance tips for customers',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { url: 'https://example.com/video2', duration: 300 },
            tags: ['guide', 'ac', 'maintenance']
        },

        // ── Image ──
        {
            id: 'img-001', type: 'image', name: 'Service Brochure',
            icon: '\uD83D\uDDBC\uFE0F', description: 'Company service brochure with pricing overview',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { altText: 'Service Brochure' },
            tags: ['brochure', 'marketing']
        },
        {
            id: 'img-002', type: 'image', name: 'Team Photo',
            icon: '\uD83D\uDC65', description: 'Professional team photo for customer trust',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { altText: 'Our Team' },
            tags: ['team', 'trust']
        },

        // ── Checklist ──
        {
            id: 'chk-001', type: 'checklist', name: 'Pre-Service Checklist',
            icon: '\uD83D\uDCCB', description: 'Items to verify before starting service',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { items: ['Check equipment condition', 'Verify customer identity', 'Confirm service scope', 'Take before photos'] },
            tags: ['pre-service', 'checklist']
        },
        {
            id: 'chk-002', type: 'checklist', name: 'Post-Service Quality Check',
            icon: '\u2705', description: 'Quality verification items after service completion',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { items: ['Service completed as described', 'Area cleaned up', 'Customer walkthrough done', 'After photos taken', 'Customer signed off'] },
            tags: ['post-service', 'quality']
        },
        {
            id: 'chk-003', type: 'checklist', name: 'Safety Inspection Points',
            icon: '\u26A0\uFE0F', description: 'Safety checklist for electrical/plumbing work',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { items: ['Power supply isolated', 'PPE worn', 'Fire extinguisher nearby', 'Area cordoned off'] },
            tags: ['safety', 'inspection']
        },

        // ── Document ──
        {
            id: 'doc-001', type: 'document', name: 'Service Certificate',
            icon: '\uD83C\uDF93', description: 'Certificate of service completion',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { fileType: 'PDF', autoGenerate: true },
            tags: ['certificate', 'completion']
        },
        {
            id: 'doc-002', type: 'document', name: 'Insurance Document',
            icon: '\uD83D\uDCC3', description: 'Service liability insurance documentation',
            base_price: 0, currency: 'INR', price_type: 'fixed', tax_rate: 0,
            pricing_mode: 'independent', status: 'active',
            config: { fileType: 'PDF' },
            tags: ['insurance', 'legal']
        }
    ],

    templates: [
        {
            id: 'tpl-001',
            name: 'Premium AC Service Package',
            description: 'Complete AC servicing with deep clean, spare parts, and warranty',
            status: 'active',
            blockIds: ['svc-001', 'spr-001', 'spr-002', 'chk-001', 'bil-002', 'txt-001', 'chk-002', 'doc-001'],
            createdAt: '2025-12-15'
        },
        {
            id: 'tpl-002',
            name: 'Home Plumbing Repair',
            description: 'Standard plumbing repair with safety checks and terms',
            status: 'active',
            blockIds: ['svc-003', 'spr-003', 'chk-003', 'bil-001', 'txt-001', 'txt-002', 'chk-002', 'doc-001'],
            createdAt: '2026-01-10'
        },
        {
            id: 'tpl-003',
            name: 'Yoga Wellness Program',
            description: '3-month yoga training program with EMI payment',
            status: 'draft',
            blockIds: ['svc-002', 'vid-001', 'bil-003', 'txt-001', 'doc-001'],
            createdAt: '2026-02-20'
        },
        {
            id: 'tpl-004',
            name: 'Car Detailing Gold',
            description: 'Premium car detailing with wax polish and certificate',
            status: 'active',
            blockIds: ['svc-005', 'spr-004', 'chk-001', 'bil-001', 'img-001', 'txt-001', 'chk-002', 'doc-001'],
            createdAt: '2026-03-01'
        }
    ],

    // ── Helper Methods ──
    getBlock(id) {
        return this.blocks.find(b => b.id === id);
    },

    getBlocksByType(type) {
        return this.blocks.filter(b => b.type === type);
    },

    getTemplateBlocks(templateId) {
        const tpl = this.templates.find(t => t.id === templateId);
        if (!tpl) return [];
        return tpl.blockIds.map(id => this.getBlock(id)).filter(Boolean);
    },

    getTemplateTotal(templateId) {
        const blocks = this.getTemplateBlocks(templateId);
        return blocks.reduce((sum, b) => sum + (b.base_price || 0), 0);
    },

    searchBlocks(query) {
        const q = query.toLowerCase();
        return this.blocks.filter(b =>
            b.name.toLowerCase().includes(q) ||
            b.description.toLowerCase().includes(q) ||
            b.type.toLowerCase().includes(q) ||
            (b.tags && b.tags.some(t => t.includes(q)))
        );
    }
};
