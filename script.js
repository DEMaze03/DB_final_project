let currentPage = 1;
let currentResults = [];
let pageSize = 20;
let collectibleCardsMap = new Map(); // Map of card name -> correct ID

// Load collectible cards mapping on startup
async function loadCollectibleCards() {
  try {
    const response = await fetch('/cards.collectible.json');
    const cards = await response.json();
    
    // Create a map of card name to ID for quick lookup
    cards.forEach(card => {
      collectibleCardsMap.set(card.name.toLowerCase(), card.id);
    });
    
    console.log(`Loaded ${collectibleCardsMap.size} collectible cards`);
  } catch (err) {
    console.error('Error loading collectible cards:', err);
  }
}

function getSearchParams() {
  return {
    searchTerm: document.getElementById("searchInput")?.value.trim() || "",
    type: document.getElementById("typeDropdown")?.value || "",
    class: document.getElementById("classDropdown")?.value || "",
    rarity: document.getElementById("rarityDropdown")?.value || "",
    cost: document.getElementById("costDropdown")?.value || "",
    set: document.getElementById("setDropdown")?.value || "",
    race: document.getElementById("raceDropdown")?.value || "",
    mechanic: document.getElementById("mechanicDropdown")?.value || ""
  };
}

function populateDropdown(dropdownId, items) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown || !Array.isArray(items)) return;
  
  dropdown.length = 1;
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.text = item;
    dropdown.add(option);
  });
}

async function queryGraph() {
  const params = getSearchParams();
  const base = window.__BACKEND_URL__ || "http://localhost:3000";
  const queryParams = new URLSearchParams();
  
  if (params.searchTerm) queryParams.append("q", params.searchTerm);
  if (params.type) queryParams.append("type", params.type);
  if (params.class) queryParams.append("class", params.class);
  if (params.rarity) queryParams.append("rarity", params.rarity);
  if (params.cost) queryParams.append("cost", params.cost);
  if (params.set) queryParams.append("set", params.set);
  if (params.race) queryParams.append("race", params.race);
  if (params.mechanic) queryParams.append("mechanic", params.mechanic);

  try {
    const res = await fetch(`${base}/api/cards?${queryParams.toString()}`);
    const payload = await res.json();
    currentResults = payload.data || [];
    currentPage = 1;
    displayCurrentPage();
  } catch (err) {
    console.error("Error querying search:", err);
  }
}

function displayCurrentPage() {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageCards = currentResults.slice(start, end);
  displayResults(pageCards);
  updatePagination();
}

