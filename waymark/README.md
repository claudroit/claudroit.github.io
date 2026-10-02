# Waymark

A road trip journal for your phone. Add each place you reach and Waymark draws an
arrow to it from the stop before, with the date, your notes and photos alongside.

## Run it

    node scripts/serve.mjs

It prints an address for this computer and one for a phone on the same Wi-Fi.
There is no build step; the folder can be put on any static host as it is.
"My location" and installing to the home screen need the site to be served over
HTTPS, so host it somewhere (GitHub Pages, Netlify, your own server) for real use.

## Where things live

- Trips, notes and photos are stored in the browser on the device (IndexedDB).
  "Save a backup file" in a trip's menu writes one file with everything in it;
  "Open a backup file" on the first screen reads it back, on any device.
- Map tiles come from OpenFreeMap, place search from Open-Meteo and Photon,
  road routes and driving times from the public OSRM server. None need a key.

## Files

- `index.html`, `styles.css` – the page and its look
- `js/app.js` – trips, the journal, the add-stop form, photos
- `js/mapview.js` – the map, markers, arrows and their animation
- `js/services.js` – search, routing, photo resizing, formatting
- `js/store.js` – saving and loading
- `js/ui.js` – the bottom sheet, panels and small helpers
- `sw.js` – keeps the app shell available offline
