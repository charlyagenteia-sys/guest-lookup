const resultsBox = document.getElementById('results');
const form = document.getElementById('search-form');
const input = document.getElementById('query');

const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

let guests = [];

async function loadGuests() {
  const response = await fetch('data/guests-walker-mackenna.json');
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
}

function renderResults(matches, queryText) {
  if (!matches.length) {
    resultsBox.innerHTML = `
      <div class="empty">
        <p>No encontré "${queryText}".</p>
        <p>Prueba con otro nombre o revisa la ortografía.</p>
      </div>`;
    return;
  }

  const cards = matches
    .map(
      (guest) => `
      <article class="result-card">
        <div>
          <strong>${guest.name}</strong>
          <p>Mesa asignada</p>
        </div>
        <div class="mesa">
          ${guest.table}
        </div>
      </article>`
    )
    .join('');

  resultsBox.innerHTML = cards;
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

form.addEventListener('submit', (event) => {
  event.preventDefault();
  searchGuest(input.value);
});

input.addEventListener('input', () => {
  if (!input.value) {
    showEmpty();
  }
});

loadGuests();



const floorDialog = document.getElementById('floorplan-dialog');
const openFloorBtn = document.getElementById('open-floorplan');
const closeFloorBtn = document.querySelector('.close-floorplan');
const floorplanImage = openFloorBtn?.getAttribute('href') ?? 'assets/plano-walker-mackenna.png';

if (floorDialog && openFloorBtn && closeFloorBtn) {
  const canShowModal = typeof floorDialog.showModal === 'function';
  openFloorBtn.addEventListener('click', (event) => {
    if (canShowModal) {
      event.preventDefault();
      floorDialog.showModal();
    }
  });

  if (canShowModal) {
    closeFloorBtn.addEventListener('click', () => {
      floorDialog.close();
    });
    floorDialog.addEventListener('click', (event) => {
      if (event.target === floorDialog) {
        floorDialog.close();
      }
    });
  } else {
    floorDialog.remove();
  }
}