function updatePagination() {
  const pagination = document.getElementById("pagination");
  const resultsLabel = document.getElementById("resultsLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  
  if (currentResults.length === 0) {
    pagination.style.display = "none";
    resultsLabel.style.display = "none";
    return;
  }
  
  const totalPages = Math.ceil(currentResults.length / pageSize);
  pagination.style.display = "flex";
  resultsLabel.style.display = "block";
  resultsLabel.textContent = `${currentResults.length} cards found`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function getCardImageUrl(card) {
  // Try to get the correct ID from collectible cards map
  const correctId = collectibleCardsMap.get(card.name?.toLowerCase());
  const cardId = correctId || card.cardId;
  
  if (!cardId) return null;
  
  return `https://art.hearthstonejson.com/v1/render/latest/enUS/256x/${cardId}.png`;
}

function displayResults(cards) {
  const resultsDiv = document.getElementById("searchResults");
  
  if (!cards || cards.length === 0) {
    resultsDiv.innerHTML = '<div class="results-hint">No cards found</div>';
    return;
  }

  resultsDiv.innerHTML = cards.map(card => {
    const cardData = JSON.stringify(card).replace(/"/g, '&quot;');
    const imageUrl = getCardImageUrl(card);
    
    // Skip cards without valid image URL
    if (!imageUrl) return '';
    
    return `
      <div class="result-card" draggable="true" data-card="${cardData}">
        <img data-src="${imageUrl}" alt="${card.name || 'Card'}" class="result-card-image lazy">
      </div>`;
  }).filter(html => html !== '').join('');
  
  attachDragListeners();
  setupLazyLoading();
}

function setupLazyLoading() {
  const images = document.querySelectorAll('img.lazy');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px'
  });

  images.forEach(img => imageObserver.observe(img));
}

async function fetchParams() {
  const base = window.__BACKEND_URL__ || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/params`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching params:", err);
  }
}

function resetEverything() {
  document.getElementById("searchInput").value = "";
  ["typeDropdown", "classDropdown", "rarityDropdown", "costDropdown", "setDropdown", "raceDropdown", "mechanicDropdown"]
    .forEach(id => document.getElementById(id).selectedIndex = 0);
  
  currentResults = [];
  currentPage = 1;
  document.getElementById("searchResults").innerHTML = '<div class="results-hint">Use search and filters to find cards</div>';
  document.getElementById("pagination").style.display = "none";
  document.getElementById("resultsLabel").style.display = "none";
}

function attachDragListeners() {
  document.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.currentTarget.classList.add('dragging');
      e.dataTransfer.setData('application/json', e.currentTarget.dataset.card);
    });
    card.addEventListener('dragend', e => e.currentTarget.classList.remove('dragging'));
  });
}

function setupDropZones() {
  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.currentTarget.classList.add('drop-active');
    });
    zone.addEventListener('dragleave', e => {
      if (e.currentTarget === e.target) e.currentTarget.classList.remove('drop-active');
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      e.currentTarget.classList.remove('drop-active');
      const card = JSON.parse(e.dataTransfer.getData('application/json'));
      populateCardSlot(e.currentTarget.dataset.slot, card);
    });
  });
}

function populateCardSlot(slot, card) {
  document.querySelector(`#dropZone${slot} .slot-hint`).style.display = 'none';
  document.getElementById(`cardContent${slot}`).style.display = 'block';
  document.getElementById(`removeCard${slot}`).style.display = 'block';
  
  let infoHTML = `<p><strong>Name:</strong> ${card.name || 'Unknown'}</p>`;
  if (card.type) infoHTML += `<p><strong>Type:</strong> ${card.type}</p>`;
  if (card.playerClass) infoHTML += `<p><strong>Class:</strong> ${card.playerClass}</p>`;
  if (card.cost !== null) infoHTML += `<p><strong>Mana:</strong> ${card.cost}</p>`;
  if (card.attack !== null || card.health !== null) {
    infoHTML += `<p><strong>Attack / Health:</strong> ${card.attack ?? '?'} / ${card.health ?? '?'}</p>`;
  }
  if (card.durability !== null) infoHTML += `<p><strong>Durability:</strong> ${card.durability}</p>`;
  if (card.rarity) infoHTML += `<p><strong>Rarity:</strong> ${card.rarity}</p>`;
  if (card.race) infoHTML += `<p><strong>Race:</strong> ${card.race}</p>`;
  if (card.mechanics?.length > 0) infoHTML += `<p><strong>Mechanics:</strong> ${card.mechanics.join(', ')}</p>`;
  if (card.text) infoHTML += `<p><strong>Text:</strong> ${card.text.replace(/<[^>]*>/g, '')}</p>`;
  if (card.set) infoHTML += `<p><strong>Set:</strong> ${card.set}</p>`;
  
  document.getElementById(`cardInfo${slot}`).innerHTML = infoHTML;
  window[`card${slot}`] = card;
}

function clearCardSlot(slot) {
  document.querySelector(`#dropZone${slot} .slot-hint`).style.display = 'block';
  document.getElementById(`cardContent${slot}`).style.display = 'none';
  document.getElementById(`removeCard${slot}`).style.display = 'none';
  window[`card${slot}`] = null;
  
  if (!window.card1 && !window.card2) {
    document.getElementById("interactionOutput").textContent = "Select two cards to see their interactions...";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Load collectible cards mapping first
  await loadCollectibleCards();
  
  const params = await fetchParams();
  if (params?.data) {
    if (params.data.type) populateDropdown("typeDropdown", params.data.type);
    if (params.data.playerClass) populateDropdown("classDropdown", params.data.playerClass);
    if (params.data.rarity) populateDropdown("rarityDropdown", params.data.rarity);
    if (params.data.cost) populateDropdown("costDropdown", params.data.cost);
    if (params.data.set) populateDropdown("setDropdown", params.data.set);
    if (params.data.race) populateDropdown("raceDropdown", params.data.race);
    if (params.data.mechanic) populateDropdown("mechanicDropdown", params.data.mechanic);
  }

  document.getElementById("searchInput").addEventListener("input", queryGraph);
  ["typeDropdown", "classDropdown", "rarityDropdown", "costDropdown", "setDropdown", "raceDropdown", "mechanicDropdown"]
    .forEach(id => document.getElementById(id).addEventListener("change", queryGraph));
  
  document.getElementById("clearAllBtn").addEventListener("click", resetEverything);
  document.getElementById("removeCard1").addEventListener("click", () => clearCardSlot(1));
  document.getElementById("removeCard2").addEventListener("click", () => clearCardSlot(2));
  
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; displayCurrentPage(); }
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    const totalPages = Math.ceil(currentResults.length / pageSize);
    if (currentPage < totalPages) { currentPage++; displayCurrentPage(); }
  });
  document.getElementById("pageSize").addEventListener("change", e => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    displayCurrentPage();
  });
  
  setupDropZones();
  
  document.getElementById("analyzeBtn").addEventListener("click", () => {
    const card1 = window.card1;
    const card2 = window.card2;
    const output = document.getElementById("interactionOutput");
    
    if (!card1 || !card2) {
      output.textContent = "Please select two cards to analyze.";
      return;
    }
    
    let analysis = `${card1.name} vs ${card2.name}\n\n`;
    if (card1.attack !== null && card2.health !== null && card1.attack >= card2.health) {
      analysis += `${card1.name} destroys ${card2.name}. `;
    }
    if (card2.attack !== null && card1.health !== null && card2.attack >= card1.health) {
      analysis += `${card2.name} destroys ${card1.name}. `;
    }
    output.textContent = analysis;
  });
});