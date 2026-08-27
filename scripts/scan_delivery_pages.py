#!/usr/bin/env python3
"""Fetch ACGME program websites and extract published delivery/birth counts."""

from __future__ import annotations

import json
import re
import ssl
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
CTX = ssl.create_default_context()

DELIVERY_RE = re.compile(
    r"(?P<pre>.{0,80})(?P<num>\$?\d{1,3}(?:,\d{3})+|\d{3,5})(?:\s*(?:\+|plus))?"
    r"(?:\s*(?:to|-|–|—)\s*(?P<num2>\$?\d{1,3}(?:,\d{3})+|\d{3,5}))?"
    r"(?P<post>.{0,80})",
    re.I | re.S,
)
KEYWORD_RE = re.compile(
    r"\b(deliver(?:y|ies)|births?|live\s+births?|babies\s+born|newborns?|"
    r"obstetric(?:al)?\s+volume|annual\s+volume)\b",
    re.I,
)
MONTH_RE = re.compile(r"\b(per\s+month|/month|monthly|each\s+month)\b", re.I)
YEAR_RE = re.compile(r"\b(per\s+year|/year|annually|a\s+year|each\s+year|yearly)\b", re.I)
NOISE_RE = re.compile(
    r"\b(beds?|residents?|faculty|physicians?|square\s+feet|employees?|"
    r"visits?|surgeries|procedures|applications?|interviews?|"
    r"population|students?|nurses?)\b",
    re.I,
)


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.hrefs.append(href)


class TextExtractor(HTMLParser):
    skip = {"script", "style", "noscript", "svg"}

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self.skip:
            self._skip += 1
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "br", "tr"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.skip and self._skip:
            self._skip -= 1
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "tr"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._skip:
            self.parts.append(data)

    def text(self) -> str:
        raw = " ".join(self.parts)
        raw = re.sub(r"[ \t]+", " ", raw)
        return re.sub(r"\n{2,}", "\n", raw)


def fetch(url: str, timeout: int = 12) -> str | None:
    if not url or url.startswith("mailto:"):
        return None
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    try:
        with urlopen(req, timeout=timeout, context=CTX) as resp:
            ctype = resp.headers.get("Content-Type", "")
            if "pdf" in ctype.lower():
                return None
            raw = resp.read(1_500_000)
        return raw.decode("utf-8", errors="ignore")
    except (HTTPError, URLError, TimeoutError, ssl.SSLError, ValueError):
        return None


def extract_links(html: str, base: str) -> list[str]:
    parser = LinkExtractor()
    try:
        parser.feed(html)
        parser.close()
    except Exception:
        return []
    out = []
    seen = set()
    for href in parser.hrefs:
        abs_url = urljoin(base, href.split("#")[0].strip())
        if abs_url in seen:
            continue
        seen.add(abs_url)
        out.append(abs_url)
    return out


def obgyn_link_score(url: str) -> int:
    path = urlparse(url).path.lower()
    if any(bad in path for bad in ("facebook", "twitter", "linkedin", "instagram", "youtube", ".pdf")):
        return -1
    score = 0
    for token, pts in (
        ("obstetric", 5),
        ("obgyn", 5),
        ("ob-gyn", 5),
        ("ob_gyn", 5),
        ("gynecolog", 4),
        ("residency", 3),
        ("gme", 1),
        ("education", 1),
    ):
        if token in path or token in url.lower():
            score += pts
    return score


def gather_text(url: str) -> tuple[str, str, list[dict]]:
    """Fetch url plus a few OB/GYN subpages. Returns combined text, primary url used, hits."""
    html = fetch(url)
    pages = []
    if html:
        pages.append((url, html))
        links = extract_links(html, url)
        ranked = sorted(
            ((obgyn_link_score(link), link) for link in links),
            reverse=True,
        )
        extra = []
        for score, link in ranked:
            if score < 7:
                continue
            if urlparse(link).netloc != urlparse(url).netloc:
                continue
            if link.rstrip("/") == url.rstrip("/"):
                continue
            extra.append(link)
            if len(extra) >= 3:
                break
        for link in extra:
            sub = fetch(link)
            if sub:
                pages.append((link, sub))
    combined = "\n".join(html_text(html) for _, html in pages)
    hits = extract_hits(combined)
    source = pages[0][0] if pages else url
    if hits:
        # Prefer the page whose text actually produced the winning hit later.
        source = pages[-1][0] if len(pages) > 1 else pages[0][0]
    return combined, source, hits


def html_text(html: str) -> str:
    parser = TextExtractor()
    try:
        parser.feed(html)
        parser.close()
    except Exception:
        return re.sub(r"<[^>]+>", " ", html)
    return parser.text()


def parse_num(value: str) -> int | None:
    value = value.replace("$", "").replace(",", "").strip()
    if not value.isdigit():
        return None
    n = int(value)
    if n in {2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027}:
        return None
    return n


