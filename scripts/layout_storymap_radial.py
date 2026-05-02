#!/usr/bin/env python3
"""
Radial layout for published-storymap.json: children on rotated rings around each parent.
Central intro → three hubs on separated bearings (not stacked on one downward spine); each hub’s
images fill circles with staggered angles and generous radii to reduce overlap.

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
HUB_ORDER = ["n_5cd72ca5", "n_011e6d0c", "n_ea58683f"]
# 120° apart on a full circle (0°, 120°, 240°): not all in the lower ~60–120° sector, so edges radiate
# in every direction from the center instead of reading as one vertical “waterfall.”
HUB_THETA = {
    "n_5cd72ca5": 0.0,
    "n_011e6d0c": 2 * math.pi / 3,
    "n_ea58683f": 4 * math.pi / 3,
}

R_HUB_ORBIT = 1180.0

R_CHILD_FIRST = 760.0
R_CHILD_STEP = 820.0
PER_RING = 7

R_CHAIN_FIRST = 480.0
CHAIN_STEP = 520.0
CHAIN_PER_RING = 10


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


def outward_base_angle(cx: float, cy: float) -> float:
    """Angle from world origin toward (cx, cy); rotate child rings so mass radiates away from the central node."""
    if abs(cx) < 1e-9 and abs(cy) < 1e-9:
        return 0.0
    return math.atan2(cy, cx)


def radial_place(
    cx: float,
    cy: float,
    child_ids: list[str],
    out: dict[str, tuple[float, float]],
    r0: float,
    ring_step: float,
    per_ring: int,
    phase: float = 0.0,
) -> None:
    if not child_ids:
        return
    base_phi = outward_base_angle(cx, cy)
    n = len(child_ids)
    ring = 0
    i = 0
    while i < n:
        batch = child_ids[i : i + per_ring]
        m = len(batch)
        r = r0 + ring * ring_step
        twist = ring * (math.pi / max(7, m))
        for j, nid in enumerate(batch):
            theta = base_phi + 2 * math.pi * (j + 0.5) / m + phase + twist
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

    for hid in HUB_ORDER:
        theta = HUB_THETA[hid]
        pos[hid] = (
            R_HUB_ORBIT * math.cos(theta),
            R_HUB_ORBIT * math.sin(theta),
        )

    for hi, hid in enumerate(HUB_ORDER):
        kids = [c for c in children.get(hid, []) if c in ids]
        hub_phase = hi * (2 * math.pi / 11)
        radial_place(
            pos[hid][0],
            pos[hid][1],
            kids,
            pos,
            R_CHILD_FIRST,
            R_CHILD_STEP,
            PER_RING,
            phase=hub_phase,
        )

    for _ in range(128):
        progressed = False
        for pid in list(pos.keys()):
            pending = [c for c in children.get(pid, []) if c in ids and c not in pos]
            if not pending:
                continue
            pid_phase = (sum(ord(c) for c in pid) % 360) / 360.0 * 2 * math.pi * 0.35
            radial_place(
                pos[pid][0],
                pos[pid][1],
                pending,
                pos,
                R_CHAIN_FIRST,
                CHAIN_STEP,
                CHAIN_PER_RING,
                phase=pid_phase,
            )
            progressed = True
        if not progressed:
            break

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
