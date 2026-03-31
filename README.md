# WMF Digital Exhibition Storymap

This is a static, browser-only digital exhibition platform for Women and Memory Forum's "Doing Well, Don't Worry" project.

## What you can do

- Add `Person` nodes (name + optional description)
- Add `Event` nodes (title + optional date)
- Create relationships (directed) from **Person → Event**
- Click nodes/edges to view details and delete
- Add a photo and story text to nodes (stored in the graph JSON)
- Re-order “story nodes” using the **Story Order** controls
- Connected “bubble” navigation: clicking a node dims everything outside its connected component
- Switch the UI language (Fuṣḥā Arabic/English/Spanish/German/Italian)
- Export/import the whole graph as JSON
- Create a shareable URL that encodes the graph in the query string (`?data=...`)
- View scholarly citations and relational feminist context overlays

## Run locally

Because this is static HTML/JS, the simplest way is to open `index.html` in a browser.

If you hit CORS/security issues, use a local static host (example):

```bash
# from the folder containing index.html
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Deploy online

Any static hosting works. For GitHub Pages:

- Repo URL: `https://github.com/bennetthylen/storymap-relationship-graph`
- Pages URL: `https://bennetthylen.github.io/storymap-relationship-graph/`
- Pages settings: `Deploy from a branch` -> `main` -> `/(root)`

Upload/serve the contents of this folder (especially `index.html`, `admin.html`, `styles.css`, `app.js`).

## Data model (for JSON import/export)

The graph JSON shape is:

```json
{
  "nodes": [
    {
      "id": "p_...",
      "type": "person",
      "label": "Name",
      "description": "...",
      "notes": "...",
      "dateRange": "1950s-1980s",
      "contextTags": "nasser,rural_pedagogy",
      "audioDescription": "...",
      "pedagogyNotes": "...",
      "mentorshipRole": "mentor",
      "citationIds": "1,2"
    },
    {
      "id": "e_...",
      "type": "event",
      "label": "Title",
      "date": "...",
      "dateRange": "2011-2013",
      "contextTags": "arab_spring,intersectional",
      "citationIds": "2,3"
    }
  ],
  "edges": [
    { "id": "r_...", "source": "p_...", "target": "e_...", "role": "..." }
  ]
}
```

