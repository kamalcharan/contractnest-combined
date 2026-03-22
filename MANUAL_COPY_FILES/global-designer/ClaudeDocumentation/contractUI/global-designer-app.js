/* ═══════════════════════════════════════════════════════════════
   GLOBAL TEMPLATE DESIGNER - APPLICATION LOGIC
   ContractNest | Interactive Prototype
   ═══════════════════════════════════════════════════════════════ */

// ── Healthcare Block Data ──
const HEALTHCARE_BLOCKS = {
  services: [
    { id: 's1', type: 'service', icon: '🩺', name: 'General Consultation', desc: 'OPD doctor consultation', price: 500, priceType: 'per_session', pricingMode: 'resource_based' },
    { id: 's2', type: 'service', icon: '🧪', name: 'Lab Test Panel', desc: 'Blood work & diagnostics', price: 1200, priceType: 'per_test', pricingMode: 'variant_based' },
    { id: 's3', type: 'service', icon: '💉', name: 'Vaccination', desc: 'Immunization administration', price: 350, priceType: 'per_dose', pricingMode: 'independent' },
    { id: 's4', type: 'service', icon: '🫀', name: 'Cardiac Screening', desc: 'ECG + Echo + Stress test', price: 3500, priceType: 'per_session', pricingMode: 'independent' },
    { id: 's5', type: 'service', icon: '🦷', name: 'Dental Cleaning', desc: 'Professional teeth cleaning', price: 800, priceType: 'per_session', pricingMode: 'independent' },
    { id: 's6', type: 'service', icon: '👁️', name: 'Eye Examination', desc: 'Comprehensive vision test', price: 600, priceType: 'per_session', pricingMode: 'resource_based' },
  ],
  spares: [
    { id: 'sp1', type: 'spare', icon: '💊', name: 'Medication Kit', desc: 'Prescribed medicine package', price: 450, sku: 'MED-KIT-001' },
    { id: 'sp2', type: 'spare', icon: '🩹', name: 'First Aid Supplies', desc: 'Bandages, antiseptics', price: 250, sku: 'FA-SUP-001' },
    { id: 'sp3', type: 'spare', icon: '🧴', name: 'Sanitization Kit', desc: 'PPE and hygiene supplies', price: 180, sku: 'SAN-KIT-001' },
  ],
  billing: [
    { id: 'b1', type: 'billing', icon: '💳', name: 'Monthly Health Plan', desc: 'EMI payment schedule', price: null, schedule: '12 months' },
    { id: 'b2', type: 'billing', icon: '🏦', name: 'Insurance Co-pay', desc: 'Insurance settlement billing', price: null, schedule: 'Per claim' },
  ],
  content: [
    { id: 't1', type: 'text', icon: '📝', name: 'Patient Instructions', desc: 'Pre/post procedure guidelines', price: null },
    { id: 't2', type: 'text', icon: '📋', name: 'Consent Form', desc: 'Patient consent agreement', price: null },
    { id: 'v1', type: 'video', icon: '🎥', name: 'Procedure Walkthrough', desc: 'Patient education video', price: null },
    { id: 'i1', type: 'image', icon: '🖼️', name: 'Facility Tour', desc: 'Hospital wing photographs', price: null },
  ],
  compliance: [
    { id: 'c1', type: 'checklist', icon: '✅', name: 'Pre-Op Checklist', desc: 'Mandatory pre-surgery steps', price: null, items: 8 },
    { id: 'c2', type: 'checklist', icon: '📊', name: 'Discharge Protocol', desc: 'Post-treatment verification', price: null, items: 12 },
    { id: 'd1', type: 'document', icon: '📄', name: 'Medical Records', desc: 'Patient history documents', price: null },
    { id: 'd2', type: 'document', icon: '📑', name: 'Insurance Papers', desc: 'Claim & coverage docs', price: null },
  ]
};

