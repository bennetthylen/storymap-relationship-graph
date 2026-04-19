#!/usr/bin/env python3
"""
Rebuild app.js embedded PUBLISHED_STORYMAP_CANVAS from published-storymap.json.

Strips data: URLs from imageSrc/photo/content so the fallback stays small (~few KB)
while matching the same node ids, edges, and labels as the live published file.
Run after changing published-storymap.json, then commit app.js.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLISHED = ROOT / "published-storymap.json"
APP_JS = ROOT / "app.js"

MARK_START = "const PUBLISHED_STORYMAP_CANVAS = "
MARK_END = "\nconst PUBLISHED_STORYMAP_RELEASE = "


def strip_data_urls(obj):
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in ("imageSrc", "photo") and isinstance(v, str) and "base64" in v:
                out[k] = ""
            elif k == "content" and isinstance(v, str) and v.startswith("data:image"):
                out[k] = ""
            else:
                out[k] = strip_data_urls(v)
        return out
    if isinstance(obj, list):
        return [strip_data_urls(x) for x in obj]
    return obj


def main() -> None:
    raw = json.loads(PUBLISHED.read_text(encoding="utf-8"))
    canvas = strip_data_urls(raw)
    block = MARK_START + json.dumps(canvas, indent=2) + ";"
    text = APP_JS.read_text(encoding="utf-8")
    i0 = text.index(MARK_START)
    i1 = text.index(MARK_END)
    new_text = text[:i0] + block + text[i1:]
    APP_JS.write_text(new_text, encoding="utf-8")
    print(f"Updated embedded fallback from {PUBLISHED} ({len(canvas.get('nodes', []))} nodes).")


if __name__ == "__main__":
    main()
