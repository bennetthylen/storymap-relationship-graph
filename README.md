# WMF Digital Exhibition Storymap

This is a static, browser-only digital exhibition platform for The Women and Memory Forum's "Doing Well, Don't Worry" project.

## What you can do

- Add `Person` nodes (name + optional description)
- Add `Event` nodes (title + optional date)
- Create relationships (directed) from **Person → Event**
- Click nodes/edges to view details and delete
- Add a photo and story text to nodes (stored in the graph JSON)
- Re-order “story nodes” using the **Story Order** controls
- Connected “bubble” navigation: clicking a node dims everything outside its connected component
- Navigate across persistent public tabs: Home, Storymap, History, Discussion
- Post and reply anonymously in the Discussion board: **shared online** when Supabase is configured (see below), otherwise cached per browser in localStorage key `storymap-discussions`
- Clear all discussion posts/replies from the password-protected admin panel (clears shared data when Supabase is configured)
- Edit landing/history copy from the admin panel (saved in localStorage)
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

Upload/serve the contents of this folder (especially `index.html`, `storymap.html`, `history.html`, `discussion.html`, `admin.html`, `discussion-config.js`, `styles.css`, `app.js`).

## Shared discussion (Supabase)

GitHub Pages cannot write to the repo from visitors’ browsers, so **public, cross-device discussion** uses a free [Supabase](https://supabase.com/) project:

1. Create a project and open **SQL Editor**.
2. Paste and run [`discussion-supabase.sql`](discussion-supabase.sql) (creates table `discussion_board` with public read/write policies for the anon role).
3. In Supabase **Project Settings → API**, copy the **Project URL** and **anon public** key.
4. Edit [`discussion-config.js`](discussion-config.js) and set `window.STORYMAP_DISCUSSION_SUPABASE_URL` and `window.STORYMAP_DISCUSSION_SUPABASE_ANON_KEY`, then deploy.
5. Load `discussion.html` — you should see the note *“stored online and shared with all visitors.”*

The app stores the full thread list as JSON in row `id = 1`. Last save wins if two people post at the exact same moment; that is acceptable for a lightweight board.

## Global Storymap Publish (Admin -> GitHub)

The admin storymap canvas supports global publishing through GitHub:

- Edit storymap nodes/edges in `admin.html` as usual (draft saves remain local).
- Enter a GitHub PAT in the admin toolbar.
- Click **Publish** to commit `published-storymap.json` to `main`.
- Public `storymap.html` loads `published-storymap.json` first (global), then falls back to embedded default data if the fetch fails.

### GitHub PAT requirements

- Token type: fine-grained PAT
- Repository access: `bennetthylen/storymap-relationship-graph`
- Permission: **Contents: Read and write**

### Notes

- GitHub Pages may take about 1 minute to show the latest publish.
- The PAT is saved in this browser’s `localStorage` so you can reuse the same token after closing the tab (use **Forget PAT** to remove it).
- Failed publish attempts do not delete local admin drafts.

## Routes

- `index.html`: Landing page + public Storymap viewer
- `storymap.html`: Public Storymap canvas page
- `history.html`: Public history placeholder page (editable content source)
- `discussion.html`: Public discussion board (anonymous posts/replies persisted in browser storage)
- `admin.html`: Password-protected Storymap/content editor

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

