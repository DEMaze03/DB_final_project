// Minimal script: only logs search parameters when the search input or any filter changes.
// No sample data, no search results, no drag/drop, and no interaction logic.

console.log('Frontend loaded (log-only mode)');

function getSearchParams() {
    return {
        searchTerm: document.getElementById('searchInput')?.value.trim() || '',
        type: document.getElementById('filterType')?.value || '',
        class: document.getElementById('filterClass')?.value || '',
        rarity: document.getElementById('filterRarity')?.value || '',
        mana: document.getElementById('filterMana')?.value || ''
    };
}

function logSearchParams() {
    const params = getSearchParams();
    console.log('Search params changed:', params);
}

// Minimal reset that clears the inputs and logs the cleared params
function resetEverything() {
    const si = document.getElementById('searchInput');
    if (si) si.value = '';
    const ids = ['filterType', 'filterClass', 'filterRarity', 'filterMana'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    console.log('Reset invoked — inputs cleared');
    logSearchParams();
}

// Minimal analyze stub (no behavior)
function analyzeInteraction() {
    console.log('analyzeInteraction invoked — disabled in log-only mode');
}

// Wire listeners on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', logSearchParams);

    ['filterType', 'filterClass', 'filterRarity', 'filterMana'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', logSearchParams);
    });

    // If the page uses onclick attributes for buttons, the above resetEverything/analyzeInteraction stubs will be called.
    console.log('Listeners attached — will log search params on changes.');
});