def extract_hits(text: str) -> list[dict]:
    hits = []
    for match in DELIVERY_RE.finditer(text):
        snippet = re.sub(r"\s+", " ", (match.group("pre") + match.group("num") + match.group("post")))
        if not KEYWORD_RE.search(snippet):
            continue
        s = snippet.lower()
        if any(w in s for w in ("outpatient", "clinic visit", "square foot", "surgical procedure", "major surgical", "gynecologic procedure")):
            if "deliver" not in s and "birth" not in s:
                continue
        if re.search(r"\b(finish the program|graduates? having|over the course of residency)\b", s):
            continue
        if re.search(r"\bvaginal deliveries\b", s) and not re.search(r"\b(total|annual|per year|deliveries per year)\b", s):
            continue
        n = parse_num(match.group("num"))
        n2 = parse_num(match.group("num2") or "")
        if n is None:
            continue
        monthly = bool(MONTH_RE.search(snippet))
        if monthly:
            annual = n * 12
            if n2:
                annual = int(round((n + n2) / 2 * 12))
        else:
            annual = n
            if n2:
                annual = int(round((n + n2) / 2))
        if annual < 200 or annual > 20000:
            continue
        hits.append(
            {
                "annual": annual,
                "raw": n,
                "raw2": n2,
                "monthly": monthly,
                "snippet": snippet.strip()[:240],
            }
        )
    # Dedup by annual + snippet prefix
    seen = set()
    uniq = []
    for hit in hits:
        key = (hit["annual"], hit["snippet"][:80].lower())
        if key in seen:
            continue
        seen.add(key)
        uniq.append(hit)
    return uniq


def pick_best(hits: list[dict]) -> dict | None:
    if not hits:
        return None
    scored = []
    for hit in hits:
        score = 0
        s = hit["snippet"].lower()
        if "deliver" in s:
            score += 5
        if "birth" in s:
            score += 4
        if YEAR_RE.search(s):
            score += 3
        if hit["monthly"]:
            score += 2
        if any(w in s for w in ("approximately", "about", "more than", "over ", "nearly", ">")):
            score += 1
        if "outpatient" in s or "clinic visit" in s:
            score -= 8
        if "vaginal deliver" in s and "total" not in s:
            score -= 4
        scored.append((score, -abs(hit["annual"] - 3000), hit["annual"], hit["snippet"]))
    scored.sort(reverse=True)
    best_key = scored[0]
    for hit in hits:
        if (
            hit["annual"] == best_key[2]
            and hit["snippet"] == best_key[3]
        ):
            return hit
    return hits[0]


def normalize_name(name: str) -> str:
    name = re.sub(r"\s+Program$", "", name).strip()
    name = name.lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", " ", name).strip()


def match_program(acgme_name: str, programs: list[dict]) -> dict | None:
    target = normalize_name(acgme_name)
    for p in programs:
        if normalize_name(p["name"]) == target:
            return p
    best = None
    best_score = 0.0
    tset = set(target.split())
    for p in programs:
        pset = set(normalize_name(p["name"]).split())
        if not tset or not pset:
            continue
        score = len(tset & pset) / len(tset | pset)
        if score > best_score:
            best_score = score
            best = p
    return best if best_score >= 0.55 else None


def scan_one(row: dict, program: dict | None) -> dict:
    url = (row.get("website") or "").strip()
    try:
        html = None
        text, used_url, hits = gather_text(url)
        html = text
        best = pick_best(hits)
    except Exception as exc:
        return {
            "acgme": row.get("acgme"),
            "acgmeName": row.get("name"),
            "programName": program["name"] if program else None,
            "city": program["city"] if program else row.get("city"),
            "state": program["state"] if program else row.get("state"),
            "website": url,
            "fetched": False,
            "error": str(exc),
            "current": program["annualDeliveries"] if program else None,
            "currentSource": program["annualDeliveriesSource"] if program else None,
            "found": None,
            "delta": None,
            "snippet": None,
            "monthly": None,
            "allHits": [],
        }
    current = program["annualDeliveries"] if program else None
    current_source = program["annualDeliveriesSource"] if program else None
    delta = None
    if best and current:
        delta = best["annual"] - current
    return {
        "acgme": row.get("acgme"),
        "acgmeName": row.get("name"),
        "programName": program["name"] if program else None,
        "city": program["city"] if program else row.get("city"),
        "state": program["state"] if program else row.get("state"),
        "website": used_url or url,
        "fetched": bool(text),
        "current": current,
        "currentSource": current_source,
        "found": best["annual"] if best else None,
        "delta": delta,
        "snippet": best["snippet"] if best else None,
        "monthly": best["monthly"] if best else None,
        "allHits": hits[:6],
    }


def main() -> None:
    acgme = json.loads((ROOT / "acgme_obgyn.json").read_text())
    programs = json.loads((ROOT.parents[0] / "src" / "data" / "programs.json").read_text())["programs"]
    rows = []
    start = time.time()
    with ThreadPoolExecutor(max_workers=16) as pool:
        futs = []
        for row in acgme:
            program = match_program(row["name"], programs)
            futs.append(pool.submit(scan_one, row, program))
        for i, fut in enumerate(as_completed(futs), 1):
            rows.append(fut.result())
            if i % 40 == 0:
                print(f"scanned {i}/{len(futs)}")
    rows.sort(key=lambda r: (r.get("programName") or r["acgmeName"]))
    out = ROOT / "delivery_web_hits.json"
    out.write_text(json.dumps(rows, indent=2))
    found = [r for r in rows if r["found"]]
    material = [
        r
        for r in found
        if r["current"] and abs(r["delta"] or 0) >= 400 and r["currentSource"] != "sparcs"
    ]
    print(
        f"Wrote {len(rows)} rows ({len(found)} with hits, {len(material)} material) "
        f"in {time.time() - start:.1f}s -> {out}"
    )
    for r in sorted(material, key=lambda x: -abs(x["delta"] or 0))[:40]:
        print(
            f"{r['delta']:+6d}  {r['current']:5d} -> {r['found']:5d}  "
            f"{r['programName'] or r['acgmeName']}  | {r['snippet'][:90]}"
        )


if __name__ == "__main__":
    main()