// ── Template Sections (Canvas) ──
const TEMPLATE_SECTIONS = [
  {
    id: 'sec-services',
    title: 'Medical Services',
    icon: '🏥',
    blocks: ['s1', 's2', 's4']
  },
  {
    id: 'sec-supplies',
    title: 'Supplies & Materials',
    icon: '📦',
    blocks: ['sp1', 'sp2']
  },
  {
    id: 'sec-compliance',
    title: 'Compliance & Documentation',
    icon: '📋',
    blocks: ['c1', 't1', 'd1']
  },
  {
    id: 'sec-billing',
    title: 'Payment & Billing',
    icon: '💳',
    blocks: ['b1']
  }
];

// ── Version History ──
const VERSION_HISTORY = [
  { version: 1, date: 'Jan 15', label: 'Initial draft', changes: 3 },
  { version: 2, date: 'Feb 02', label: 'Added lab tests', changes: 5 },
  { version: 3, date: 'Mar 10', label: 'Insurance billing', changes: 2 },
  { version: 4, date: 'Mar 22', label: 'Current version', changes: 0 },
];

// ── Analytics Data (Aspirational) ──
const ANALYTICS_DATA = {
  's1': { views: 1240, acceptance: 87, avgTime: '12s', heat: 'hot' },
  's2': { views: 980, acceptance: 72, avgTime: '18s', heat: 'warm' },
  's4': { views: 560, acceptance: 45, avgTime: '32s', heat: 'cool' },
  'sp1': { views: 890, acceptance: 91, avgTime: '5s', heat: 'hot' },
  'sp2': { views: 430, acceptance: 68, avgTime: '8s', heat: 'warm' },
  'c1': { views: 1100, acceptance: 95, avgTime: '22s', heat: 'hot' },
  't1': { views: 720, acceptance: 80, avgTime: '45s', heat: 'warm' },
  'd1': { views: 340, acceptance: 55, avgTime: '15s', heat: 'cool' },
  'b1': { views: 1050, acceptance: 78, avgTime: '28s', heat: 'warm' },
};

// ── Command Palette Items ──
const COMMAND_ITEMS = [
  { group: 'Add Block', items: [
    { icon: '🩺', name: 'Add Service Block', desc: 'New medical service', action: 'add-service', shortcut: 'S' },
    { icon: '📦', name: 'Add Spare Block', desc: 'Supplies & materials', action: 'add-spare', shortcut: 'P' },
    { icon: '💳', name: 'Add Billing Block', desc: 'Payment schedule', action: 'add-billing', shortcut: 'B' },
    { icon: '📝', name: 'Add Text Block', desc: 'Content & instructions', action: 'add-text', shortcut: 'T' },
    { icon: '🎥', name: 'Add Video Block', desc: 'Media embed', action: 'add-video', shortcut: 'V' },
    { icon: '✅', name: 'Add Checklist Block', desc: 'Task checklist', action: 'add-checklist', shortcut: 'C' },
    { icon: '📄', name: 'Add Document Block', desc: 'File attachment', action: 'add-doc', shortcut: 'D' },
  ]},
  { group: 'Template', items: [
    { icon: '💾', name: 'Save Template', desc: 'Save current state', action: 'save', shortcut: '⌘S' },
    { icon: '📋', name: 'Duplicate Template', desc: 'Create a copy', action: 'duplicate', shortcut: '⌘D' },
    { icon: '👁️', name: 'Toggle Buyer Preview', desc: 'Show/hide preview panel', action: 'toggle-preview', shortcut: '⌘P' },
    { icon: '📊', name: 'Toggle Analytics', desc: 'Show engagement heatmap', action: 'toggle-analytics', shortcut: '⌘A' },
    { icon: '🔄', name: 'Reset Zoom', desc: 'Reset canvas to 100%', action: 'reset-zoom', shortcut: '⌘0' },
  ]},
  { group: 'Settings', items: [
    { icon: '🏷️', name: 'Edit Template Name', desc: 'Rename this template', action: 'rename' },
    { icon: '🏥', name: 'Change Industry', desc: 'Switch industry preset', action: 'change-industry' },
    { icon: '💱', name: 'Set Currency', desc: 'Change pricing currency', action: 'set-currency' },
  ]},
];

