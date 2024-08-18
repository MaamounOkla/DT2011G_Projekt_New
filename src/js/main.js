// Imports
import { initAnimations } from "./animation";

// Variabler
let currentQuery = '';
let currentPage = 0;
const resultsPerPage = 10;  // Justera antalet resultat per sida
const searchBtn = document.getElementById('searchButton');
const loadMoreBtn = document.getElementById('loadMore');
const results = document.getElementById('results');

// Init funktionen
function init() {
     // Anropa animationsmodulen  
     initAnimations();
     // Lägg till händelselyssnare för knappar
    if (searchBtn) {
        searchBtn.addEventListener('click', searchJobs);
    }
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadJobs);
    }
}
// Anropa init funktioner
init();

// Sök jobb funktionen
async function searchJobs() {
    showLoading();
    try {
        currentQuery = document.getElementById('searchBox').value;
        currentPage = 0;
        results.innerHTML = ''; // Rensa tidigare resultat
        await loadJobs();
    } finally {
        hideLoading();
    }
}

// Ladda fler jobb
async function loadJobs() {
    const url = `https://jobsearch.api.jobtechdev.se/search?q=${currentQuery}&offset=${currentPage * resultsPerPage}&limit=${resultsPerPage}`;
    try {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        displayResults(data.hits);

        if (data.hits.length < resultsPerPage) {
             // Dölj ladda fler knappen om inga fler resultat
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
        // ladda fler jobb
        currentPage++;
    } catch (error) {
        console.error('Error fetching jobs:', error);
        results.innerHTML = '<p>Kunde inte hämta jobb. Vänligen försök igen senare.</p>';
    }
}

// Formatera datum
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('sv-SE', options);
}

// Hämta platsdata
async function getLocationData(city) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&addressdetails=1`);
        const data = await response.json();

        if (data && data.length > 0) {
            // Returnera första resultatet
            return data[0]; 
        } else {
            console.warn('No location data found for city:', city);
            // Returnera null om ingen data hittades
            return null; 
        }
    } catch (error) {
        console.error('Error fetching location data:', error);
         // Returnera null vid fel
        return null;
    }
}

// Beräkna avståndmed hjäp av Haversine Formel. 
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Jordens radie i km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Avstånd i km
    return R * c; 
}

// Visa resultat
async function displayResults(hits) {
    // Rensa tidigare resultat
    results.innerHTML = ''; 

    if (hits.length === 0 && currentPage === 0) {
        results.innerHTML = '<p>Inga jobb hittades.</p>';
        return;
    }

    const userLocation = await getUserLocation();
    if (!userLocation) {
        results.innerHTML = '<p>Kunde inte hämta din plats. Vänligen tillåt platsåtkomst i din webbläsare och ladda om sidan.</p>';
        return;
    }

    for (const hit of hits) {
        const city = hit.workplace_address?.city || '';
        const locationData = await getLocationData(city);

        if (!locationData) {
            // Hoppa över jobbet om ingen platsdata finns
            continue;
        }

        const { lat, lon } = locationData;
        const jobLat = parseFloat(lat);
        const jobLon = parseFloat(lon);

        // Beräkna avstånd om användarens plats är tillgänglig
        let distance = 'Avstånd: Ej tillgängligt';
        if (userLocation) {
            const userLat = userLocation.latitude;
            const userLon = userLocation.longitude;
            distance = `Avstånd: ${calculateDistance(userLat, userLon, jobLat, jobLon).toFixed(2)} km`;
        }

        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik`;
        const mapHtml = 
            `<div id="map-${hit.id}" class="map-container"></div>
            ${distance ? `<p>${distance}</p>` : ''}`;

        const jobDiv = document.createElement('div');
        jobDiv.classList.add('job');
        jobDiv.innerHTML = 
            `<h3><a title="Öppna anonsen på arbetsförmedlingen.se i en ny flick" target="_blank" href="https://arbetsformedlingen.se/platsbanken/annonser/${hit.id}">${hit.headline}</a></h3>
            <p><strong>Arbetsgivare:</strong> ${hit.employer.name}</p>
            <p><strong>Plats:</strong> ${city} ${hit.workplace_address?.region || ''}</p>
            <p><strong>Beskrivning:</strong> 
            ${hit.description.text
                ? hit.description.text.substring(0, 500) + `... <a title="Öppna anonsen på arbetsförmedlingen.se" target="_blank" href=https://arbetsformedlingen.se/platsbanken/annonser/${hit.id}><span>Läs mer</span></a>`
                : 'Ingen beskrivning tillgänglig'
            }
            </p>
            <p><strong>Annons-Id:</strong> ${hit.id}</p>
            <p><strong>Publicerad:</strong> ${formatDate(hit.publication_date)}</p>
            ${mapHtml}`;

        results.appendChild(jobDiv);
        if (userLocation) {
            initMap(hit.id, jobLat, jobLon, userLocation.latitude, userLocation.longitude);
        }
    }
}

// Initiera karta
function initMap(id, jobLat, jobLon, userLat, userLon) {
    const mapDiv = document.getElementById(`map-${id}`);
    if (!mapDiv) return;

    const map = L.map(mapDiv).setView([jobLat, jobLon], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    L.marker([jobLat, jobLon]).addTo(map)
        .bindPopup('Jobbplats')
        .openPopup();

    L.marker([userLat, userLon], { color: 'red' }).addTo(map)
        .bindPopup('Din plats')
        .openPopup();
}

// Hämta användarens plats
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }),
                error => {
                    console.error('Error getting user location:', error);
                    // Returnera null vid fel
                    resolve(null); 
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
            // Returnera null om geolocation inte stöds av användarens webbläsaren
            resolve(null); 
        }
    });
}

// Visa laddning animation
function showLoading() {
    document.querySelector('.loading-container').style.display = 'flex';
}

// Dölj laddning animation
function hideLoading() {
    document.querySelector('.loading-container').style.display = 'none';
}


