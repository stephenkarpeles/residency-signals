"""Match 2026 FREIDA survey data onto local program tuples."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FREIDA_PATH = ROOT / "freida_obgyn_2026.json"

# Live headcount from the program's published 2026–27 resident roster.
ROSTER_OVERRIDES = {
    "University of Illinois College of Medicine at Peoria": {
        "md": 33,
        "do": 40,
        "img": 27,
        "source": "roster",
    },
}

# Our dataset name -> FREIDA listing name when the strings differ.
NAME_ALIASES = {
    "University of Massachusetts": "UMass Chan Medical School Program",
    "Albany Medical Center": "Albany Med Health System Program",
    "Hackensack University Medical Center": "Hackensack Meridian Health Program",
    "MedStar Health/Washington Hospital Center": "MedStar Health Georgetown University/Washington Hospital Center Program",
    "Wake Forest University School of Medicine": "Wake Forest University Baptist Medical Center Program",
    "University of Alabama Medical Center": "University of Alabama Hospital (Birmingham) Program",
    "Louisiana State University (Baton Rouge)": "Louisiana State University School of Medicine (Baton Rouge) Program",
    "Methodist Hospital (Houston)": "Houston Methodist Hospital (Medical Center) Program",
    "Texas A&M College of Medicine-Scott and White Medical Center": "Baylor Scott & White Medical Center - Baylor College of Medicine (Temple) Program",
    "Corewell Health (Royal Oak)": "Corewell Health William Beaumont University Hospital Program",
    "University of Iowa Hospitals and Clinics": "University of Iowa Health Care Medical Center Program",
    "University of Southern California/LAC+USC Medical Center": "University of Southern California/Los Angeles General Medical Center (USC/LA General) Program",
    "Bayfront Health St Petersburg": "Orlando Health Bayfront Hospital Program",
    "HCA Healthcare/USF Morsani College of Medicine GME: Brandon Regional Hospital": "HCA Florida Healthcare/USF Morsani College of Medicine GME - Tampa South/Brandon Hospital Program",
    "Akron General Medical Center/NEOMED": "Cleveland Clinic Foundation/Akron General Program",
    "Beaumont Health (Farmington Hills)": "Corewell Health (Farmington Hills) Program",
    "Beaumont Health (Trenton)": "Corewell Health (Trenton) Program",
    "Sparrow Hospital/Michigan State University": "University of Michigan Health - Sparrow/Michigan State University Program",
    "St Joseph Mercy Ann Arbor": "Trinity Health Ann Arbor Hospital Program",
    "St Joseph Mercy-Oakland": "Trinity Health Oakland/Wayne State University Program",
    "Atlantic Health (Morristown)": "Atlantic Health System/Morristown Medical Center Program",
    "Jersey Shore University Medical Center": "Hackensack Meridian Health Program",
    "Albert Einstein Healthcare Network": "Jefferson Health Medical Education/Jefferson Einstein Philadelphia Hospital Program",
    "Oklahoma State University Center for Health Sciences": "Osteopathic Medical Education Consortium of Oklahoma, Inc. (OMECO)/Oklahoma State University Program",
    "HCA Medical City Healthcare UNT-TCU Graduate Medical Education": "HCA Medical City Healthcare GME (Arlington) Program",
    "Doctors Hospital at Renaissance / University of Texas RGV": "Doctors Hospital at Renaissance, Ltd. Program",
    "Good Samaritan Hospital Medical Center": "Good Samaritan University Hospital Program",
    "Rochester General Hospital": "Rochester Regional Health Program",
    "Oregon Health & Science University": "Oregon Health & Science University (OHSU Health) Program",
    "University of Michigan Health System": "University of Michigan Program",
    "New York Medical College at Westchester Medical Center": "Westchester Medical Center Program",
    "University of Rochester": "University of Rochester Medical Center Program",
    "WellStar Kennestone Regional Medical Center": "Wellstar Health System/WellStar Kennestone Regional Medical Center Program",
    "Louisiana State University": "Louisiana State University School of Medicine Program",
    "University of Arkansas for Medical Sciences": "University of Arkansas for Medical Sciences (UAMS) College of Medicine Program",
    "University of Texas Health Science Center San Antonio": "University of Texas Health Science Center San Antonio Joe and Teresa Lozano Long School of Medicine Program",
    "John Peter Smith Hospital": "John Peter Smith Hospital (Tarrant County Hospital District) Program",
    "Central Michigan University College of Medicine": "Central Michigan University College of Medicine/CMU Medical Education Partners Program",
    "Metro Health University of Michigan Health (Metro Health)": "University of Michigan Health-West Program",
    "Charleston Area Medical Center/West Virginia University (Charleston Division)": "Charleston Area Medical Center/CAMC Institute for Academic Medicine Program",
    "HCA Houston Healthcare (West)/University of Houston": "HCA Houston Healthcare/University of Houston Program",
    "New Hanover Regional Medical Center": "Novant Health New Hanover Regional Medical Center Program",
    "New York Medical College (St. Mary's Passaic)": "New York Medical College Program",
}


def _norm_name(value: str) -> str:
    value = value.lower()
    value = re.sub(r"\bprogram\b", "", value)
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def _norm_city(value: str) -> str:
    value = value.lower().replace("saint ", "st ").replace("st.", "st")
    return re.sub(r"[^a-z0-9]+", "", value)


def _to_ints(md: float | None, do: float | None, img: float | None) -> tuple[int, int, int] | None:
    raw = [md, do, img]
    if all(v is None for v in raw):
        return None
    nums = [0.0 if v is None else float(v) for v in raw]
    total = sum(nums)
    if total <= 0:
        return None
    scaled = [v * 100.0 / total for v in nums]
    floors = [int(v) for v in scaled]
    leftover = 100 - sum(floors)
    order = sorted(range(3), key=lambda i: (scaled[i] - floors[i], scaled[i]), reverse=True)
    for i in order[:leftover]:
        floors[i] += 1
    return floors[0], floors[1], floors[2]


@lru_cache(maxsize=1)
def _freida_rows() -> list[dict]:
    return json.loads(FREIDA_PATH.read_text())


def _lookup(name: str, city: str, state: str) -> dict | None:
    rows = _freida_rows()
    target = _norm_name(NAME_ALIASES.get(name, name))
    city_n = _norm_city(city)
    state_n = state.upper()

    same_place = [
        row
        for row in rows
        if (row.get("state") or "").upper() == state_n and _norm_city(row.get("city") or "") == city_n
    ]
    for row in same_place:
        if _norm_name(row["name"]) == target:
            return row

    exact = [row for row in rows if _norm_name(row["name"]) == target]
    if len(exact) == 1:
        return exact[0]
    for row in exact:
        if _norm_city(row.get("city") or "") == city_n:
            return row

    best = None
    best_score = 0.0
    tokens = set(target.split())
    pool = same_place or rows
    for row in pool:
        other = set(_norm_name(row["name"]).split())
        if not tokens or not other:
            continue
        score = len(tokens & other) / len(tokens | other)
        if score > best_score:
            best_score = score
            best = row
    if best and best_score >= 0.72:
        return best
    return None


def overlay_for(name: str, city: str, state: str) -> dict:
    """Return class_size / mix / source keys when FREIDA or a roster override exists."""
    out: dict = {}
    roster = ROSTER_OVERRIDES.get(name)
    row = _lookup(name, city, state)
    if row:
        if row.get("class_size"):
            out["class_size"] = int(row["class_size"])
        mix = _to_ints(row.get("md"), row.get("do"), row.get("img"))
        if mix and not roster:
            out["md"], out["do"], out["img"] = mix
            out["source"] = "published"
        out["matched"] = True
    if roster:
        out.update(roster)
    return out
