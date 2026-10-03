# Waymark

A road trip journal for your phone. Add each place you reach and Waymark draws an
arrow to it from the stop before, with the date, your notes and photos alongside.

## Run it

    node scripts/serve.mjs

It prints an address for this computer and one for a phone on the same Wi-Fi.
There is no build step; the folder can be put on any static host as it is.
"My location" and installing to the home screen need the site to be served over
HTTPS, so host it somewhere (GitHub Pages, Netlify, your own server) for real use.

## Importing photos

"Import photos" on a trip takes photos or a .zip of them. Waymark reads where and
when each photo was taken from the data the camera saved in it (JPEG, HEIC, PNG
and WebP), groups shots taken close together into places, names each place, and
shows them sorted by city so you can leave a city out before adding them.
Photos without a location join the stop taken closest in time.

On iPhone, photos picked from the photo library can arrive without their
location. Saving them to the Files app first, or zipping them, keeps it.

**Every place / Cities** under the distance switches the map and journal between
the detailed route and a simplified one with one stop per city.

## Where things live

- Trips, notes and photos are stored in the browser on the device (IndexedDB).
  Your home address (for the Home shortcut) is kept in local storage.
  "Save a backup file" in a trip's menu writes one file with everything in it;
  "Open a backup file" on the first screen reads it back, on any device.
- Map tiles come from OpenFreeMap, place search from Open-Meteo and Photon,
  road routes and driving times from the public OSRM server. None need a key.

## Files

- `index.html`, `styles.css` – the page and its look
- `js/app.js` – trips, the journal, the add-stop form, photos, the city view
- `js/importer.js` – turning imported photos into stops
- `js/photos.js` – reading location and time from photos, opening zip files
- `js/mapview.js` – the map, markers, arrows and their animation
- `js/services.js` – search, routing, photo resizing, formatting
- `js/store.js` – saving and loading
- `js/ui.js` – the bottom sheet, panels and small helpers
- `sw.js` – keeps the app shell available offline
