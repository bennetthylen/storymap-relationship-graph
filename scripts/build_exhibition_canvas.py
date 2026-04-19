#!/usr/bin/env python3
"""Generate default storymap canvas JSON for the exhibition layout (root + 3 themes + 51 nodes)."""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def polar(cx: float, cy: float, r: float, deg: float) -> tuple[int, int]:
    rad = deg * math.pi / 180.0
    return (int(round(cx + r * math.cos(rad))), int(round(cy + r * math.sin(rad))))


def main() -> None:
    root_id = "exh_root"
    t_move = "exh_theme_movement"
    t_rel = "exh_theme_relation"
    t_work = "exh_theme_work"

    c = (580, 460)
    r_theme = 150
    theme_angles = (215, 25, 115)
    theme_labels = (
        "1. On movement",
        "2. On reassembling relations",
        "3. On work",
    )
    theme_colors = ("teal", "blue", "orange")

    nodes: list[dict] = [
        {
            "id": root_id,
            "type": "text",
            "label": "Women are always on the move",
            "text": (
                "Exhibition storymap scaffold. Edit labels and descriptions in admin. "
                "Photos are not pulled from Google Drive automatically; add an image or URL per node in admin if you want pictures. "
                "Drive folders: Mobility wall, Relation Room, Work — plus overview PDFs."
            ),
            "color": "white",
            "x": c[0],
            "y": c[1],
        }
    ]

    theme_ids = (t_move, t_rel, t_work)
    for i, tid in enumerate(theme_ids):
        p = polar(c[0], c[1], r_theme, theme_angles[i])
        nodes.append(
            {
                "id": tid,
                "type": "text",
                "label": theme_labels[i],
                "text": "",
                "color": theme_colors[i],
                "x": p[0],
                "y": p[1],
            }
        )

    leaf_id: dict[int, str] = {}

    def add_cluster(start: int, end: int, cx: float, cy: float, r_leaf: float, a0: float, a1: float) -> None:
        n = end - start + 1
        for i, num in enumerate(range(start, end + 1)):
            t = i / (n - 1) if n > 1 else 0.5
            a = a0 + t * (a1 - a0)
            p = polar(cx, cy, r_leaf, a)
            lid = f"exh_leaf_{num:02d}"
            leaf_id[num] = lid
            nodes.append(
                {
                    "id": lid,
                    "type": "text",
                    "label": str(num),
                    "text": "",
                    "color": "green",
                    "x": p[0],
                    "y": p[1],
                }
            )

    # Arc centers: movement = upper arc, relations = right, work = lower arc
    top_arc_c = (580, 120)
    right_arc_c = (900, 460)
    bottom_arc_c = (580, 760)

    # Upper semicircle (angles sweep over the top of the diagram; radius clears root)
    add_cluster(1, 18, top_arc_c[0], top_arc_c[1], 300, 175, 5)
    # Right-side cluster
    add_cluster(19, 33, right_arc_c[0], right_arc_c[1], 200, -50, 50)
    # Lower arc
    add_cluster(34, 51, bottom_arc_c[0], bottom_arc_c[1], 220, 205, 335)

    edges: list[dict] = []
    edges.append({"source": root_id, "target": t_move, "label": ""})
    edges.append({"source": root_id, "target": t_rel, "label": ""})
    edges.append({"source": root_id, "target": t_work, "label": ""})

    for n in range(1, 19):
        edges.append({"source": t_move, "target": leaf_id[n], "label": ""})
    for n in range(19, 34):
        edges.append({"source": t_rel, "target": leaf_id[n], "label": ""})
    for n in range(34, 52):
        edges.append({"source": t_work, "target": leaf_id[n], "label": ""})

    canvas = {"entryNodeIds": [root_id], "nodes": nodes, "edges": edges}

    out_json = ROOT / "published-storymap.json"
    out_json.write_text(json.dumps(canvas, indent=2) + "\n", encoding="utf-8")

    app_js = ROOT / "app.js"
    text = app_js.read_text(encoding="utf-8")
    start = text.index("const PUBLISHED_STORYMAP_CANVAS = ")
    end = text.index("const PUBLISHED_STORYMAP_RELEASE = ", start)
    block = "const PUBLISHED_STORYMAP_CANVAS = " + json.dumps(canvas, indent=2) + ";\n"
    new_text = text[:start] + block + text[end:]
    app_js.write_text(new_text, encoding="utf-8")

    release_line = 'const PUBLISHED_STORYMAP_RELEASE = "2026-04-19-exhibition";\n'
    rt = new_text.index("const PUBLISHED_STORYMAP_RELEASE = ")
    rt_end = new_text.index("\n", rt) + 1
    new_text = new_text[:rt] + release_line + new_text[rt_end:]
    app_js.write_text(new_text, encoding="utf-8")

    print(f"Wrote {out_json} ({len(canvas['nodes'])} nodes, {len(canvas['edges'])} edges)")
    print("Updated app.js PUBLISHED_STORYMAP_CANVAS and release id.")


if __name__ == "__main__":
    main()
