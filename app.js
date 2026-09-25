const isCalibrateMode = new URLSearchParams(window.location.search).has('calibrate');
const body = document.body;
const resultsBox = document.getElementById('results');
const tableSummaryBox = document.getElementById('table-summary');
const form = document.getElementById('search-form');
const input = document.getElementById('query');
const statsGuests = document.getElementById('stat-guests');
const statsTables = document.getElementById('stat-tables');
const statsCapacity = document.getElementById('stat-capacity');
const statsSpecials = document.getElementById('stat-specials');
const datasetPath = body.dataset.dataset || 'data/guests-28mar.json';
const tableMapPath =
  body.dataset.tableMap === undefined ? 'data/table-map.json' : body.dataset.tableMap.trim() || null;
const tablesPath = body.dataset.tables?.trim() || null;
const floorplanHighlight = document.getElementById('floorplan-highlight');

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

let guests = [];
let tables = [];
let tableMap = {};
let tableDataMeta = {};
let guestCountByTable = new Map();
let activeTable = null;

async function loadTableMap() {
  if (!tableMapPath) return;
  try {
    const response = await fetch(tableMapPath);
    tableMap = await response.json();
  } catch (error) {
    tableMap = {};
  }
}

async function loadGuests() {
  const response = await fetch(datasetPath);
  const data = await response.json();
  guests = data
    .map((guest, index) => {
      const name = String(guest.name || guest.fullName || '').trim();
      const table = String(guest.table || guest.mesa || '').trim();
      const companion = String(guest.companion || guest.acompanante || guest['Acompañante'] || '').trim();
      const notes = String(guest.notes || guest.details || guest.detalles || '').trim();
      const searchText = normalize([name, companion, notes, table].join(' '));
      return {
        ...guest,
        name,
        table,
        companion,
        notes,
        index,
        searchText,
      };
    })
    .sort((a, b) => a.searchText.localeCompare(b.searchText));

  guestCountByTable = buildGuestCountByTable();
  updateStats();
  renderTableSummary();
  showEmpty();
}

async function loadTables() {
  if (!tablesPath) {
    renderTableSummary();
    updateStats();
    return;
  }

  try {
    const response = await fetch(tablesPath);
    const data = await response.json();
    tableDataMeta = data.meta || {};
    tables = Array.isArray(data)
      ? data
      : Array.isArray(data.tables)
        ? data.tables
        : [];
  } catch (error) {
    tables = [];
  }

  renderTableSummary();
  updateStats();
}

