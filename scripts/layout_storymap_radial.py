#!/usr/bin/env python3
"""
Radial layout for published-storymap.json: each node's children sit on evenly spaced
rings around their parent (mother). Central intro → three hubs on a lower arc; each hub's
images on full circles (multiple rings when crowded).

Run from repo root: python3 scripts/layout_storymap_radial.py
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "published-storymap.json"

CENTRAL = "p_7d1c0cfc-8703-4aaf-9d21-ba7e23ad1092"
# Left arc → center bottom → right arc (matches On Work | On Mobility | On Reassembling Relations)
HUB_ORDER = ["n_5cd72ca5", "n_011e6d0c", "n_ea58683f"]

R_HUB_ORBIT = 1080.0
# Polar angle from +x axis (math convention); pi/2 is downward on screen (y increases).
HUB_ANGLES = [3 * math.pi / 4, math.pi / 2, math.pi / 4]

R_CHILD_FIRST = 520.0
R_CHILD_STEP = 560.0
PER_RING = 10

R_CHAIN_LEAF = 340.0


def collect_children(edges: list) -> dict[str, list[str]]:
    ch: dict[str, list[str]] = defaultdict(list)
    for e in edges:
        s = e.get("source")
        t = e.get("target")
        if not s or not t or s == t:
            continue
        ch[s].append(t)
    for k in ch:
        ch[k] = sorted(set(ch[k]))
    return dict(ch)


def radial_place(
    cx: float,
    cy: float,
    child_ids: list[str],
    out: dict[str, tuple[float, float]],
    r0: float,
    ring_step: float,
    per_ring: int,
) -> None:
    if not child_ids:
        return
    n = len(child_ids)
    ring = 0
    i = 0
    while i < n:
        batch = child_ids[i : i + per_ring]
        m = len(batch)
        r = r0 + ring * ring_step
        for j, nid in enumerate(batch):
            theta = 2 * math.pi * j / m
            out[nid] = (cx + r * math.cos(theta), cy + r * math.sin(theta))
        i += per_ring
        ring += 1


def main() -> None:
    raw = PATH.read_text(encoding="utf-8")
    data = json.loads(raw)
    nodes = data["nodes"]
    edges = data["edges"]
    ids = {n["id"] for n in nodes}
    children = collect_children(edges)

    pos: dict[str, tuple[float, float]] = {}

    pos[CENTRAL] = (0.0, 0.0)

    for hid, theta in zip(HUB_ORDER, HUB_ANGLES):
        pos[hid] = (
            R_HUB_ORBIT * math.cos(theta),
            R_HUB_ORBIT * math.sin(theta),
        )

    for hid in HUB_ORDER:
        kids = [c for c in children.get(hid, []) if c in ids]
        radial_place(
            pos[hid][0],
            pos[hid][1],
            kids,
            pos,
            R_CHILD_FIRST,
            R_CHILD_STEP,
            PER_RING,
        )

    # Chains (e.g. Gam3aya image → Gam3aya text): propagate outward until every targeted node has xy.
    for _ in range(128):
        progressed = False
        for pid in list(pos.keys()):
            pending = [c for c in children.get(pid, []) if c in ids and c not in pos]
            if not pending:
                continue
            radial_place(
                pos[pid][0],
                pos[pid][1],
                pending,
                pos,
                R_CHAIN_LEAF,
                400.0,
                12,
            )
            progressed = True
        if not progressed:
            break

    # Anything still missing: grid fallback (should not happen)
    ix = 0
    for n in nodes:
        nid = n["id"]
        if nid not in pos:
            pos[nid] = (2600.0 + (ix % 6) * 120.0, 800.0 + (ix // 6) * 120.0)
            ix += 1

    for n in nodes:
        nid = n["id"]
        x, y = pos[nid]
        n["x"] = round(x, 6)
        n["y"] = round(y, 6)

    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote radial layout to", PATH)


if __name__ == "__main__":
    main()
