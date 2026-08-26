"""Match published / state / CMS hospital birth totals onto residency programs."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Direct hospital/program counts from public reports or hospital publications.
PUBLISHED = {
    "University of Texas Southwestern Medical Center": (13374, "Parkland Health FY2025 statistics"),
    "Orlando Health": (14500, "Orlando Health Winnie Palmer Hospital (published ~14,500 births)"),
    "Mass General Brigham/Brigham and Women's Hospital/Massachusetts General Hospital": (
        6200,
        "Brigham and Women's Hospital published obstetric volume",
    ),
    "Women and Infants Hospital of Rhode Island/Brown University": (
        8500,
        "Women & Infants Hospital of Rhode Island published obstetric volume",
    ),
    "Inova Fairfax Medical Campus": (10000, "Inova Fairfax Hospital published obstetric volume"),
    "McGaw Medical Center of Northwestern University": (
        12000,
        "Northwestern Memorial / Prentice Women's Hospital published obstetric volume",
    ),
    "UPMC Medical Education": (10500, "UPMC Magee-Womens Hospital published obstetric volume"),
    "Christiana Care Health Services": (6200, "Christiana Hospital published obstetric volume"),
    "Maimonides Medical Center": (7500, "Maimonides Medical Center published obstetric volume"),
    "Womack Army Medical Center": (
        3000,
        "Womack Army Medical Center (~200–300 deliveries/month)",
    ),
    "Madigan Army Medical Center": (1500, "Madigan Army Medical Center (~1,500 births/year)"),
    "Naval Medical Center (Portsmouth)": (
        1770,
        "Naval Medical Center Portsmouth (1,770 births in 2023)",
    ),
    "National Capital Consortium": (962, "Walter Reed National Military Medical Center FY2024 births"),
    "Tripler Army Medical Center": (1289, "Tripler Army Medical Center (~1,289 births/year)"),
    "San Antonio Uniformed Services Health Education Consortium": (
        1620,
        "Brooke Army Medical Center (~120–150 deliveries/month)",
    ),
    "OhioHealth/Doctors Hospital": (944, "OhioHealth Doctors Hospital Leapfrog live births"),
    "Florida State University College of Medicine (Cape Coral)": (
        1680,
        "Lee Health Cape Coral Hospital (~130–147 births/month)",
    ),
    "HCA Healthcare/Mercer University School of Medicine/Summerville Medical Center": (
        2800,
        "HCA Healthcare Summerville / Trident Health (>2,800 births/year)",
    ),
    "Osteopathic Medical Education Consortium of Oklahoma, Inc. (OMECO)": (
        4200,
        "Saint Francis Hospital Tulsa (OSU/OMECO published obstetric volume)",
    ),
    "University of Tennessee College of Medicine (Nashville)": (
        7000,
        "Ascension Saint Thomas Hospital Midtown (~7,000 deliveries/year)",
    ),
}

# Program name -> hospital name tokens used when the residency name differs from the birthing hospital.
HOSPITAL_ALIASES = {
    "University of Texas Southwestern Medical Center": "parkland dallas county hospital district",
    "University of Miami/Jackson Health System": "jackson memorial",
    "University of Southern California/LAC+USC Medical Center": "los angeles general",
    "Los Angeles County-Harbor-UCLA Medical Center": "harbor ucla",
    "UCLA David Geffen School of Medicine/UCLA Medical Center": "ronald reagan ucla",
    "University of California (San Francisco)": "ucsf medical center at mission bay",
    "Stanford Health Care-Sponsored Stanford University": "lucile packard children",
    "University of California (San Diego) Medical Center": "ucsd health la jolla",
    "University of California Davis Health": "uc davis medical center",
    "Loma Linda University Health Education Consortium": "loma linda university children",
    "Kaiser Permanente Northern California (San Francisco)": "kaiser foundation hospital san francisco",
    "Kaiser Permanente Northern California (Oakland)": "kaiser foundation hospital oakland richmond",
    "Kaiser Permanente Northern California (Santa Clara)": "kaiser foundation hospital santa clara",
    "Kaiser Permanente Southern California (Los Angeles)": "kaiser foundation hospital los angeles",
    "Sutter Health/Alta Bates Summit Medical Center": "alta bates summit medical center alta bates campus",
    "Adventist Health White Memorial": "white memorial",
    "New York Presbyterian Hospital (Columbia Campus)": "columbia presbyterian",
    "New York Presbyterian Hospital (Cornell Campus)": "david h koch center",
    "NYU Grossman School of Medicine": "nyu langone hospitals",
    "Icahn School of Medicine at Mount Sinai (Mount Sinai Hospital)": "mount sinai hospital",
    "Icahn School of Medicine at Mount Sinai (West)": "mount sinai west",
    "Zucker School of Medicine at Hofstra/Northwell": "north shore university hospital",
    "Zucker School of Medicine at Hofstra/Northwell at Lenox Hill Hospital": "lenox hill",
    "Montefiore Medical Center/Albert Einstein College of Medicine": "weiler",
    "University at Buffalo": "oishei children",
    "University at Buffalo (Sisters of Charity)": "sisters of charity hospital",
    "University of Rochester": "strong memorial",
    "SUNY Upstate Medical University": "crouse hospital",
    "New York Medical College at Westchester Medical Center": "westchester medical center",
    "SUNY Downstate Health Sciences University": "kings county hospital",
    "University of Massachusetts": "umass memorial",
    "University of Connecticut": "john dempsey",
    "Detroit Medical Center/Wayne State University": "hutzel",
    "University of Michigan Health System": "univ of mi hospitals",
    "Baylor College of Medicine": "harris health",
    "University of Texas Health Science Center at Houston": "memorial hermann texas medical cntr",
    "Carolinas Medical Center": "atrium health carolinas medical center",
    "MedStar Health/Washington Hospital Center": "medstar washington hospital center",
    "University of Pennsylvania Health System": "hospital of the university of pennsylvania",
    "Sidney Kimmel Medical College at Thomas Jefferson University/TJUH": "thomas jefferson",
    "Temple University Hospital": "temple university hospital",
    "Johns Hopkins University": "johns hopkins hospital",
    "University of Maryland": "university of maryland medical center",
    "Emory University School of Medicine": "grady",
    "University of Alabama Medical Center": "university of alabama hospital",
    "Vanderbilt University Medical Center": "vanderbilt university medical center",
    "University of Tennessee": "regional one",
    "Louisiana State University": "touro infirmary",
    "Washington University/B-JH/SLCH Consortium": "barnes jewish",
    "University of Chicago": "university of chicago medical center",
    "University of Illinois College of Medicine at Chicago": "university of illinois hospital",
    "Rush University Medical Center": "rush university",
    "Indiana University School of Medicine": "indiana university health",
    "Ohio State University/Mount Carmel Hospital": "the ohio state university hospital",
    "Case Western Reserve University/University Hospitals Cleveland Medical Center": "uh cleveland medical center",
    "Cleveland Clinic Foundation": "cleveland clinic",
    "University of Wisconsin Hospitals and Clinics": "meriter hospital",
    "Medical College of Wisconsin Affiliated Hospitals": "froedtert",
    "University of Minnesota": "university of minnesota medical center",
    "Mayo Clinic College of Medicine and Science (Rochester)": "mayo clinic hospital rochester",
    "University of Iowa Hospitals and Clinics": "university of iowa",
    "University of Colorado": "university of co hospital",
    "University of Utah Health": "u of u hospitals",
    "University of Washington": "university of washington medical center",
    "Oregon Health & Science University": "ohsu hospital",
    "University of Hawaii": "kapiolani",
    "Rutgers Health/New Jersey Medical School": "uh university hospital newark",
    "Old Dominion University": "sentara norfolk general",
    "Wake Forest University School of Medicine": "north carolina baptist",
    "Mountain Area Health Education Center": "mission hospital",
    "Morehouse School of Medicine": "grady memorial",
    "Meharry Medical College": "metro nashville general",
    "University of Central Florida/HCA Florida Healthcare (Greater Orlando/Osceola)": "osceola regional",
    "Tulane University": "touro infirmary",
    "Louisiana State University (Shreveport)": "ochsner lsu health st mary",
    "University of Oklahoma Health Sciences Center": "ou medical center",
    "University of Oklahoma School of Community Medicine (Tulsa)": "hillcrest medical center",
    "John Peter Smith Hospital": "jps health network",
    "Texas Tech University Health Sciences Center at Lubbock": "university medical center lubbock",
    "Corewell Health (Royal Oak)": "corewell health wm beaumont",
    "Case Western Reserve University/University Hospitals Cleveland Medical Center": "uh cleveland medical center",
    "University of Kentucky College of Medicine": "university hospital lexington",
    "University of Arizona College of Medicine-Phoenix": "banner university medical center phx",
    "Creighton University School of Medicine (Phoenix)": "st josephs hospital medical ctr",
    "Kirk Kerkorian School of Medicine at UNLV": "university medical center las vegas",
    "HCA Healthcare Sunrise Health GME/MountainView": "mountain view hospital",
    "Advocate Health Care/Advocate Illinois Masonic Medical Center": "advocate north side",
    "Memorial Healthcare System, Hollywood, Florida": "memorial regional hospital",
    "Metro Health University of Michigan Health (Metro Health)": "metropolitan hospital",
    "Western Michigan University Homer Stryker MD School of Medicine": "bronson methodist",
    "St Joseph's University Medical Center": "st josephs university medical",
    "Allegheny Health Network Medical Education Consortium (WPH)": "western pennsylvania hospital",
    "UPMC Medical Education (Harrisburg)": "upmc pinnacle",
    "Marshall University School of Medicine": "cabell huntington",
    "East Tennessee State University/Quillen College of Medicine": "johnson city medical center",
    "University of Kentucky College of Medicine (Bowling Green)": "the medical center",
    "Oklahoma State University Center for Health Sciences": "osu medical center",
    "HCA Medical City Healthcare UNT-TCU Graduate Medical Education": "medical city arlington",
    "St. David's Healthcare Graduate Medical Education": "st davids medical center",
    "Texas Tech University (Permian Basin)": "medical center health system",
    "HCA Healthcare/Mercer University School of Medicine/Memorial Health University Medical Center": "memorial health univ med center",
    "University of Puerto Rico": "university disctrict hospital",
    "Creighton University East Valley Arizona": "mercy gilbert",
    "New York Medical College (St. Mary's Passaic)": "st marys hospital passaic",
    "ECU Health Medical Center/East Carolina University": "pitt county memorial",
    "Atrium Health Navicent The Medical Center/Mercer University School of Medicine": "ahn the medical center",
    "University of Arkansas for Medical Sciences": "uams medical center",
    "University of Texas at Austin Dell Medical School": "ascension seton medical center",
    "Bayfront Health St Petersburg": "orlando health bayfront",
    "Central Michigan University College of Medicine": "covenant medical center",
    "Faxton": "faxton st lukes",
    "Nuvance Health": "vassar brothers",
    "USA Health": "usa childrens and womens",
    "University of Texas Health Science Center San Antonio": "university health system",
    "Texas Tech University HSC El Paso": "university medical center of el paso",
    "Wright State University": "miami valley hospital",
    "Texas Tech University (Amarillo)": "northwest texas hospital",
    "Virginia Commonwealth University Health System": "vcu health system mcv",
    "Medical College of Georgia": "university health services",
    "University of Tennessee College of Medicine at Chattanooga": "erlanger medical center",
    "University of South Florida Morsani": "tampa general",
    "Southern Illinois University": "st johns hospital springfield",
    "AMITA Health/Saint Francis": "endeavor health",
    "University of Central Florida/HCA Healthcare GME (Pensacola)": "west florida hospital",
    "Florida State University College of Medicine (Pensacola)": "sacred heart pensacola",
    "Virtua": "west jersey health system",
    "St Luke's University Hospital": "st lukes hospital bethlehem",
}


def _norm(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = value.replace("saint ", "st ").replace("st.", "st")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def _tokens(value: str) -> set[str]:
    stop = {
        "hospital",
        "hospitals",
        "medical",
        "center",
        "health",
        "system",
        "university",
        "college",
        "school",
        "medicine",
        "program",
        "the",
        "of",
        "and",
        "at",
        "for",
        "inc",
        "foundation",
        "campus",
        "regional",
        "general",
        "memorial",
    }
    return {t for t in _norm(value).split() if t not in stop and len(t) > 2}


def _score(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


@lru_cache(maxsize=1)
def _cms_rows() -> list[dict]:
    return json.loads((ROOT / "cms_nursery_days.json").read_text())


@lru_cache(maxsize=1)
def _ca_rows() -> list[dict]:
    return json.loads((ROOT / "ca_deliveries.json").read_text())


@lru_cache(maxsize=1)
def _ny_rows() -> list[dict]:
    return json.loads((ROOT / "ny_deliveries.json").read_text())


def _alias_hit(extra: str, hospital: str, city: str = "") -> bool:
    extra_tokens = [t for t in _norm(extra).split() if len(t) > 2]
    if not extra_tokens:
        return False
    hay = set(_norm(f"{hospital} {city}").split())
    return all(t in hay for t in extra_tokens)


def _is_childrens(value: str) -> bool:
    n = _norm(value)
    return "children" in n or "pediatric" in n


def _row_city(row: dict) -> str:
    return row.get("city") or row.get("hospital_county") or ""


def _pick(
    rows: list[dict],
    name: str,
    city: str,
    state: str,
    name_key: str,
    extra: str = "",
    require_city: bool = False,
) -> dict | None:
    city_n = _norm(city)
    pool = list(rows)
    if state not in {"CA", "NY"}:
        pool = [row for row in rows if (row.get("state") or "").upper() == state.upper()]

    same_city = []
    for row in pool:
        row_city = _norm(_row_city(row))
        if city_n and (city_n in row_city or row_city in city_n):
            same_city.append(row)

    if extra:
        for search in (same_city, pool):
            for row in search:
                if _alias_hit(extra, row[name_key], _row_city(row)):
                    return row

    allow_childrens = _is_childrens(f"{extra} {name}")
    searches = (same_city,) if require_city and same_city else (same_city, pool)
    best = None
    best_score = 0.0
    for search in searches:
        for row in search:
            hospital = row[name_key]
            if not allow_childrens and _is_childrens(hospital):
                continue
            score = _score(name, hospital)
            if extra:
                score = max(score, _score(extra, hospital))
            distinctive = {t for t in _tokens(name) | _tokens(extra) if len(t) >= 6}
            if distinctive & _tokens(hospital):
                score += 0.18
            if search is same_city:
                score += 0.12
            if score > best_score:
                best_score = score
                best = row
        if best and best_score >= 0.42:
            return best
    if require_city and same_city and best and best_score >= 0.22:
        return best
    if best and best_score >= 0.36:
        return best
    if extra and best and best_score >= 0.30:
        return best
    return None


def overlay_deliveries(name: str, city: str, state: str) -> dict:
    """Return annual_deliveries / source when a hospital match exists."""
    if name in PUBLISHED:
        n, note = PUBLISHED[name]
        return {"annual_deliveries": int(n), "source": "published", "note": note}

    extra = HOSPITAL_ALIASES.get(name, "")

    if state == "NY":
        hit = _pick(_ny_rows(), name, city, state, "facility_name", extra)
        if hit and int(hit["n"]) >= 200:
            return {
                "annual_deliveries": int(hit["n"]),
                "source": "sparcs",
                "note": f"NYS SPARCS 2023 delivery discharges · {hit['facility_name']}",
            }

    if state == "CA":
        hit = _pick(_ca_rows(), name, city, state, "name", extra)
        if hit:
            return {
                "annual_deliveries": int(hit["deliveries"]),
                "source": "hcai",
                "note": f"California HCAI 2024 perinatal discharges · {hit['name']}",
            }

    hit = _pick(_cms_rows(), name, city, state, "name", extra, require_city=True)
    if hit:
        days = int(hit["nursery_days"])
        aliased = bool(extra and _alias_hit(extra, hit["name"], hit.get("city") or ""))
        if days < 800 and not aliased:
            return {}
        deliveries = max(50, int(round(days / 2.1 / 50.0) * 50))
        city_label = hit.get("city") or ""
        return {
            "annual_deliveries": deliveries,
            "source": "cms",
            "note": (
                f"CMS cost report nursery days ({days:,}) · {hit['name']}"
                + (f" ({city_label.title()}, {hit.get('state')})" if city_label else "")
            ),
        }
    return {}