function buildGuestCountByTable() {
  const counts = new Map();
  for (const guest of guests) {
    const key = guest.table || 'SIN MESA';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function getTableStats() {
  const tableCount = tables.length || new Set(guests.map((guest) => guest.table).filter(Boolean)).size;
  const capacityTotal = tables.reduce((sum, table) => sum + (Number(table.capacity) || 0), 0);
  const specials = Number(tableDataMeta.specialDishes ?? tableDataMeta.specials ?? 0) || 0;
  return {
    guests: guests.length,
    tables: tableCount,
    capacity: capacityTotal,
    specials,
  };
}

function updateStats() {
  const stats = getTableStats();
  if (statsGuests) statsGuests.textContent = String(stats.guests);
  if (statsTables) statsTables.textContent = String(stats.tables);
  if (statsCapacity) statsCapacity.textContent = String(stats.capacity || 0);
  if (statsSpecials) statsSpecials.textContent = String(stats.specials || 0);
}

function showEmpty() {
  if (!resultsBox) return;
  resultsBox.innerHTML = `
    <div class="empty-state">
      <p class="empty-kicker">Busca por nombre o mesa</p>
      <p>Escribe un nombre, apellido, acompañante o número de mesa para ver la asignación exacta.</p>
    </div>`;
  activateTable(null);
}

function renderResults(matches, queryText, mode = 'name') {
  if (!resultsBox) return;

  if (!matches.length) {
    resultsBox.innerHTML = `
      <div class="empty-state">
        <p class="empty-kicker">No encontré coincidencias</p>
        <p>No vi "${queryText}". Prueba con otro nombre, apellido o mesa.</p>
      </div>`;
    activateTable(null);
    return;
  }

  const cards = matches
    .map((guest) => {
      const color = colorForTable(guest.table);
      const noteBits = [guest.notes].filter(Boolean);
      const subtitle = guest.companion ? `Acompañante: ${guest.companion}` : 'Sin acompañante registrado';
      const label = guest.table ? formatTableLabel(guest.table) : 'Sin mesa';
      return `
        <article class="result-card" data-table="${escapeHtml(guest.table)}" style="--mesa-color:${color};">
          <div class="result-copy">
            <strong>${escapeHtml(guest.name)}</strong>
            <p>${escapeHtml(subtitle)}</p>
            ${noteBits.length ? `<span class="note-pill">${escapeHtml(noteBits.join(' · '))}</span>` : ''}
          </div>
          <div class="result-meta">
            <span class="mesa">${escapeHtml(label)}</span>
          </div>
        </article>`;
    })
    .join('');

  const summary =
    mode === 'table'
      ? `<p class="search-summary">${escapeHtml(formatTableLabel(matches[0].table))} · ${matches.length} invitado${
          matches.length === 1 ? '' : 's'
        }</p>`
      : `<p class="search-summary">${matches.length} resultado${matches.length === 1 ? '' : 's'} para "${escapeHtml(
          queryText
        )}"</p>`;

  resultsBox.innerHTML = `${summary}${cards}`;
  const firstCard = resultsBox.querySelector('.result-card');
  if (firstCard) {
    setActiveCard(firstCard);
  }
}

function searchGuest(queryRaw) {
  const query = normalize(queryRaw);
  if (!query) {
    showEmpty();
    return;
  }

  const tableKey = resolveTableQuery(queryRaw);
  if (tableKey) {
    const matches = guests
      .filter((guest) => normalize(guest.table) === normalize(tableKey))
      .sort((a, b) => a.searchText.localeCompare(b.searchText));
    renderResults(matches, queryRaw, 'table');
    return;
  }

  const exact = guests.filter((guest) => guest.searchText === query);
  if (exact.length) {
    renderResults(exact, queryRaw, 'name');
    return;
  }

  const partial = guests.filter((guest) => guest.searchText.includes(query));
  renderResults(partial.slice(0, 8), queryRaw, 'name');
}

function resolveTableQuery(queryRaw) {
  const normalized = normalize(queryRaw);
  if (!normalized) return null;
  const candidate = normalized.replace(/^mesa\s+/, '').trim();
  const normalizedTables = new Map(
    tables.map((table) => [normalize(table.table), table.table]).filter(([key]) => key)
  );

  if (normalizedTables.has(candidate)) {
    return normalizedTables.get(candidate);
  }

  if (normalizedTables.has(normalized)) {
    return normalizedTables.get(normalized);
  }

  if (candidate === 'novios' || candidate === 'principal') {
    return normalizedTables.get(candidate) || candidate.toUpperCase();
  }

  return null;
}

function renderTableSummary() {
  if (!tableSummaryBox) return;
  if (!tables.length) {
    tableSummaryBox.innerHTML = '';
    return;
  }

  const cards = tables
    .map((table) => {
      const label = String(table.table || table.label || '').trim();
      const capacity = Number(table.capacity) || 0;
      const occupancy = guestCountByTable.get(label) || 0;
      const statusClass = occupancy >= capacity && capacity ? 'is-full' : occupancy === 0 ? 'is-empty' : '';
      const noteText = String(table.notes || table.details || table.detail || '').trim();
      const extra = occupancy > capacity ? `<span class="table-badge over">+${occupancy - capacity} sobre</span>` : '';
      const note = noteText
        ? `<p class="table-note">${escapeHtml(noteText)}</p>`
        : occupancy === 0
          ? '<p class="table-note">Sin invitados asignados</p>'
          : '';
      return `
        <button class="table-card ${statusClass}" type="button" data-table="${escapeHtml(label)}">
          <div class="table-card__top">
            <strong>${escapeHtml(formatTableLabel(label))}</strong>
            <span class="table-badge">${occupancy}/${capacity || '—'}</span>
          </div>
          ${note}
          <div class="table-card__footer">
            <span class="table-caption">${escapeHtml(capacity ? `${capacity} cupos` : 'Sin capacidad')}</span>
            ${extra}
          </div>
        </button>`;
    })
    .join('');

  tableSummaryBox.innerHTML = cards;
  syncActiveTableCard();
}

function formatTableLabel(table = '') {
  const value = String(table).trim();
  if (!value) return 'Sin mesa';
  if (value.toUpperCase() === 'NOVIOS') return 'Mesa novios';
  if (value.toUpperCase() === 'PRINCIPAL') return 'Mesa principal';
  return `Mesa ${value}`;
}

function colorForTable(table = '') {
  const seed = Array.from(String(table)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = (seed * 41) % 360;
  return `hsl(${hue}, 68%, 38%)`;
}

function activateTable(table, color) {
  activeTable = table ? String(table) : null;

  if (!floorplanHighlight) {
    syncActiveTableCard();
    return;
  }

  const coords = tableMap[String(table)];
  if (!table || !coords) {
    floorplanHighlight.hidden = true;
    document.body.removeAttribute('data-active-table');
    syncActiveTableCard();
    return;
  }

  floorplanHighlight.hidden = false;
  floorplanHighlight.style.left = `${coords.x}%`;
  floorplanHighlight.style.top = `${coords.y}%`;
  const ring = floorplanHighlight.querySelector('.floorplan-ring');
  const tip = floorplanHighlight.querySelector('.floorplan-tip');
  const number = floorplanHighlight.querySelector('.floorplan-number');
  const size = coords.size || 46;
  const markerColor = color || colorForTable(table);
  floorplanHighlight.style.setProperty('--marker-color', markerColor);

  if (ring) {
    ring.style.width = `${size}px`;
    ring.style.height = `${size}px`;
  }
  if (number) {
    number.style.fontSize = `${Math.max(size * 0.4, 18)}px`;
    number.textContent = table === 'PRINCIPAL' ? '★' : table;
  }
  if (tip) {
    tip.textContent = table === 'PRINCIPAL' ? 'Mesa principal' : `Mesa ${table}`;
  }
  document.body.dataset.activeTable = table;
  syncActiveTableCard();
}

function syncActiveTableCard() {
  if (!tableSummaryBox) return;
  tableSummaryBox.querySelectorAll('.table-card').forEach((card) => {
    card.classList.toggle('is-active', card.dataset.table === activeTable);
  });
}

function setActiveCard(card) {
  if (!resultsBox) return;
  resultsBox.querySelectorAll('.result-card').forEach((el) => el.classList.remove('is-active'));
  card.classList.add('is-active');
  const table = card.dataset.table;
  const color = card.style.getPropertyValue('--mesa-color');
  activateTable(table, color);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function focusTable(table) {
  if (input) {
    input.value = table;
  }
  searchGuest(table);
  if (input) input.focus();
}

resultsBox?.addEventListener('click', (event) => {
  const card = event.target.closest('.result-card');
  if (card) {
    setActiveCard(card);
  }
});

tableSummaryBox?.addEventListener('click', (event) => {
  const card = event.target.closest('.table-card');
  if (!card) return;
  focusTable(card.dataset.table || '');
});

document.querySelectorAll('.quick-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    focusTable(chip.dataset.table || '');
  });
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  searchGuest(input?.value || '');
});

input?.addEventListener('input', () => {
  if (!input.value) {
    showEmpty();
  }
});

async function bootstrap() {
  await Promise.all([loadTableMap(), loadTables(), loadGuests()]);
  if (!input?.value) {
    showEmpty();
  }
  setupCalibrateMode();
}

bootstrap();

function setupCalibrateMode() {
  if (!isCalibrateMode) return;
  const frame = document.querySelector('.floorplan-frame');
  const img = frame?.querySelector('img');
  if (!frame || !img) return;

  const hint = document.createElement('div');
  hint.className = 'calibrate-hint';
  hint.textContent = 'Calibración activa';
  frame.appendChild(hint);

  frame.addEventListener('click', (event) => {
    const rect = img.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    const tableId = prompt('Mesa (ej. 12):');
    if (!tableId) return;
    const defaultSize = tableMap[String(tableId)]?.size || 60;
    const sizeInput = prompt('Diámetro (px, opcional):', String(defaultSize));
    const size = parseFloat(sizeInput) || defaultSize;
    const snippet = `"${tableId}": { "x": ${xPercent.toFixed(1)}, "y": ${yPercent.toFixed(1)}, "size": ${Math.round(size)} }`;
    console.info('👉 Copia este bloque en data/table-map.json:', snippet);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(snippet).then(() => {
        hint.textContent = `Mesa ${tableId}: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}% (copiado)`;
      });
    } else {
      hint.textContent = snippet;
      alert(snippet);
    }
  });
}
