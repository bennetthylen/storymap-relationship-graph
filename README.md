# Storymap Relationship Graph (MVP)

This is a static, browser-only “storymap” relationship graph between **People** and **Events**.

## What you can do

- Add `Person` nodes (name + optional description)
- Add `Event` nodes (title + optional date)
- Create relationships (directed) from **Person → Event**
- Click nodes/edges to view details and delete
- Add a photo and story text to nodes (stored in the graph JSON)
- Re-order “story nodes” using the **Story Order** controls
- Connected “bubble” navigation: clicking a node dims everything outside its connected component
- Switch the UI language (Arabic/English/Español/Français/Deutsch)
- Export/import the whole graph as JSON
- Create a shareable URL that encodes the graph in the query string (`?data=...`)

## Run locally

Because this is static HTML/JS, the simplest way is to open `index.html` in a browser.

If you hit CORS/security issues, use a local static host (example):

```bash
# from the folder containing index.html
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Deploy online

Any static hosting works:

- GitHub Pages
- Netlify
- Vercel (static)
- Cloudflare Pages

Upload/serve the contents of this folder (especially `index.html`, `styles.css`, `app.js`).

## Data model (for JSON import/export)

The graph JSON shape is:

```json
{
  "nodes": [
    { "id": "p_...", "type": "person", "label": "Name", "description": "..." },
    { "id": "e_...", "type": "event", "label": "Title", "date": "..." }
  ],
  "edges": [
    { "id": "r_...", "source": "p_...", "target": "e_...", "role": "..." }
  ]
}
```