// ── Industry Presets ──
const INDUSTRY_PRESETS = [
  { id: 'healthcare', icon: '🏥', name: 'Healthcare', active: true },
  { id: 'hvac', icon: '❄️', name: 'HVAC Services', active: false },
  { id: 'property', icon: '🏠', name: 'Property Management', active: false },
  { id: 'automotive', icon: '🚗', name: 'Automotive', active: false },
  { id: 'education', icon: '🎓', name: 'Education', active: false },
  { id: 'legal', icon: '⚖️', name: 'Legal Services', active: false },
];

// ══════════════════════════════════════
// APPLICATION STATE
// ══════════════════════════════════════

const state = {
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStart: { x: 0, y: 0 },
  selectedBlock: null,
  analyticsVisible: false,
  commandPaletteOpen: false,
  industryDropdownOpen: false,
  currentVersion: 4,
  searchQuery: '',
};

// ══════════════════════════════════════
// HELPER: Get all blocks flat
// ══════════════════════════════════════

function getAllBlocks() {
  const all = {};
  Object.values(HEALTHCARE_BLOCKS).forEach(category => {
    category.forEach(block => { all[block.id] = block; });
  });
  return all;
}

const ALL_BLOCKS = getAllBlocks();

// ══════════════════════════════════════
// RENDER: Block Library
// ══════════════════════════════════════

