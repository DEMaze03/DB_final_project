
// Browser/client-side script.



function getSearchParams() {
  return {
    searchTerm: document.getElementById("searchInput")?.value.trim() || "",
    type: document.getElementById("filterType")?.value || "",
    class: document.getElementById("filterClass")?.value || "",
    rarity: document.getElementById("filterRarity")?.value || "",
    mana: document.getElementById("filterMana")?.value || ""
  };
}

function populateDropdown(dropdownId, items) {
    const dropdown = document.getElementById(dropdownId);
    console.warn(items);

    if (!dropdown) {
        console.error(`Dropdown with ID "${dropdownId}" not found.`);
        return;
    }

    // Clear existing options except the first placeholder
    dropdown.length = 1;

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
        console.warn("No items to populate.");
        return;
    }

    // Add new options
    items.forEach(item => {
        let option = document.createElement("option");

        if (typeof item === "string") {
            option.value = item.toLowerCase();
            option.text = item;
        } else if (item && typeof item === "object" && "value" in item && "text" in item) {
            option.value = item.value;
            option.text = item.text;
        } else {
            console.warn("Invalid item format:", item);
            option.value = item.high + " | " + item.low
            option.text = "High: " + item.high + " | Low: " + item.low
            
        }

        dropdown.add(option);
    });
}

async function queryGraph() {
  const params = getSearchParams();
  console.log("Querying graph with:", params);

  // Point to the backend API (server.js). Update host/port if you run the server elsewhere.
  const base = (window.__BACKEND_URL__ && window.__BACKEND_URL__) || "http://localhost:3000";
  const q = encodeURIComponent(params.searchTerm);
  try {
    const res = await fetch(`${base}/api/cards?q=${q}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const payload = await res.json();
    console.log("Results from search:", payload);
    // TODO: update the DOM with payload.data
  } catch (err) {
    console.error("Error querying search:", err);
  }
}

// NOTE: Do NOT import server-side db.js here. The browser cannot import Node libs like neo4j-driver.
async function fetchParams() {
  const base = (window.__BACKEND_URL__ && window.__BACKEND_URL__) || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/params`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const payload = await res.json();
    console.log("Possible search params:", payload);
    return payload;
    // TODO: update the DOM with payload.data
  } catch (err) {
    console.error("Error querying params:", err);
  }
}


// init 
document.addEventListener("DOMContentLoaded", async () => {

  // fetch params and parse response
  try {
    const paramOptions = await fetchParams();
    console.log(paramOptions.data.type);

    if (paramOptions.data.type) {
      populateDropdown("typeDropdown", paramOptions.data.type);
    }
    if (paramOptions.data.playerClass) {
      populateDropdown("classDropdown", paramOptions.data.playerClass);
    }
    if (paramOptions.data.rarity) {
      populateDropdown("rarityDropdown", paramOptions.data.rarity);
    }
    if (paramOptions.data.cost) {
      populateDropdown("costDropdown", paramOptions.data.cost);
    }
  } catch (err) {
    console.error("fail:", err);
  }
  
  
  
  // populateDropdown("typeDropdown", paramOptions)


  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", queryGraph);
  

  ["typeDropdown", "classDropdown", "rarityDropdown", "costDropdown"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", queryGraph);
  });

  console.log("Listeners attached — will query backend API at http://localhost:3000.");
});