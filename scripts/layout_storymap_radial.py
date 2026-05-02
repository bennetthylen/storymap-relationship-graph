#!/usr/bin/env python3
"""
Radial layout for published-storymap.json: children fan outward from each theme hub.

Central intro → three hubs (On Work, On Mobility, On Reassembling Relations) on separated bearings.
Under each hub, nodes sit on arcs whose outward axis follows the ray from the archive center through
that hub (semicircle facing away from the center). Relaxation runs **per theme subtree** so thumbnails
spread under their hub without global packing that collapses wedges together; a light cross-wedge pass
separates nodes from different hubs when they collide.

Run from repo root: python3 scripts/layout_storymap_radial.py
"""
from __future__ import annotations

import json
import math
import time
from collections import defaultdict, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "published-storymap.json"

CENTRAL = "p_7d1c0cfc-8703-4aaf-9d21-ba7e23ad1092"
# Theme hubs (labels): On Work, On Mobility, On Reassembling Relations — each subtree fans outward here.
HUB_ORDER = ["n_5cd72ca5", "n_011e6d0c", "n_ea58683f"]
HUB_SET = frozenset(HUB_ORDER)
# Same −π/2 + k·2π/3 triangle as v4, but **which hub sits at the top vertex** matters for viewport balance:
# Mobility has the largest subtree — assign it −π/2 (above center) so those thumbnails aren’t pulled toward +y.
HUB_THETA = {
    "n_011e6d0c": -math.pi / 2,
    "n_5cd72ca5": -math.pi / 2 + 2 * math.pi / 3,
    "n_ea58683f": -math.pi / 2 + 4 * math.pi / 3,
}

R_HUB_ORBIT = 920.0

R_CHILD_FIRST = 540.0
R_CHILD_STEP = 640.0
PER_RING = 6

R_CHAIN_FIRST = 400.0
CHAIN_STEP = 480.0
CHAIN_PER_RING = 8

# Place children on an arc along the ray from the archive center through the parent.
# Use a 120° wedge (not 180°): full half-planes wrap mass toward +y (screen-down) and look like vertical “waterfall” edges.
CHILD_ARC_SPAN = 2 * math.pi / 3


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


def bfs_depth_from_roots(
    children: dict[str, list[str]], root_ids: list[str], ids: set[str]
) -> dict[str, int]:
    """Shortest hop count from any root along directed edges (parent → child)."""
    depth: dict[str, int] = {}
    q: deque[tuple[str, int]] = deque()
    for r in root_ids:
        if r in ids:
            q.append((r, 0))
    while q:
        nid, d = q.popleft()
        if nid in depth:
            continue
        depth[nid] = d
        for c in children.get(nid, []):
            if c in ids and c not in depth:
                q.append((c, d + 1))
    return depth


def radial_place(
    cx: float,
    cy: float,
    child_ids: list[str],
    out: dict[str, tuple[float, float]],
    r0: float,
    ring_step: float,
    per_ring: int,
    phase: float = 0.0,
    arc_span: float = CHILD_ARC_SPAN,
) -> None:
    """Place children on arcs of circles centered at the archive origin — edges radiate *outward* from center,
    not as arbitrary offsets that collapse toward +y (screen-down) in tall vertical spines."""
    if not child_ids:
        return
    hub_dist = math.hypot(cx, cy)
    if hub_dist < 1e-9:
        base_phi = 0.0
    else:
        base_phi = math.atan2(cy, cx)
    n = len(child_ids)
    ring = 0
    i = 0
    while i < n:
        batch = child_ids[i : i + per_ring]
        m = len(batch)
        rmag = r0 + ring * ring_step
        twist = ring * (math.pi / max(7, m))
        half = arc_span / 2
        for j, nid in enumerate(batch):
            t = -half + arc_span * (j + 0.5) / m
            theta = base_phi + t + phase + twist
            r_world = hub_dist + rmag
            out[nid] = (r_world * math.cos(theta), r_world * math.sin(theta))
        i += per_ring
        ring += 1


def build_parent_map(edges: list) -> dict[str, str]:
    """target -> source (last edge wins if duplicates)."""
    parent: dict[str, str] = {}
    for e in edges:
        s, t = e.get("source"), e.get("target")
        if s and t:
            parent[t] = s
    return parent