function renderBlockLibrary() {
  const container = document.getElementById('blockList');
  if (!container) return;

  const categories = [
    { key: 'services', label: 'Services', type: 'service' },
    { key: 'spares', label: 'Supplies', type: 'spare' },
    { key: 'billing', label: 'Billing', type: 'billing' },
    { key: 'content', label: 'Content & Media', type: 'text' },
    { key: 'compliance', label: 'Compliance', type: 'checklist' },
  ];

  let html = '';
  categories.forEach(cat => {
    const blocks = HEALTHCARE_BLOCKS[cat.key];
    const filtered = state.searchQuery
      ? blocks.filter(b => b.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || b.desc.toLowerCase().includes(state.searchQuery.toLowerCase()))
      : blocks;

    if (filtered.length === 0 && state.searchQuery) return;

    html += `
      <div class="block-category" data-category="${cat.key}">
        <div class="block-category__header" onclick="toggleCategory('${cat.key}')">
          <span class="block-category__title">${cat.label} (${filtered.length})</span>
          <svg class="block-category__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="block-category__items">
          ${filtered.map(block => `
            <div class="block-item block-item--${block.type}" data-block-id="${block.id}" onclick="addBlockToCanvas('${block.id}')">
              <div class="block-item__icon">${block.icon}</div>
              <div class="block-item__info">
                <div class="block-item__name">${block.name}</div>
                <div class="block-item__desc">${block.desc}</div>
              </div>
              <button class="block-item__add" title="Add to canvas" onclick="event.stopPropagation(); addBlockToCanvas('${block.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ══════════════════════════════════════
// RENDER: Canvas
// ══════════════════════════════════════

function renderCanvas() {
  const container = document.getElementById('canvasContent');
  if (!container) return;

  let html = '';

  TEMPLATE_SECTIONS.forEach((section, sIdx) => {
    const sectionBlocks = section.blocks.map(id => ALL_BLOCKS[id]).filter(Boolean);

    html += `
      <div class="canvas-section animate-in" data-section="${section.id}" style="animation-delay: ${sIdx * 0.08}s">
        <div class="canvas-section__header" onclick="toggleSection('${section.id}')">
          <div class="canvas-section__header-left">
            <span class="canvas-section__icon">${section.icon}</span>
            <span class="canvas-section__title">${section.title}</span>
            <span class="canvas-section__count">${sectionBlocks.length} blocks</span>
          </div>
          <div class="canvas-section__actions">
            <button class="btn btn--icon" title="Add block" onclick="event.stopPropagation(); openCommandPalette()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="btn btn--icon" title="Section settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
        </div>
        <div class="canvas-section__body" data-section-body="${section.id}">
          ${sectionBlocks.map((block, bIdx) => renderCanvasBlock(block, sIdx, bIdx)).join('')}
          <div class="drop-zone" onclick="openCommandPalette()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Drop block here or press <kbd>/</kbd></span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderCanvasBlock(block, sIdx, bIdx) {
  const isSelected = state.selectedBlock === block.id;
  const priceDisplay = block.price ? `₹${block.price.toLocaleString()}` : '—';
  const typeLabel = block.type.charAt(0).toUpperCase() + block.type.slice(1);

  return `
    <div class="canvas-block canvas-block--${block.type} ${isSelected ? 'selected' : ''} animate-in"
         data-block-id="${block.id}"
         onclick="selectBlock('${block.id}')"
         style="animation-delay: ${(sIdx * 0.08) + (bIdx * 0.05)}s">
      <div class="canvas-block__stripe"></div>
      <div class="canvas-block__drag-handle">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </div>
      <div class="canvas-block__content">
        <div class="canvas-block__icon">${block.icon}</div>
        <div class="canvas-block__info">
          <div class="canvas-block__name">${block.name}</div>
          <div class="canvas-block__desc">${block.desc}</div>
        </div>
      </div>
      <div class="canvas-block__meta">
        ${block.price ? `<span class="canvas-block__price">${priceDisplay}</span>` : ''}
        <span class="canvas-block__tag">${typeLabel}</span>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════
// RENDER: Buyer Preview
// ══════════════════════════════════════

function renderBuyerPreview() {
  const container = document.getElementById('phoneContent');
  if (!container) return;

  // Calculate totals from canvas blocks
  let subtotal = 0;
  const previewBlocks = [];

  TEMPLATE_SECTIONS.forEach(section => {
    section.blocks.forEach(id => {
      const block = ALL_BLOCKS[id];
      if (block) {
        previewBlocks.push({ ...block, section: section.title });
        if (block.price) subtotal += block.price;
      }
    });
  });

  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;

  let html = `
    <div class="p-header">
      <div class="p-header__company">HealthFirst Clinic</div>
      <div class="p-header__title">Comprehensive Health Package</div>
      <div class="p-header__subtitle">Valid for 12 months</div>
    </div>
  `;

  // Group by section
  const grouped = {};
  previewBlocks.forEach(b => {
    if (!grouped[b.section]) grouped[b.section] = [];
    grouped[b.section].push(b);
  });

  Object.entries(grouped).forEach(([section, blocks]) => {
    html += `<div class="p-section"><div class="p-section__title">${section}</div>`;
    blocks.forEach(block => {
      html += `
        <div class="p-card">
          <div class="p-card__row">
            <span class="p-card__name">${block.icon} ${block.name}</span>
            ${block.price ? `<span class="p-card__price">₹${block.price.toLocaleString()}</span>` : ''}
          </div>
          <div class="p-card__desc">${block.desc}</div>
          <span class="p-card__tag">${block.type}</span>
        </div>
      `;
    });
    html += `</div>`;
  });

  html += `
    <div class="p-total">
      <div class="p-total__row"><span>Subtotal</span><span>₹${subtotal.toLocaleString()}</span></div>
      <div class="p-total__row"><span>GST (18%)</span><span>₹${tax.toLocaleString()}</span></div>
      <div class="p-total__row p-total__row--final"><span>Total</span><span>₹${total.toLocaleString()}</span></div>
    </div>
    <button class="p-accept-btn">Accept & Sign ✍️</button>
  `;

  container.innerHTML = html;
}

// ══════════════════════════════════════
// RENDER: Version Timeline
// ══════════════════════════════════════

function renderVersionTimeline() {
  const dotsContainer = document.getElementById('versionDots');
  const versionInfo = document.getElementById('versionInfo');
  if (!dotsContainer) return;

  dotsContainer.innerHTML = VERSION_HISTORY.map(v => `
    <div class="version-dot ${v.version === state.currentVersion ? 'active' : ''}"
         onclick="setVersion(${v.version})">
      <div class="version-dot__tooltip">v${v.version} · ${v.date} · ${v.label}</div>
    </div>
  `).join('');

  const current = VERSION_HISTORY.find(v => v.version === state.currentVersion);
  if (versionInfo && current) {
    versionInfo.innerHTML = `<span class="version-timeline__version">v${current.version}</span> · ${current.label}`;
  }
}

// ══════════════════════════════════════
// RENDER: Command Palette
// ══════════════════════════════════════

function renderCommandPalette(filter = '') {
  const list = document.getElementById('commandList');
  if (!list) return;

  let html = '';
  COMMAND_ITEMS.forEach(group => {
    const filtered = filter
      ? group.items.filter(item => item.name.toLowerCase().includes(filter.toLowerCase()) || item.desc.toLowerCase().includes(filter.toLowerCase()))
      : group.items;

    if (filtered.length === 0) return;

    html += `<div class="command-palette__group-title">${group.group}</div>`;
    filtered.forEach((item, idx) => {
      html += `
        <div class="command-palette__item ${idx === 0 && !filter ? 'highlighted' : ''}"
             onclick="executeCommand('${item.action}')">
          <div class="command-palette__item-icon">${item.icon}</div>
          <div class="command-palette__item-text">
            <div class="command-palette__item-name">${item.name}</div>
            <div class="command-palette__item-desc">${item.desc}</div>
          </div>
          ${item.shortcut ? `<span class="command-palette__item-shortcut">${item.shortcut}</span>` : ''}
        </div>
      `;
    });
  });

  list.innerHTML = html;
}

// ══════════════════════════════════════
// RENDER: Industry Dropdown
// ══════════════════════════════════════

function renderIndustryDropdown() {
  const container = document.getElementById('industryDropdown');
  if (!container) return;

  container.innerHTML = INDUSTRY_PRESETS.map(p => `
    <div class="industry-dropdown__item ${p.active ? 'active' : ''}" onclick="selectIndustry('${p.id}')">
      <span>${p.icon}</span>
      <span>${p.name}</span>
    </div>
  `).join('');
}

// ══════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════

function toggleCategory(key) {
  const cat = document.querySelector(`[data-category="${key}"]`);
  if (cat) cat.classList.toggle('collapsed');
}

function toggleSection(id) {
  const section = document.querySelector(`[data-section="${id}"]`);
  const body = section?.querySelector('.canvas-section__body');
  if (body) {
    body.style.display = body.style.display === 'none' ? 'flex' : 'none';
  }
}

function selectBlock(id) {
  state.selectedBlock = state.selectedBlock === id ? null : id;
  // Re-render canvas to show selection
  document.querySelectorAll('.canvas-block').forEach(el => {
    el.classList.toggle('selected', el.dataset.blockId === state.selectedBlock);
  });
  showToast(`Selected: ${ALL_BLOCKS[id]?.name || id}`, 'info');
}

function addBlockToCanvas(blockId) {
  const block = ALL_BLOCKS[blockId];
  if (!block) return;

  // Determine which section to add to based on block type
  let targetSection;
  switch (block.type) {
    case 'service': targetSection = 'sec-services'; break;
    case 'spare': targetSection = 'sec-supplies'; break;
    case 'billing': targetSection = 'sec-billing'; break;
    default: targetSection = 'sec-compliance'; break;
  }

  const section = TEMPLATE_SECTIONS.find(s => s.id === targetSection);
  if (section && !section.blocks.includes(blockId)) {
    section.blocks.push(blockId);
    renderCanvas();
    renderBuyerPreview();
    showToast(`Added "${block.name}" to canvas`, 'success');
  } else if (section?.blocks.includes(blockId)) {
    showToast(`"${block.name}" is already on canvas`, 'warning');
  }
}

function removeBlockFromCanvas(blockId) {
  TEMPLATE_SECTIONS.forEach(section => {
    const idx = section.blocks.indexOf(blockId);
    if (idx !== -1) {
      section.blocks.splice(idx, 1);
    }
  });
  renderCanvas();
  renderBuyerPreview();
  showToast(`Removed block from canvas`, 'info');
}

function setVersion(v) {
  state.currentVersion = v;
  renderVersionTimeline();
  showToast(`Viewing version ${v}`, 'info');
}

function openCommandPalette() {
  state.commandPaletteOpen = true;
  const overlay = document.getElementById('commandPaletteOverlay');
  if (overlay) {
    overlay.classList.add('open');
    const input = overlay.querySelector('.command-palette__input');
    if (input) {
      input.value = '';
      input.focus();
    }
    renderCommandPalette();
  }
}

function closeCommandPalette() {
  state.commandPaletteOpen = false;
  const overlay = document.getElementById('commandPaletteOverlay');
  if (overlay) overlay.classList.remove('open');
}

function executeCommand(action) {
  closeCommandPalette();

  switch (action) {
    case 'add-service':
      addBlockToCanvas('s5'); // Add an unused service block
      break;
    case 'add-spare':
      addBlockToCanvas('sp3');
      break;
    case 'add-billing':
      addBlockToCanvas('b2');
      break;
    case 'add-text':
      addBlockToCanvas('t2');
      break;
    case 'add-video':
      addBlockToCanvas('v1');
      break;
    case 'add-checklist':
      addBlockToCanvas('c2');
      break;
    case 'add-doc':
      addBlockToCanvas('d2');
      break;
    case 'save':
      showToast('Template saved successfully!', 'success');
      break;
    case 'duplicate':
      showToast('Template duplicated!', 'success');
      break;
    case 'toggle-preview':
      toggleBuyerPreview();
      break;
    case 'toggle-analytics':
      toggleAnalytics();
      break;
    case 'reset-zoom':
      resetZoom();
      break;
    default:
      showToast(`Action: ${action}`, 'info');
  }
}

function toggleIndustryDropdown() {
  state.industryDropdownOpen = !state.industryDropdownOpen;
  const dd = document.getElementById('industryDropdown');
  if (dd) dd.classList.toggle('open', state.industryDropdownOpen);
}

function selectIndustry(id) {
  INDUSTRY_PRESETS.forEach(p => p.active = (p.id === id));
  state.industryDropdownOpen = false;
  const dd = document.getElementById('industryDropdown');
  if (dd) dd.classList.remove('open');
  renderIndustryDropdown();

  const preset = INDUSTRY_PRESETS.find(p => p.id === id);
  const trigger = document.getElementById('industryTrigger');
  if (trigger && preset) {
    trigger.innerHTML = `<span>${preset.icon}</span> ${preset.name} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
  }
  showToast(`Switched to ${preset?.name} preset`, 'success');
}

function toggleBuyerPreview() {
  const panel = document.querySelector('.buyer-preview');
  const app = document.querySelector('.designer-app');
  if (panel && app) {
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'flex' : 'none';
    app.style.gridTemplateColumns = isHidden ? '280px 1fr 340px' : '280px 1fr 0';
  }
}

function toggleAnalytics() {
  state.analyticsVisible = !state.analyticsVisible;
  const overlay = document.getElementById('analyticsOverlay');
  if (overlay) overlay.classList.toggle('active', state.analyticsVisible);

  const btn = document.getElementById('analyticsToggleBtn');
  if (btn) btn.classList.toggle('btn--active', state.analyticsVisible);

  if (state.analyticsVisible) {
    renderAnalyticsOverlay();
    showToast('Analytics overlay enabled — viewing engagement data', 'info');
  } else {
    showToast('Analytics overlay hidden', 'info');
  }
}

function renderAnalyticsOverlay() {
  const overlay = document.getElementById('analyticsOverlay');
  if (!overlay) return;

  let html = '';

  // Position badges near each canvas block
  document.querySelectorAll('.canvas-block').forEach(el => {
    const blockId = el.dataset.blockId;
    const data = ANALYTICS_DATA[blockId];
    if (!data) return;

    const rect = el.getBoundingClientRect();
    const canvasRect = document.querySelector('.canvas-area')?.getBoundingClientRect();
    if (!canvasRect) return;

    const top = rect.top - canvasRect.top;
    const left = rect.right - canvasRect.left + 8;

    const valClass = data.acceptance >= 80 ? '--good' : data.acceptance >= 60 ? '--warn' : '--danger';

    html += `
      <div class="analytics-badge" style="top: ${top}px; left: ${Math.min(left, canvasRect.width - 180)}px;">
        <div class="analytics-badge__title">Engagement</div>
        <div class="analytics-badge__stat">
          <span class="analytics-badge__stat-label">Views</span>
          <span class="analytics-badge__stat-value">${data.views.toLocaleString()}</span>
        </div>
        <div class="analytics-badge__stat">
          <span class="analytics-badge__stat-label">Accept Rate</span>
          <span class="analytics-badge__stat-value analytics-badge__stat-value${valClass}">${data.acceptance}%</span>
        </div>
        <div class="analytics-badge__stat">
          <span class="analytics-badge__stat-label">Avg. Time</span>
          <span class="analytics-badge__stat-value">${data.avgTime}</span>
        </div>
      </div>
      <div class="heatmap-glow heatmap-glow--${data.heat}" style="position:absolute; top:${top}px; left:${rect.left - canvasRect.left}px; width:${rect.width}px; height:${rect.height}px;"></div>
    `;
  });

  overlay.innerHTML = html;
}

// ══════════════════════════════════════
// ZOOM & PAN
// ══════════════════════════════════════

function setZoom(level) {
  state.zoom = Math.max(0.5, Math.min(1.5, level));
  applyTransform();
  document.getElementById('zoomLevel').textContent = Math.round(state.zoom * 100) + '%';
}

function zoomIn() { setZoom(state.zoom + 0.1); }
function zoomOut() { setZoom(state.zoom - 0.1); }
function resetZoom() { state.zoom = 1; state.panX = 0; state.panY = 0; applyTransform(); document.getElementById('zoomLevel').textContent = '100%'; }

function applyTransform() {
  const viewport = document.getElementById('canvasViewport');
  if (viewport) {
    viewport.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  }
}

// ══════════════════════════════════════
// TOAST SYSTEM
// ══════════════════════════════════════

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ══════════════════════════════════════
// SEARCH
// ══════════════════════════════════════

function handleSearch(value) {
  state.searchQuery = value;
  renderBlockLibrary();
}

// ══════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════

function initEventListeners() {
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // "/" opens command palette (when not in an input)
    if (e.key === '/' && !e.target.closest('input, textarea')) {
      e.preventDefault();
      openCommandPalette();
    }

    // Escape closes overlays
    if (e.key === 'Escape') {
      if (state.commandPaletteOpen) closeCommandPalette();
      if (state.industryDropdownOpen) {
        state.industryDropdownOpen = false;
        document.getElementById('industryDropdown')?.classList.remove('open');
      }
    }

    // Ctrl/Cmd + S = Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      showToast('Template saved!', 'success');
    }

    // Delete selected block
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedBlock && !e.target.closest('input, textarea')) {
      e.preventDefault();
      removeBlockFromCanvas(state.selectedBlock);
      state.selectedBlock = null;
    }
  });

  // Command palette input filtering
  const cmdInput = document.querySelector('.command-palette__input');
  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => {
      renderCommandPalette(e.target.value);
    });
  }

  // Canvas pan with middle mouse or alt+drag
  const canvasArea = document.querySelector('.canvas-area');
  if (canvasArea) {
    canvasArea.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.altKey && e.button === 0)) {
        state.isPanning = true;
        state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
        canvasArea.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (state.isPanning) {
        state.panX = e.clientX - state.panStart.x;
        state.panY = e.clientY - state.panStart.y;
        applyTransform();
      }
    });

    document.addEventListener('mouseup', () => {
      if (state.isPanning) {
        state.isPanning = false;
        canvasArea.style.cursor = '';
      }
    });

    // Zoom with scroll wheel
    canvasArea.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(state.zoom + delta);
      }
    }, { passive: false });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.industry-selector') && state.industryDropdownOpen) {
      state.industryDropdownOpen = false;
      document.getElementById('industryDropdown')?.classList.remove('open');
    }
  });

  // Command palette overlay click to close
  const cmdOverlay = document.getElementById('commandPaletteOverlay');
  if (cmdOverlay) {
    cmdOverlay.addEventListener('click', (e) => {
      if (e.target === cmdOverlay) closeCommandPalette();
    });
  }
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════

function initApp() {
  renderBlockLibrary();
  renderCanvas();
  renderBuyerPreview();
  renderVersionTimeline();
  renderIndustryDropdown();
  renderCommandPalette();
  initEventListeners();

  // Show welcome toast
  setTimeout(() => {
    showToast('Healthcare template loaded — press / for commands', 'success');
  }, 600);
}

document.addEventListener('DOMContentLoaded', initApp);
