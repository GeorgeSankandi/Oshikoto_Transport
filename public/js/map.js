document.addEventListener('DOMContentLoaded', () => {
    // Check if the map container element exists on the page
    if (document.getElementById('map')) {
        // Initialize the map and set its view to Windhoek, Namibia coordinates
        const map = L.map('map').setView([-22.5594, 17.0851], 13);

        // Add the OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Add a marker to the map at the specified coordinates
        const marker = L.marker([-22.5594, 17.0851]).addTo(map);

        // Add a popup to the marker
        marker.bindPopup("<b>Oshikoto Transport & Investment CC</b><br>Windhoek, Namibia.").openPopup();
    }
});