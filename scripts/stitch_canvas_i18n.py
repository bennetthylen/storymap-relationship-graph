#!/usr/bin/env python3
"""Merge i18n/canvas-labels.json + i18n/canvas-bodies/<lang>/*.txt into canvas-nodes-i18n.js"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LANGS = ("ar", "it", "fr", "es", "de")

# Long hub essays use short filenames; must stay aligned with i18n/canvas-bodies/<lang>/.
SLUG_OVERRIDES = {
    "Women are Always on the Move": "women-are-always-on-the-move",
    "On Work": "on-work",
    "On Mobility": "on-mobility",
    "Wedad Mitri and Sedad Louka's Wedding Photo": "wedding-photo",
    "On Re-Assembling Relations": "on-reassembling-relations",
}


def slugify(label: str) -> str:
    s = label.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "node"


def slug_for_label(label: str) -> str:
    return SLUG_OVERRIDES.get(label) or slugify(label)


def main() -> None:
    labels_path = ROOT / "i18n" / "canvas-labels.json"
    labels = json.loads(labels_path.read_text(encoding="utf-8"))
    out: dict[str, dict[str, dict[str, str]]] = {}
    for lang in LANGS:
        out[lang] = {}
        for eng_label in sorted(labels.keys()):
            slug = slug_for_label(eng_label)
            body_file = ROOT / "i18n" / "canvas-bodies" / lang / f"{slug}.txt"
            text = body_file.read_text(encoding="utf-8") if body_file.exists() else ""
            lbl = labels[eng_label][lang]
            out[lang][eng_label] = {"label": lbl, "text": text}
    target = ROOT / "canvas-nodes-i18n.js"
    js = "var STORYMAP_CANVAS_NODE_I18N = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n"
    target.write_text(js, encoding="utf-8")
    print("Wrote", target, "chars", len(js), "labels", len(labels))


if __name__ == "__main__":
    main()
