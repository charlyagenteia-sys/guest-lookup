const resultsBox = document.getElementById('results');
const form = document.getElementById('search-form');
const input = document.getElementById('query');
const datasetPath = document.body.dataset.dataset || 'data/guests-28mar.json';
const floorplanHighlight = document.getElementById('floorplan-highlight');

const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

let guests = [];
let tableMap = {};


async function loadTableMap() {
  try {
    const response = await fetch('data/table-map.json');
    tableMap = await response.json();
  } catch (error) {
    tableMap = {};
  }
}

async function loadGuests() {
  const response = await fetch(datasetPath);
  const data = await response.json();
  guests = data
    .map((guest) => ({
      ...guest,
      normalized: normalize(guest.name),
    }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized));
  showEmpty();
}

function showEmpty() {
  resultsBox.innerHTML = '<p class="empty">Escribe un nombre para ver la mesa.</p>';
  highlightTable(null);
}

function renderResults(matches, queryText) {
  if (!matches.length) {
    resultsBox.innerHTML = `
      <div class="empty">
        <p>No encontré "${queryText}".</p>
        <p>Prueba con otro nombre o revisa la ortografía.</p>
      </div>`;
    highlightTable(null);
    return;
  }

  const cards = matches
    .map((guest) => {
      const color = colorForTable(guest.table);
      return `
        <article class="result-card" data-table="${guest.table}" style="--mesa-color:${color};">
          <div>
            <strong>${guest.name}</strong>
            <p>Mesa asignada</p>
          </div>
          <div class="mesa">
            ${guest.table}
          </div>
        </article>`;
    })
    .join('');

  resultsBox.innerHTML = cards;
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

  const exact = guests.find((guest) => guest.normalized === query);
  if (exact) {
    renderResults([exact], queryRaw);
    return;
  }

  const partial = guests.filter((guest) => guest.normalized.includes(query));
  renderResults(partial.slice(0, 5), queryRaw);
}

function colorForTable(table = '') {
  const seed = Array.from(String(table)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = (seed * 47) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

function highlightTable(table, color) {
  if (!floorplanHighlight) return;
  const coords = tableMap[String(table)];
  if (!table || !coords) {
    floorplanHighlight.hidden = true;
    document.body.removeAttribute('data-active-table');
    return;
  }
  floorplanHighlight.hidden = false;
  floorplanHighlight.style.left = `${coords.x}%`;
  floorplanHighlight.style.top = `${coords.y}%`;
  floorplanHighlight.textContent = `Mesa ${table}`;
  if (color) {
    floorplanHighlight.style.setProperty('--mesa-color', color);
  }
  document.body.dataset.activeTable = table;
}

function setActiveCard(card) {
  resultsBox.querySelectorAll('.result-card').forEach((el) => el.classList.remove('is-active'));
  card.classList.add('is-active');
  const table = card.dataset.table;
  const color = card.style.getPropertyValue('--mesa-color');
  highlightTable(table, color);
}

resultsBox.addEventListener('click', (event) => {
  const card = event.target.closest('.result-card');
  if (card) {
    setActiveCard(card);
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  searchGuest(input.value);
});

input.addEventListener('input', () => {
  if (!input.value) {
    showEmpty();
  }
});

loadTableMap();
loadGuests();