def theme_hub_for(
    nid: str,
    parent: dict[str, str],
    central: str,
    hubs: frozenset[str],
) -> str | None:
    """Walk parents until we hit On Work / On Mobility / On Reassembling Relations."""
    x: str | None = nid
    seen: set[str] = set()
    while x and x != central:
        if x in hubs:
            return x
        if x in seen:
            return None
        seen.add(x)
        x = parent.get(x)
    return None


def relax_overlap_subset(
    pos: dict[str, tuple[float, float]],
    anchor_ids: set[str],
    keys: list[str],
    iterations: int = 160,
    min_dist: float = 460.0,
) -> None:
    """Push apart nodes within one list only (same theme hub subtree)."""
    movable = [k for k in keys if k not in anchor_ids]
    for _ in range(iterations):
        moved = False
        for i, a in enumerate(movable):
            for b in movable[i + 1 :]:
                ax, ay = pos[a]
                bx, by = pos[b]
                dx, dy = bx - ax, by - ay
                dist = math.hypot(dx, dy)
                if dist >= min_dist or dist < 1e-6:
                    continue
                push = (min_dist - dist) / 2 + 4
                ux, uy = dx / dist, dy / dist
                pos[a] = (ax - ux * push, ay - uy * push)
                pos[b] = (bx + ux * push, by + uy * push)
                moved = True
        if not moved:
            break


def relax_cross_partition(
    pos: dict[str, tuple[float, float]],
    anchor_ids: set[str],
    hub_partitions: dict[str, list[str]],
    iterations: int = 120,
    min_dist: float = 360.0,
) -> None:
    """Separate nodes from different theme hubs when thumbnails collide between wedges."""
    hubs = [h for h in HUB_ORDER if hub_partitions.get(h)]
    for _ in range(iterations):
        moved = False
        for ii in range(len(hubs)):
            for jj in range(ii + 1, len(hubs)):
                ha, hb = hubs[ii], hubs[jj]
                for a in hub_partitions[ha]:
                    if a in anchor_ids:
                        continue
                    for b in hub_partitions[hb]:
                        if b in anchor_ids:
                            continue
                        ax, ay = pos[a]
                        bx, by = pos[b]
                        dx, dy = bx - ax, by - ay
                        dist = math.hypot(dx, dy)
                        if dist >= min_dist or dist < 1e-6:
                            continue
                        push = (min_dist - dist) / 2 + 3
                        ux, uy = dx / dist, dy / dist
                        pos[a] = (ax - ux * push, ay - uy * push)
                        pos[b] = (bx + ux * push, by + uy * push)
                        moved = True
        if not moved:
            break


def main() -> None:
    raw = PATH.read_text(encoding="utf-8")
    data = json.loads(raw)
    nodes = data["nodes"]
    edges = data["edges"]
    ids = {n["id"] for n in nodes}
    parent_map = build_parent_map(edges)
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

    depth = bfs_depth_from_roots(children, [CENTRAL], ids)

    for _ in range(256):
        progressed = False
        parents_with_pending = []
        for pid in pos:
            pending = [c for c in children.get(pid, []) if c in ids and c not in pos]
            if pending:
                parents_with_pending.append((depth.get(pid, 9999), pid, pending))
        # Expand shallow subtrees first so deep chains don’t get squeezed into one wedge.
        parents_with_pending.sort(key=lambda t: (t[0], t[1]))
        for _, pid, pending in parents_with_pending:
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

    anchor = {CENTRAL, *HUB_ORDER}
    # Global relaxation destroyed radial “fan from each hub” by shuffling Mobility vs Work vs Relations.
    # Relax only within each theme subtree so nodes stay grouped under their hub but spread for thumbnails.
    partitions_typed: dict[str, list[str]] = defaultdict(list)
    for nid in ids:
        if nid in anchor:
            continue
        th = theme_hub_for(nid, parent_map, CENTRAL, HUB_SET)
        if th:
            partitions_typed[th].append(nid)
    for hid in HUB_ORDER:
        relax_overlap_subset(pos, anchor, partitions_typed.get(hid, []))
    relax_cross_partition(pos, anchor, dict(partitions_typed))

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

    data["_layoutRevision"] = int(time.time())
    data["_layoutAlgo"] = "hub-partition-v6-center-view-spread"

    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote radial layout to", PATH)


if __name__ == "__main__":
    main()
