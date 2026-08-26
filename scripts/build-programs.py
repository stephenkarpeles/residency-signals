#!/usr/bin/env python3
"""Build the local OB/GYN residency dataset from compiled public sources."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extra_programs import EXTRA_CITIES, EXTRA_PROGRAMS
from freida_overlay import overlay_for
from delivery_overlay import overlay_deliveries

# City stats: Census populations, C2ER-style COL (100 = U.S. average),
# metro school quality (GreatSchools/Niche style 0–100), in-state college
# quality, amenities, water access, safety, walkability, climate livability.
CITIES: dict[str, dict] = {
    "Boston, MA": dict(pop=675647, col=153, ms=82, hs=84, colleges=100, town=92, water=95, water_note="Atlantic harbor and coastline", safety=68, walk=89, climate=62),
    "Worcester, MA": dict(pop=206518, col=115, ms=62, hs=65, colleges=100, town=68, water=22, water_note="Inland; Atlantic ~1 hour", safety=58, walk=62, climate=58),
    "Springfield, MA": dict(pop=153809, col=108, ms=52, hs=55, colleges=100, town=62, water=28, water_note="Connecticut River", safety=48, walk=55, climate=58),
    "New Haven, CT": dict(pop=135081, col=120, ms=58, hs=62, colleges=92, town=75, water=72, water_note="Long Island Sound", safety=50, walk=68, climate=62),
    "Bridgeport, CT": dict(pop=148333, col=118, ms=48, hs=52, colleges=92, town=64, water=85, water_note="Long Island Sound waterfront", safety=45, walk=58, climate=62),
    "Farmington, CT": dict(pop=26500, col=118, ms=78, hs=80, colleges=92, town=70, water=30, water_note="Farmington River; Sound ~45 min", safety=78, walk=42, climate=60),
    "Hartford, CT": dict(pop=121054, col=112, ms=52, hs=55, colleges=92, town=68, water=32, water_note="Connecticut River", safety=48, walk=60, climate=60),
    "Danbury, CT": dict(pop=86518, col=122, ms=68, hs=70, colleges=92, town=70, water=40, water_note="Candlewood Lake nearby", safety=70, walk=48, climate=60),
    "Lebanon, NH": dict(pop=14200, col=115, ms=78, hs=80, colleges=82, town=72, water=45, water_note="Connecticut River; lakes nearby", safety=82, walk=55, climate=48),
    "Providence, RI": dict(pop=190934, col=118, ms=62, hs=64, colleges=85, town=80, water=90, water_note="Narragansett Bay", safety=55, walk=76, climate=64),
    "Portland, ME": dict(pop=68424, col=118, ms=75, hs=78, colleges=72, town=85, water=100, water_note="Atlantic working waterfront", safety=72, walk=78, climate=50),
    "Burlington, VT": dict(pop=44743, col=120, ms=80, hs=82, colleges=78, town=82, water=90, water_note="Lake Champlain", safety=75, walk=80, climate=45),
    "New York, NY": dict(pop=8336817, col=168, ms=70, hs=72, colleges=95, town=98, water=90, water_note="Hudson, East River, Atlantic", safety=62, walk=88, climate=64),
    "Bronx, NY": dict(pop=1379946, col=155, ms=52, hs=54, colleges=95, town=78, water=70, water_note="Long Island Sound / East River", safety=50, walk=80, climate=64),
    "Brooklyn, NY": dict(pop=2561225, col=160, ms=64, hs=66, colleges=95, town=92, water=80, water_note="Atlantic and East River", safety=58, walk=86, climate=64),
    "New Hyde Park, NY": dict(pop=10250, col=155, ms=82, hs=85, colleges=95, town=78, water=55, water_note="Long Island; Atlantic ~30 min", safety=78, walk=52, climate=64),
    "Stony Brook, NY": dict(pop=13740, col=130, ms=80, hs=82, colleges=95, town=70, water=85, water_note="Long Island Sound", safety=76, walk=40, climate=64),
    "Valhalla, NY": dict(pop=3200, col=140, ms=78, hs=80, colleges=95, town=68, water=45, water_note="Hudson River ~20 min", safety=80, walk=28, climate=62),
    "Albany, NY": dict(pop=99224, col=105, ms=68, hs=70, colleges=95, town=70, water=32, water_note="Hudson River", safety=58, walk=62, climate=52),
    "Buffalo, NY": dict(pop=276807, col=90, ms=58, hs=60, colleges=95, town=72, water=92, water_note="Lake Erie and Niagara River", safety=52, walk=62, climate=42),
    "Rochester, NY": dict(pop=209352, col=98, ms=62, hs=65, colleges=95, town=72, water=82, water_note="Lake Ontario ~15 min", safety=48, walk=60, climate=44),
    "Syracuse, NY": dict(pop=146103, col=95, ms=58, hs=60, colleges=95, town=68, water=42, water_note="Onondaga Lake; Finger Lakes nearby", safety=50, walk=58, climate=46),
    "Philadelphia, PA": dict(pop=1576251, col=110, ms=58, hs=60, colleges=90, town=82, water=48, water_note="Delaware and Schuylkill Rivers", safety=48, walk=78, climate=66),
    "Hershey, PA": dict(pop=13858, col=100, ms=75, hs=78, colleges=90, town=58, water=12, water_note="Inland; Susquehanna ~30 min", safety=80, walk=38, climate=62),
    "Pittsburgh, PA": dict(pop=303255, col=94, ms=68, hs=70, colleges=90, town=78, water=70, water_note="Three Rivers confluence", safety=58, walk=62, climate=56),
    "Danville, PA": dict(pop=4700, col=88, ms=70, hs=72, colleges=90, town=52, water=28, water_note="Susquehanna River", safety=78, walk=42, climate=56),
    "Abington, PA": dict(pop=58500, col=118, ms=78, hs=80, colleges=90, town=72, water=22, water_note="Suburban Philadelphia; Delaware ~25 min", safety=76, walk=45, climate=66),
    "Wynnewood, PA": dict(pop=13500, col=122, ms=85, hs=88, colleges=90, town=75, water=22, water_note="Main Line; rivers nearby", safety=82, walk=48, climate=66),
    "Camden, NJ": dict(pop=71770, col=105, ms=42, hs=45, colleges=88, town=58, water=50, water_note="Delaware River waterfront", safety=38, walk=55, climate=66),
    "New Brunswick, NJ": dict(pop=55708, col=125, ms=62, hs=65, colleges=88, town=70, water=28, water_note="Raritan River", safety=55, walk=68, climate=64),
    "Newark, NJ": dict(pop=307220, col=122, ms=42, hs=45, colleges=88, town=65, water=42, water_note="Passaic River; NY Harbor nearby", safety=42, walk=72, climate=64),
    "Livingston, NJ": dict(pop=31330, col=135, ms=88, hs=90, colleges=88, town=74, water=20, water_note="Suburban; Atlantic ~45 min", safety=85, walk=35, climate=64),
    "Long Branch, NJ": dict(pop=32229, col=128, ms=58, hs=60, colleges=88, town=76, water=100, water_note="Jersey Shore / Atlantic Ocean", safety=58, walk=58, climate=66),
    "Hackensack, NJ": dict(pop=46030, col=135, ms=62, hs=65, colleges=88, town=70, water=35, water_note="Hackensack River; NYC ~30 min", safety=60, walk=58, climate=64),
    "Newark, DE": dict(pop=31400, col=110, ms=68, hs=70, colleges=72, town=68, water=28, water_note="Christina River; Delaware Bay ~40 min", safety=62, walk=48, climate=66),
    "Wilmington, DE": dict(pop=70898, col=110, ms=58, hs=60, colleges=72, town=72, water=40, water_note="Christina and Delaware Rivers", safety=48, walk=58, climate=66),
    "Baltimore, MD": dict(pop=565239, col=108, ms=52, hs=55, colleges=85, town=75, water=78, water_note="Inner Harbor / Chesapeake Bay", safety=38, walk=68, climate=68),
    "Washington, DC": dict(pop=689545, col=152, ms=70, hs=72, colleges=90, town=90, water=42, water_note="Potomac and Anacostia Rivers", safety=52, walk=77, climate=68),
    "Falls Church, VA": dict(pop=14617, col=145, ms=90, hs=92, colleges=88, town=82, water=22, water_note="Potomac nearby; Chesapeake ~1 hour", safety=85, walk=58, climate=68),
    "Charlottesville, VA": dict(pop=46553, col=108, ms=80, hs=82, colleges=88, town=80, water=15, water_note="Inland piedmont", safety=72, walk=55, climate=70),
    "Richmond, VA": dict(pop=226610, col=102, ms=62, hs=65, colleges=88, town=80, water=32, water_note="James River", safety=52, walk=58, climate=72),
    "Norfolk, VA": dict(pop=238005, col=100, ms=55, hs=58, colleges=88, town=76, water=95, water_note="Chesapeake Bay and Atlantic", safety=48, walk=52, climate=72),
    "Roanoke, VA": dict(pop=98832, col=92, ms=65, hs=68, colleges=88, town=72, water=18, water_note="Roanoke River; mountains", safety=58, walk=48, climate=68),
    "Durham, NC": dict(pop=296186, col=110, ms=70, hs=72, colleges=88, town=80, water=18, water_note="Falls Lake nearby", safety=55, walk=48, climate=74),
    "Chapel Hill, NC": dict(pop=61976, col=110, ms=88, hs=90, colleges=88, town=78, water=18, water_note="Jordan Lake nearby", safety=78, walk=52, climate=74),
    "Winston-Salem, NC": dict(pop=249545, col=95, ms=62, hs=65, colleges=88, town=70, water=12, water_note="Inland piedmont", safety=52, walk=42, climate=72),
    "Greenville, NC": dict(pop=87521, col=88, ms=58, hs=60, colleges=88, town=62, water=22, water_note="Tar River; coast ~1 hour", safety=50, walk=38, climate=74),
    "Charlotte, NC": dict(pop=911311, col=102, ms=64, hs=66, colleges=88, town=82, water=22, water_note="Lake Norman nearby", safety=55, walk=42, climate=74),
    "Asheville, NC": dict(pop=94589, col=108, ms=70, hs=72, colleges=88, town=88, water=22, water_note="French Broad River; mountains", safety=58, walk=52, climate=70),
    "Charleston, SC": dict(pop=151612, col=112, ms=68, hs=70, colleges=70, town=88, water=95, water_note="Atlantic harbor and beaches", safety=52, walk=58, climate=76),
    "Columbia, SC": dict(pop=137300, col=92, ms=58, hs=60, colleges=70, town=70, water=22, water_note="Congaree River", safety=48, walk=42, climate=76),
    "Greenville, SC": dict(pop=72095, col=98, ms=72, hs=75, colleges=70, town=78, water=12, water_note="Reedy River; mountains nearby", safety=62, walk=52, climate=74),
    "Atlanta, GA": dict(pop=498715, col=107, ms=64, hs=66, colleges=80, town=85, water=18, water_note="Chattahoochee River; inland", safety=48, walk=48, climate=76),
    "Augusta, GA": dict(pop=202081, col=88, ms=52, hs=55, colleges=80, town=62, water=28, water_note="Savannah River", safety=45, walk=35, climate=76),
    "Macon, GA": dict(pop=157346, col=85, ms=48, hs=50, colleges=80, town=58, water=18, water_note="Ocmulgee River", safety=40, walk=32, climate=76),
    "Marietta, GA": dict(pop=61997, col=105, ms=78, hs=80, colleges=80, town=75, water=15, water_note="Atlanta suburbs; inland", safety=68, walk=38, climate=76),
    "Birmingham, AL": dict(pop=196644, col=88, ms=52, hs=55, colleges=68, town=68, water=12, water_note="Inland; lakes nearby", safety=42, walk=38, climate=76),
    "Mobile, AL": dict(pop=184952, col=88, ms=48, hs=50, colleges=68, town=68, water=88, water_note="Mobile Bay / Gulf Coast", safety=42, walk=38, climate=78),
    "Nashville, TN": dict(pop=689447, col=108, ms=62, hs=65, colleges=75, town=88, water=28, water_note="Cumberland River", safety=52, walk=42, climate=74),
    "Memphis, TN": dict(pop=628127, col=85, ms=42, hs=45, colleges=75, town=70, water=52, water_note="Mississippi River", safety=32, walk=38, climate=76),
    "Knoxville, TN": dict(pop=192648, col=90, ms=62, hs=65, colleges=75, town=75, water=32, water_note="Tennessee River", safety=50, walk=38, climate=72),
    "Chattanooga, TN": dict(pop=181370, col=90, ms=62, hs=65, colleges=75, town=78, water=55, water_note="Tennessee River waterfront", safety=52, walk=48, climate=72),
    "Gainesville, FL": dict(pop=145214, col=95, ms=62, hs=65, colleges=75, town=72, water=22, water_note="Inland; Gulf ~1.5 hours", safety=55, walk=45, climate=78),
    "Jacksonville, FL": dict(pop=971319, col=98, ms=55, hs=58, colleges=75, town=72, water=85, water_note="St. Johns River and Atlantic", safety=48, walk=32, climate=80),
    "Miami, FL": dict(pop=442241, col=125, ms=55, hs=58, colleges=75, town=90, water=100, water_note="Atlantic and Biscayne Bay", safety=48, walk=58, climate=82),
    "Miami Beach, FL": dict(pop=82890, col=138, ms=58, hs=60, colleges=75, town=88, water=100, water_note="Atlantic beaches", safety=58, walk=78, climate=82),
    "Tampa, FL": dict(pop=398173, col=105, ms=60, hs=62, colleges=75, town=80, water=88, water_note="Tampa Bay / Gulf", safety=52, walk=42, climate=80),
    "Orlando, FL": dict(pop=320742, col=102, ms=58, hs=60, colleges=75, town=82, water=35, water_note="Chain of lakes; coasts ~1 hour", safety=52, walk=38, climate=80),
    "New Orleans, LA": dict(pop=369749, col=98, ms=48, hs=50, colleges=70, town=90, water=85, water_note="Mississippi River and Lake Pontchartrain", safety=35, walk=58, climate=78),
    "Baton Rouge, LA": dict(pop=222185, col=92, ms=52, hs=55, colleges=70, town=68, water=42, water_note="Mississippi River", safety=38, walk=35, climate=78),
    "Shreveport, LA": dict(pop=180448, col=85, ms=48, hs=50, colleges=70, town=58, water=28, water_note="Red River", safety=35, walk=32, climate=78),
    "Little Rock, AR": dict(pop=202591, col=88, ms=55, hs=58, colleges=62, town=68, water=28, water_note="Arkansas River", safety=42, walk=35, climate=74),
    "Jackson, MS": dict(pop=145995, col=82, ms=38, hs=40, colleges=55, town=58, water=12, water_note="Pearl River; inland", safety=28, walk=28, climate=76),
    "Oklahoma City, OK": dict(pop=687725, col=86, ms=55, hs=58, colleges=62, town=70, water=15, water_note="Oklahoma River; lakes nearby", safety=48, walk=32, climate=72),
    "Tulsa, OK": dict(pop=413066, col=88, ms=58, hs=60, colleges=62, town=72, water=22, water_note="Arkansas River", safety=48, walk=35, climate=72),
    "Dallas, TX": dict(pop=1304379, col=104, ms=65, hs=68, colleges=85, town=82, water=18, water_note="Trinity River; lakes nearby", safety=52, walk=42, climate=72),
    "Houston, TX": dict(pop=2304580, col=96, ms=58, hs=60, colleges=85, town=80, water=42, water_note="Buffalo Bayou; Gulf ~1 hour", safety=48, walk=38, climate=78),
    "Galveston, TX": dict(pop=53695, col=95, ms=52, hs=55, colleges=85, town=72, water=100, water_note="Gulf of Mexico island", safety=48, walk=58, climate=78),
    "San Antonio, TX": dict(pop=1492510, col=92, ms=55, hs=58, colleges=85, town=80, water=18, water_note="San Antonio River Walk", safety=52, walk=42, climate=76),
    "Austin, TX": dict(pop=974447, col=115, ms=72, hs=74, colleges=85, town=90, water=42, water_note="Lady Bird Lake / Highland Lakes", safety=58, walk=48, climate=74),
    "Fort Worth, TX": dict(pop=956709, col=100, ms=62, hs=65, colleges=85, town=76, water=18, water_note="Trinity River", safety=52, walk=38, climate=74),
    "Lubbock, TX": dict(pop=263930, col=85, ms=62, hs=65, colleges=85, town=62, water=5, water_note="High Plains; no major water", safety=55, walk=32, climate=68),
    "El Paso, TX": dict(pop=678815, col=88, ms=52, hs=55, colleges=85, town=68, water=8, water_note="Rio Grande", safety=62, walk=38, climate=72),
    "Temple, TX": dict(pop=85186, col=88, ms=62, hs=65, colleges=85, town=58, water=12, water_note="Inland Central Texas", safety=62, walk=32, climate=76),
    "Chicago, IL": dict(pop=2665039, col=108, ms=62, hs=64, colleges=90, town=88, water=95, water_note="Lake Michigan waterfront", safety=48, walk=77, climate=48),
    "Maywood, IL": dict(pop=23158, col=108, ms=52, hs=55, colleges=90, town=62, water=70, water_note="Chicago metro; Lake Michigan ~30 min", safety=45, walk=48, climate=48),
    "Springfield, IL": dict(pop=113394, col=88, ms=62, hs=65, colleges=90, town=62, water=15, water_note="Sangamon River; inland", safety=52, walk=38, climate=52),
    "Peoria, IL": dict(pop=111388, col=88, ms=58, hs=60, colleges=90, town=62, water=32, water_note="Illinois River", safety=48, walk=38, climate=50),
    "Indianapolis, IN": dict(pop=887642, col=90, ms=58, hs=60, colleges=82, town=75, water=15, water_note="White River; inland", safety=48, walk=38, climate=56),
    "Ann Arbor, MI": dict(pop=123851, col=112, ms=90, hs=92, colleges=82, town=85, water=42, water_note="Huron River; Great Lakes ~1 hour", safety=72, walk=62, climate=48),
    "Detroit, MI": dict(pop=620376, col=88, ms=38, hs=42, colleges=82, town=68, water=82, water_note="Detroit River / Great Lakes", safety=32, walk=52, climate=46),
    "Royal Oak, MI": dict(pop=58211, col=102, ms=78, hs=80, colleges=82, town=78, water=55, water_note="Metro Detroit; Lake St. Clair ~25 min", safety=72, walk=58, climate=46),
    "Grand Rapids, MI": dict(pop=198917, col=92, ms=68, hs=70, colleges=82, town=76, water=42, water_note="Grand River; Lake Michigan ~40 min", safety=55, walk=48, climate=44),
    "Dearborn, MI": dict(pop=107687, col=92, ms=58, hs=60, colleges=82, town=70, water=55, water_note="Metro Detroit; Detroit River nearby", safety=55, walk=48, climate=46),
    "Southfield, MI": dict(pop=76222, col=98, ms=62, hs=65, colleges=82, town=68, water=50, water_note="Metro Detroit; lakes nearby", safety=52, walk=38, climate=46),
    "Columbus, OH": dict(pop=905748, col=95, ms=68, hs=70, colleges=78, town=78, water=18, water_note="Scioto River; inland", safety=52, walk=42, climate=56),
    "Cincinnati, OH": dict(pop=309317, col=92, ms=62, hs=65, colleges=78, town=76, water=48, water_note="Ohio River", safety=48, walk=48, climate=60),
    "Cleveland, OH": dict(pop=365233, col=88, ms=52, hs=55, colleges=78, town=72, water=95, water_note="Lake Erie waterfront", safety=42, walk=58, climate=46),
    "Dayton, OH": dict(pop=135644, col=86, ms=58, hs=60, colleges=78, town=65, water=18, water_note="Great Miami River", safety=42, walk=42, climate=56),
    "Toledo, OH": dict(pop=266301, col=85, ms=52, hs=55, colleges=78, town=62, water=88, water_note="Maumee River / Lake Erie", safety=40, walk=42, climate=46),
    "Madison, WI": dict(pop=269840, col=108, ms=82, hs=84, colleges=80, town=85, water=90, water_note="Lakes Mendota and Monona", safety=72, walk=58, climate=42),
    "Milwaukee, WI": dict(pop=563305, col=95, ms=52, hs=55, colleges=80, town=75, water=95, water_note="Lake Michigan waterfront", safety=42, walk=58, climate=42),
    "Minneapolis, MN": dict(pop=425336, col=105, ms=75, hs=78, colleges=80, town=85, water=82, water_note="Chain of lakes and Mississippi", safety=52, walk=68, climate=32),
    "Rochester, MN": dict(pop=121395, col=98, ms=85, hs=88, colleges=80, town=70, water=18, water_note="Inland; Zumbro River", safety=82, walk=42, climate=30),
    "Iowa City, IA": dict(pop=74628, col=95, ms=82, hs=85, colleges=75, town=75, water=22, water_note="Iowa River", safety=75, walk=55, climate=42),
    "St. Louis, MO": dict(pop=286578, col=88, ms=55, hs=58, colleges=75, town=76, water=48, water_note="Mississippi and Missouri Rivers", safety=38, walk=58, climate=62),
    "Kansas City, MO": dict(pop=508090, col=90, ms=62, hs=65, colleges=75, town=75, water=18, water_note="Missouri River", safety=42, walk=42, climate=62),
    "Columbia, MO": dict(pop=126853, col=90, ms=70, hs=72, colleges=75, town=72, water=15, water_note="Inland college town", safety=62, walk=42, climate=62),
    "Kansas City, KS": dict(pop=152960, col=88, ms=52, hs=55, colleges=65, town=68, water=18, water_note="Kansas and Missouri Rivers", safety=42, walk=38, climate=62),
    "Wichita, KS": dict(pop=397532, col=86, ms=58, hs=60, colleges=65, town=65, water=12, water_note="Arkansas River", safety=48, walk=35, climate=66),
    "Omaha, NE": dict(pop=486051, col=90, ms=70, hs=72, colleges=65, town=74, water=22, water_note="Missouri River", safety=55, walk=38, climate=50),
    "Lexington, KY": dict(pop=322570, col=92, ms=68, hs=70, colleges=68, town=75, water=12, water_note="Inland Bluegrass region", safety=55, walk=38, climate=66),
    "Louisville, KY": dict(pop=624444, col=92, ms=55, hs=58, colleges=68, town=78, water=48, water_note="Ohio River", safety=45, walk=42, climate=66),
    "Morgantown, WV": dict(pop=30347, col=85, ms=62, hs=65, colleges=55, town=62, water=22, water_note="Monongahela River", safety=62, walk=42, climate=58),
    "Denver, CO": dict(pop=715522, col=118, ms=72, hs=74, colleges=78, town=88, water=15, water_note="South Platte; mountains, no coast", safety=52, walk=58, climate=68),
    "Aurora, CO": dict(pop=386261, col=115, ms=70, hs=72, colleges=78, town=80, water=12, water_note="Denver metro; mountains nearby", safety=50, walk=42, climate=68),
    "Salt Lake City, UT": dict(pop=209593, col=108, ms=70, hs=72, colleges=72, town=80, water=42, water_note="Great Salt Lake nearby", safety=58, walk=55, climate=62),
    "Phoenix, AZ": dict(pop=1650070, col=108, ms=55, hs=58, colleges=70, town=80, water=8, water_note="Desert; canals and lakes", safety=48, walk=38, climate=58),
    "Tucson, AZ": dict(pop=542629, col=98, ms=58, hs=60, colleges=70, town=75, water=5, water_note="Sonoran Desert", safety=48, walk=42, climate=62),
    "Albuquerque, NM": dict(pop=564559, col=95, ms=52, hs=55, colleges=62, town=75, water=10, water_note="Rio Grande", safety=42, walk=42, climate=70),
    "Las Vegas, NV": dict(pop=660929, col=105, ms=48, hs=50, colleges=55, town=82, water=15, water_note="Lake Mead ~40 min", safety=42, walk=38, climate=58),
    "San Francisco, CA": dict(pop=808437, col=178, ms=76, hs=78, colleges=98, town=95, water=100, water_note="Pacific Ocean and San Francisco Bay", safety=52, walk=88, climate=82),
    "Stanford, CA": dict(pop=13500, col=185, ms=92, hs=94, colleges=98, town=82, water=70, water_note="SF Bay ~20 min; Pacific ~30 min", safety=85, walk=58, climate=80),
    "Los Angeles, CA": dict(pop=3822238, col=148, ms=68, hs=70, colleges=98, town=90, water=72, water_note="Pacific ~20–40 min depending on neighborhood", safety=48, walk=52, climate=88),
    "Torrance, CA": dict(pop=143390, col=152, ms=78, hs=80, colleges=98, town=78, water=90, water_note="South Bay; Pacific ~10 min", safety=68, walk=48, climate=86),
    "San Diego, CA": dict(pop=1386932, col=148, ms=72, hs=74, colleges=98, town=92, water=100, water_note="Pacific Ocean", safety=62, walk=48, climate=95),
    "Irvine, CA": dict(pop=307670, col=155, ms=90, hs=92, colleges=98, town=82, water=75, water_note="Orange County coast ~15 min", safety=82, walk=42, climate=90),
    "Sacramento, CA": dict(pop=525041, col=122, ms=58, hs=60, colleges=98, town=75, water=32, water_note="American and Sacramento Rivers", safety=45, walk=42, climate=78),
    "Loma Linda, CA": dict(pop=24791, col=125, ms=62, hs=65, colleges=98, town=62, water=12, water_note="Inland Empire; Pacific ~1.5 hours", safety=62, walk=32, climate=82),
    "Oakland, CA": dict(pop=433823, col=155, ms=55, hs=58, colleges=98, town=82, water=90, water_note="San Francisco Bay", safety=42, walk=68, climate=80),
    "Santa Clara, CA": dict(pop=127647, col=175, ms=85, hs=88, colleges=98, town=78, water=32, water_note="South Bay; Pacific ~45 min", safety=75, walk=52, climate=80),
    "Fresno, CA": dict(pop=542107, col=108, ms=45, hs=48, colleges=98, town=62, water=12, water_note="Central Valley; Yosemite nearby", safety=38, walk=38, climate=72),
    "Seattle, WA": dict(pop=755078, col=145, ms=80, hs=82, colleges=82, town=92, water=100, water_note="Puget Sound and lakes", safety=52, walk=72, climate=68),
    "Portland, OR": dict(pop=635067, col=122, ms=72, hs=74, colleges=75, town=88, water=68, water_note="Willamette and Columbia Rivers; coast ~1.5 hours", safety=48, walk=68, climate=62),
    "Honolulu, HI": dict(pop=343119, col=180, ms=68, hs=70, colleges=60, town=88, water=100, water_note="Pacific Ocean", safety=58, walk=62, climate=95),
}

REGION = {
    "ME": "Northeast", "NH": "Northeast", "VT": "Northeast", "MA": "Northeast",
    "RI": "Northeast", "CT": "Northeast", "NY": "Northeast", "NJ": "Northeast", "PA": "Northeast",
    "OH": "Midwest", "MI": "Midwest", "IN": "Midwest", "IL": "Midwest", "WI": "Midwest",
    "MN": "Midwest", "IA": "Midwest", "MO": "Midwest", "NE": "Midwest", "KS": "Midwest",
    "DE": "South", "MD": "South", "DC": "South", "VA": "South", "WV": "South",
    "NC": "South", "SC": "South", "GA": "South", "FL": "South", "KY": "South",
    "TN": "South", "AL": "South", "MS": "South", "AR": "South", "LA": "South",
    "OK": "South", "TX": "South",
    "CO": "West", "UT": "West", "AZ": "West", "NM": "West", "NV": "West",
    "CA": "West", "OR": "West", "WA": "West", "HI": "West",
    "PR": "South",
}

# name, short, city, type, class_size, quality, md, do, img, fellowship, do_source, highlights
PROGRAMS = [
    ("Mass General Brigham/Brigham and Women's Hospital/Massachusetts General Hospital", "BWH / MGH", "Boston, MA", "University", 11, 99, 97, 2, 1, 99, "estimated", ["Consistently top-tier reputation", "Unmatched fellowship pipeline", "High-volume tertiary obstetrics"]),
    ("Beth Israel Deaconess Medical Center", "BIDMC", "Boston, MA", "University", 6, 90, 92, 5, 3, 90, "estimated", ["Harvard-affiliated", "Strong academic culture", "Urban safety-net mix"]),
    ("Boston University Medical Center", "Boston University", "Boston, MA", "University", 6, 86, 85, 8, 7, 84, "estimated", ["Safety-net BMC experience", "Diverse patient population", "Solid generalist training"]),
    ("Tufts Medical Center", "Tufts", "Boston, MA", "University", 6, 84, 88, 6, 6, 82, "estimated", ["Downtown Boston", "Academic with community feel", "Good surgical volume"]),
    ("University of Massachusetts", "UMass", "Worcester, MA", "University", 6, 82, 82, 12, 6, 78, "estimated", ["Strong regional academic program", "Solid volume", "More affordable New England"]),
    ("UMass Chan - Baystate", "Baystate", "Springfield, MA", "Hybrid", 6, 78, 50, 33, 17, 72, "published", ["DO-friendly university affiliate", "High clinical volume", "Western Massachusetts"]),
    ("Yale-New Haven Medical Center", "Yale", "New Haven, CT", "University", 6, 94, 95, 3, 2, 95, "estimated", ["Ivy academic powerhouse", "Elite REI/MFM exposure", "Research-heavy"]),
    ("Bridgeport Hospital/Yale University", "Bridgeport / Yale", "Bridgeport, CT", "Hybrid", 4, 76, 56, 6, 38, 70, "published", ["Yale-affiliated community", "Coastal Connecticut", "IMG-friendly"]),
    ("University of Connecticut", "UConn", "Farmington, CT", "University", 8, 83, 85, 10, 5, 80, "estimated", ["Large class for the region", "Suburban campus", "Strong generalist training"]),
    ("St Francis Hospital and Medical Center", "St. Francis Hartford", "Hartford, CT", "Hybrid", 4, 74, 60, 40, 0, 62, "published", ["DO-friendly", "Community volume", "Hartford metro"]),
    ("Nuvance Health Consortium (Danbury Hospital)", "Danbury", "Danbury, CT", "Hybrid", 3, 72, 67, 17, 16, 58, "published", ["Small class", "Suburban Connecticut", "Hands-on community training"]),
    ("Dartmouth-Hitchcock/Mary Hitchcock Memorial Hospital", "Dartmouth", "Lebanon, NH", "University", 4, 88, 94, 4, 2, 86, "estimated", ["Ivy academic program", "Small class, close faculty", "Upper Valley lifestyle"]),
    ("Women and Infants Hospital of Rhode Island/Brown University", "Brown / WIH", "Providence, RI", "University", 8, 91, 92, 5, 3, 92, "estimated", ["Dedicated women's hospital", "Very high obstetric volume", "Strong MFM"]),
    ("MaineHealth", "Maine Medical", "Portland, ME", "Hybrid", 5, 80, 88, 6, 6, 72, "published", ["Maine Medical Center", "Coastal New England", "Lifestyle-friendly city"]),
    ("University of Vermont Medical Center", "UVM", "Burlington, VT", "University", 4, 81, 88, 8, 4, 74, "estimated", ["Lake Champlain setting", "Small academic program", "Outdoor lifestyle"]),
    ("New York Presbyterian Hospital (Columbia Campus)", "Columbia", "New York, NY", "University", 6, 96, 96, 2, 2, 97, "estimated", ["Ivy / NYP prestige", "Complex tertiary care", "Research powerhouse"]),
    ("New York Presbyterian Hospital (Cornell Campus)", "Weill Cornell", "New York, NY", "University", 8, 95, 95, 3, 2, 96, "estimated", ["Upper East Side NYP", "Elite fellowships", "High-acuity obstetrics"]),
    ("NYU Grossman School of Medicine", "NYU", "New York, NY", "University", 10, 95, 94, 3, 3, 95, "estimated", ["Large academic class", "Tisch + Bellevue mix", "Top-tier reputation"]),
    ("Icahn School of Medicine at Mount Sinai (Mount Sinai Hospital)", "Mount Sinai", "New York, NY", "University", 8, 90, 90, 6, 4, 90, "estimated", ["Upper East Side flagship", "Strong gyn oncology", "Busy Manhattan volume"]),
    ("Icahn School of Medicine at Mount Sinai (West)", "Mount Sinai West", "New York, NY", "University", 6, 84, 82, 10, 8, 80, "estimated", ["Midtown/West Side", "Solid surgical training", "Urban diversity"]),
    ("Montefiore Medical Center/Albert Einstein College of Medicine", "Montefiore / Einstein", "Bronx, NY", "University", 11, 88, 78, 8, 14, 86, "estimated", ["Very large class", "High-volume Bronx care", "Strong academic tradition"]),
    ("SUNY Downstate Health Sciences University", "SUNY Downstate", "Brooklyn, NY", "University", 10, 79, 55, 10, 35, 74, "estimated", ["Busy Brooklyn training", "Diverse pathology", "IMG-friendly academic"]),
    ("Maimonides Medical Center", "Maimonides", "Brooklyn, NY", "Hybrid", 8, 77, 45, 18, 37, 68, "estimated", ["Very high delivery volume", "Community-academic mix", "Brooklyn lifestyle"]),
    ("Zucker School of Medicine at Hofstra/Northwell", "Northwell / Hofstra", "New Hyde Park, NY", "University", 12, 86, 82, 12, 6, 84, "estimated", ["One of the largest classes", "Northwell system resources", "Long Island + NYC access"]),
    ("Zucker School of Medicine at Hofstra/Northwell at Lenox Hill Hospital", "Lenox Hill", "New York, NY", "University", 6, 83, 85, 8, 7, 78, "estimated", ["Upper East Side community-academic", "Strong benign gyn", "Manhattan living"]),
    ("Stony Brook Medicine/University Hospital", "Stony Brook", "Stony Brook, NY", "University", 6, 82, 80, 12, 8, 80, "estimated", ["SUNY academic flagship LI", "Sound-side campus", "Solid fellowships"]),
    ("New York Medical College at Westchester Medical Center", "Westchester / NYMC", "Valhalla, NY", "University", 6, 78, 70, 15, 15, 74, "estimated", ["Hudson Valley tertiary center", "Trauma / high acuity", "NYC-adjacent"]),
    ("Albany Medical Center", "Albany Med", "Albany, NY", "University", 5, 76, 75, 15, 10, 70, "estimated", ["Northeastern NY tertiary", "Capital Region living", "Broad generalist cases"]),
    ("University at Buffalo", "Buffalo", "Buffalo, NY", "University", 8, 78, 72, 16, 12, 74, "estimated", ["Large academic class", "Lake Erie city", "Affordable Great Lakes living"]),
    ("University at Buffalo (Sisters of Charity)", "Buffalo Sisters", "Buffalo, NY", "Hybrid", 4, 74, 31, 69, 0, 58, "published", ["Highly DO-friendly community program", "Sisters of Charity / Catholic Health", "UB-affiliated, smaller class"]),
    ("University of Rochester", "Rochester", "Rochester, NY", "University", 8, 85, 86, 8, 6, 84, "estimated", ["Strong academic reputation", "Lake Ontario nearby", "Research-friendly"]),
    ("SUNY Upstate Medical University", "Upstate", "Syracuse, NY", "University", 5, 76, 78, 12, 10, 70, "estimated", ["Central NY academic", "Solid volume", "Lower cost of living"]),
    ("University of Pennsylvania Health System", "Penn", "Philadelphia, PA", "University", 8, 96, 95, 3, 2, 97, "estimated", ["Ivy academic elite", "Top fellowships", "High-acuity HUP"]),
    ("Sidney Kimmel Medical College at Thomas Jefferson University/TJUH", "Jefferson", "Philadelphia, PA", "University", 8, 86, 88, 7, 5, 84, "estimated", ["Center City Philadelphia", "Strong clinical training", "Good fellowship match"]),
    ("Temple University Hospital", "Temple", "Philadelphia, PA", "University", 6, 81, 72, 12, 16, 76, "estimated", ["North Philly safety-net", "High-volume obstetrics", "Diverse pathology"]),
    ("Penn State Milton S Hershey Medical Center", "Penn State Hershey", "Hershey, PA", "University", 5, 82, 85, 10, 5, 80, "estimated", ["Academic medical town", "Strong MFM", "Lower COL than Philly"]),
    ("UPMC Medical Education", "UPMC / Pitt", "Pittsburgh, PA", "University", 8, 90, 90, 6, 4, 90, "estimated", ["Top-tier academic", "Magee-Womens Hospital", "Excellent fellowships"]),
    ("Geisinger Health System", "Geisinger", "Danville, PA", "Hybrid", 4, 77, 70, 22, 8, 70, "estimated", ["Integrated health system", "Rural-regional mix", "Early operative experience"]),
    ("Abington Memorial Hospital", "Abington", "Abington, PA", "Community", 5, 75, 65, 22, 13, 60, "estimated", ["Busy suburban community", "High delivery volume", "Philly suburbs"]),
    ("Main Line Health System/Lankenau Medical Center", "Lankenau", "Wynnewood, PA", "Community", 5, 76, 72, 18, 10, 62, "estimated", ["Main Line suburbs", "Excellent public schools nearby", "Community surgical volume"]),
    ("Cooper Medical School of Rowan University/Cooper University Hospital", "Cooper / Rowan", "Camden, NJ", "University", 6, 80, 70, 18, 12, 76, "estimated", ["South Jersey academic", "Level 1 trauma", "Philly metro access"]),
    ("Rutgers Health/Robert Wood Johnson Medical School", "Rutgers RWJ", "New Brunswick, NJ", "University", 6, 83, 80, 12, 8, 82, "estimated", ["Flagship Rutgers OB/GYN", "Solid fellowships", "Central Jersey"]),
    ("Rutgers Health/New Jersey Medical School", "Rutgers NJMS", "Newark, NJ", "University", 6, 80, 68, 12, 20, 76, "estimated", ["Busy Newark training", "High-acuity obstetrics", "Diverse patients"]),
    ("Rutgers Health/Cooperman Barnabas Medical Center", "Cooperman Barnabas", "Livingston, NJ", "Hybrid", 10, 79, 72, 18, 10, 70, "estimated", ["Very large class", "Suburban high-volume", "Top NJ public schools nearby"]),
    ("Rutgers Health/Monmouth Medical Center", "Monmouth", "Long Branch, NJ", "Hybrid", 5, 74, 19, 63, 18, 58, "published", ["Highly DO-friendly", "Jersey Shore location", "Community-university affiliate"]),
    ("Hackensack University Medical Center", "Hackensack", "Hackensack, NJ", "University", 6, 81, 56, 39, 5, 74, "published", ["DO-friendly academic", "Busy northern NJ", "NYC commute possible"]),
    ("Saint Peter's University Hospital/Rutgers Robert Wood Johnson Medical School", "St. Peter's / Rutgers", "New Brunswick, NJ", "Hybrid", 4, 73, 20, 50, 30, 58, "published", ["DO-friendly", "Community affiliate", "Central Jersey"]),
    ("Christiana Care Health Services", "Christiana", "Newark, DE", "Hybrid", 6, 80, 78, 14, 8, 72, "estimated", ["High-volume regional center", "Delaware living", "Philly ~45 min"]),
    ("Johns Hopkins University", "Johns Hopkins", "Baltimore, MD", "University", 8, 98, 96, 2, 2, 99, "estimated", ["Historic #1 reputation", "Research and fellowships elite", "Complex tertiary gyn"]),
    ("University of Maryland", "Maryland", "Baltimore, MD", "University", 8, 85, 84, 8, 8, 84, "estimated", ["Shock Trauma system", "Strong academic", "Inner Harbor city"]),
    ("Sinai Hospital of Baltimore", "Sinai Baltimore", "Baltimore, MD", "Community", 4, 72, 47, 40, 13, 58, "published", ["DO-friendly community", "Baltimore living", "Hands-on training"]),
    ("MedStar Health/Washington Hospital Center", "MedStar WHC", "Washington, DC", "University", 10, 86, 80, 10, 10, 84, "estimated", ["One of the largest DC classes", "Very high volume", "Capitol Hill access"]),
    ("George Washington University", "GW", "Washington, DC", "University", 6, 85, 88, 6, 6, 84, "estimated", ["Foggy Bottom downtown", "Academic DC", "Policy and advocacy access"]),
    ("Howard University", "Howard", "Washington, DC", "University", 4, 80, 85, 5, 10, 72, "estimated", ["HBCU academic mission", "Diverse patient care", "DC location"]),
    ("Inova Fairfax Medical Campus", "Inova Fairfax", "Falls Church, VA", "Hybrid", 6, 84, 82, 12, 6, 78, "estimated", ["Northern Virginia tertiary", "Excellent public schools", "DC metro without DC prices quite"]),
    ("University of Virginia Medical Center", "UVA", "Charlottesville, VA", "University", 6, 90, 93, 5, 2, 88, "estimated", ["Top public academic", "College-town lifestyle", "Strong resident culture"]),
    ("Virginia Commonwealth University Health System", "VCU", "Richmond, VA", "University", 7, 83, 82, 10, 8, 80, "estimated", ["Busy safety-net academic", "Growing Richmond", "Solid fellowships"]),
    ("Old Dominion University", "ODU / EVMS", "Norfolk, VA", "University", 5, 80, 84, 11, 5, 74, "published", ["Formerly EVMS", "Hampton Roads / water", "Coastal Virginia"]),
    ("Carilion Clinic-Virginia Tech Carilion School of Medicine", "Carilion / Virginia Tech", "Roanoke, VA", "University", 4, 78, 80, 14, 6, 70, "estimated", ["Blue Ridge setting", "Newer academic", "Regional tertiary"]),
    ("Duke University Hospital", "Duke", "Durham, NC", "University", 8, 96, 96, 2, 2, 97, "estimated", ["Elite academic Triangle", "Research powerhouse", "Top fellowship match"]),
    ("University of North Carolina Hospitals", "UNC", "Chapel Hill, NC", "University", 8, 94, 94, 4, 2, 94, "estimated", ["Public academic flagship", "Outstanding schools nearby", "Superb generalist + fellowships"]),
    ("Wake Forest University School of Medicine", "Wake Forest", "Winston-Salem, NC", "University", 6, 86, 88, 8, 4, 84, "estimated", ["Strong academic culture", "Atrium Health resources", "Piedmont living"]),
    ("ECU Health Medical Center/East Carolina University", "ECU", "Greenville, NC", "University", 6, 78, 75, 15, 10, 70, "estimated", ["High-volume eastern NC", "Rural + tertiary mix", "Affordable"]),
    ("Carolinas Medical Center", "Atrium Carolinas", "Charlotte, NC", "University", 6, 84, 82, 12, 6, 80, "estimated", ["Charlotte tertiary flagship", "Growing city", "Strong volume"]),
    ("Mountain Area Health Education Center", "MAHEC", "Asheville, NC", "Community", 4, 76, 70, 22, 8, 58, "estimated", ["Asheville lifestyle", "Mountain medicine", "Community-focused"]),
    ("Medical University of South Carolina", "MUSC", "Charleston, SC", "University", 6, 86, 86, 8, 6, 84, "estimated", ["Coastal academic flagship", "Historic Charleston", "Strong MFM"]),
    ("Prisma Health/University of South Carolina SOM Columbia", "Prisma Columbia", "Columbia, SC", "University", 5, 77, 78, 14, 8, 70, "estimated", ["Midlands academic", "Affordable South", "Broad training"]),
    ("Prisma Health/University of South Carolina SOM Greenville", "Prisma Greenville", "Greenville, SC", "University", 5, 79, 80, 14, 6, 72, "estimated", ["Fast-growing Greenville", "Strong community-academic", "Upstate SC"]),
    ("Emory University School of Medicine", "Emory", "Atlanta, GA", "University", 9, 92, 92, 5, 3, 93, "estimated", ["Top Southeast academic", "Grady + Emory mix", "Elite fellowships"]),
    ("Morehouse School of Medicine", "Morehouse", "Atlanta, GA", "University", 4, 78, 82, 8, 10, 68, "estimated", ["HBCU mission", "Grady experience", "Atlanta"]),
    ("Medical College of Georgia", "MCG Augusta", "Augusta, GA", "University", 6, 78, 80, 12, 8, 72, "estimated", ["State academic", "Affordable", "Solid volume"]),
    ("Atrium Health Navicent The Medical Center/Mercer University School of Medicine", "Navicent / Mercer", "Macon, GA", "Hybrid", 4, 73, 70, 20, 10, 60, "estimated", ["Central Georgia", "Community-academic", "Early autonomy"]),
    ("WellStar Kennestone Regional Medical Center", "Wellstar Kennestone", "Marietta, GA", "Community", 4, 74, 72, 18, 10, 58, "estimated", ["Atlanta suburbs", "Busy community hospital", "Good schools nearby"]),
    ("University of Alabama Medical Center", "UAB", "Birmingham, AL", "University", 8, 87, 88, 7, 5, 88, "estimated", ["Southeast academic flagship", "Very high volume", "Strong fellowships"]),
    ("USA Health", "South Alabama", "Mobile, AL", "University", 4, 74, 75, 15, 10, 62, "estimated", ["Gulf Coast", "Regional academic", "Affordable"]),
    ("Vanderbilt University Medical Center", "Vanderbilt", "Nashville, TN", "University", 8, 95, 95, 3, 2, 96, "estimated", ["Elite academic", "Nashville lifestyle", "Top-tier fellowships"]),
    ("University of Tennessee", "UT Memphis", "Memphis, TN", "University", 8, 79, 75, 12, 13, 74, "estimated", ["High-volume Regional One", "Affordable", "Diverse pathology"]),
    ("University of Tennessee Medical Center at Knoxville", "UT Knoxville", "Knoxville, TN", "University", 4, 76, 80, 12, 8, 68, "estimated", ["Smoky Mountains nearby", "Regional academic", "Lower COL"]),
    ("University of Tennessee College of Medicine at Chattanooga", "UT Chattanooga", "Chattanooga, TN", "Hybrid", 4, 75, 78, 14, 8, 62, "estimated", ["UETCOM / UTCOM Chattanooga", "Erlanger", "Riverfront city revival", "Hands-on training", "Outdoor lifestyle"]),
    ("Meharry Medical College", "Meharry", "Nashville, TN", "University", 4, 76, 80, 8, 12, 64, "estimated", ["HBCU academic", "Nashville", "Mission-driven care"]),
    ("University of Florida", "Florida", "Gainesville, FL", "University", 5, 85, 86, 8, 6, 84, "estimated", ["SEC academic flagship", "Strong research", "College town"]),
    ("University of Florida College of Medicine Jacksonville", "UF Jacksonville", "Jacksonville, FL", "University", 6, 78, 75, 12, 13, 72, "estimated", ["Urban safety-net", "Atlantic coast city", "High volume"]),
    ("University of Miami/Jackson Health System", "Miami / Jackson", "Miami, FL", "University", 8, 87, 78, 8, 14, 86, "estimated", ["Jackson Memorial volume", "International pathology", "Waterfront city"]),
    ("Mount Sinai Medical Center of Florida", "Mount Sinai Miami Beach", "Miami Beach, FL", "Community", 4, 74, 60, 20, 20, 60, "estimated", ["Miami Beach", "Community academic", "Ocean lifestyle"]),
    ("University of South Florida Morsani", "USF", "Tampa, FL", "University", 6, 83, 82, 10, 8, 80, "estimated", ["Tampa Bay", "Growing academic", "Gulf access"]),
    ("Orlando Health", "Orlando Health", "Orlando, FL", "Hybrid", 6, 78, 72, 16, 12, 68, "estimated", ["Large community-academic", "Theme-park city", "High volume"]),
    ("University of Central Florida/HCA Florida Healthcare (Greater Orlando/Osceola)", "UCF / HCA Orlando", "Orlando, FL", "Hybrid", 3, 72, 38, 62, 0, 58, "published", ["Osceola Regional / Kissimmee", "HCA + UCF", "Very DO-friendly"]),
    ("Louisiana State University", "LSU New Orleans", "New Orleans, LA", "University", 8, 82, 80, 10, 10, 78, "estimated", ["Charity/University mix", "Unique city culture", "High-volume obstetrics"]),
    ("Tulane University", "Tulane", "New Orleans, LA", "University", 6, 81, 85, 8, 7, 78, "estimated", ["Uptown academic", "New Orleans lifestyle", "Solid research"]),
    ("Ochsner Clinic Foundation", "Ochsner", "New Orleans, LA", "Hybrid", 6, 80, 78, 12, 10, 74, "estimated", ["Large integrated system", "Gulf South referrals", "Strong generalist"]),
    ("Louisiana State University (Baton Rouge)", "LSU Baton Rouge", "Baton Rouge, LA", "University", 4, 74, 78, 12, 10, 64, "estimated", ["State capital academic", "Affordable", "Regional volume"]),
    ("Louisiana State University (Shreveport)", "LSU Shreveport", "Shreveport, LA", "University", 6, 74, 72, 14, 14, 66, "estimated", ["High-volume safety-net", "Very affordable", "Broad pathology"]),
    ("University of Arkansas for Medical Sciences", "UAMS", "Little Rock, AR", "University", 5, 78, 82, 10, 8, 74, "estimated", ["State flagship", "Only academic in AR", "Affordable living"]),
    ("University of Mississippi Medical Center", "Ole Miss / UMMC", "Jackson, MS", "University", 6, 75, 80, 12, 8, 70, "estimated", ["Only academic in MS", "High-acuity", "Very affordable"]),
    ("University of Oklahoma Health Sciences Center", "Oklahoma", "Oklahoma City, OK", "University", 6, 80, 82, 12, 6, 76, "estimated", ["OU Oklahoma City", "OUHSC", "State flagship", "Growing OKC", "Solid fellowships"]),
    ("SSM Health St. Anthony Hospital", "SSM OKC", "Oklahoma City, OK", "Community", 3, 72, 0, 100, 0, 52, "published", ["Saint Anthony / St. Anthony", "Historically osteopathic community program", "High surgical volume", "Midtown Oklahoma City"]),
    ("University of Oklahoma School of Community Medicine (Tulsa)", "OU Tulsa", "Tulsa, OK", "University", 4, 74, 78, 14, 8, 62, "estimated", ["Community-academic Tulsa", "Affordable", "Hands-on"]),
    ("University of Texas Southwestern Medical Center", "UTSW", "Dallas, TX", "University", 18, 93, 90, 6, 4, 94, "estimated", ["Largest OB/GYN class in the U.S.", "Parkland volume", "Elite academic Dallas"]),
    ("Baylor College of Medicine", "Baylor", "Houston, TX", "University", 12, 92, 90, 6, 4, 93, "estimated", ["Texas Medical Center", "Huge volume", "Top-tier fellowships"]),
    ("University of Texas Health Science Center at Houston", "UT Houston / McGovern", "Houston, TX", "University", 12, 88, 85, 8, 7, 88, "estimated", ["Memorial Hermann + LBJ", "Very large class", "TMC resources"]),
    ("University of Texas Medical Branch Hospitals", "UTMB", "Galveston, TX", "University", 8, 82, 82, 10, 8, 78, "estimated", ["Island / Gulf living", "Historic Texas academic", "Regional referral"]),
    ("University of Texas Health Science Center San Antonio", "UT San Antonio", "San Antonio, TX", "University", 8, 83, 80, 12, 8, 80, "estimated", ["Large academic", "Affordable big city", "Strong volume"]),
    ("University of Texas at Austin Dell Medical School", "Dell Med / UT Austin", "Austin, TX", "University", 6, 86, 88, 8, 4, 82, "estimated", ["Newer academic in a beloved city", "Dell Seton", "Austin lifestyle"]),
    ("Baylor University Medical Center", "Baylor Dallas", "Dallas, TX", "Hybrid", 6, 80, 78, 14, 8, 72, "estimated", ["Private tertiary Dallas", "Strong surgical volume", "Urban Texas"]),
    ("John Peter Smith Hospital", "JPS Fort Worth", "Fort Worth, TX", "Community", 6, 76, 60, 22, 18, 62, "estimated", ["County hospital volume", "Fort Worth culture", "Hands-on autonomy"]),
    ("Texas Tech University Health Sciences Center at Lubbock", "Texas Tech Lubbock", "Lubbock, TX", "University", 4, 74, 78, 14, 8, 64, "estimated", ["West Texas academic", "Very affordable", "High volume per resident"]),
    ("Texas Tech University HSC El Paso", "Texas Tech El Paso", "El Paso, TX", "University", 4, 74, 70, 12, 18, 64, "estimated", ["Border health", "Bilingual care", "Mountain-desert city"]),
    ("Methodist Hospital (Houston)", "Houston Methodist", "Houston, TX", "Hybrid", 5, 81, 80, 12, 8, 74, "estimated", ["TMC private tertiary", "Strong resources", "Houston"]),
    ("Texas A&M College of Medicine-Scott and White Medical Center", "Baylor Scott & White", "Temple, TX", "University", 5, 77, 80, 14, 6, 70, "estimated", ["Integrated Texas system", "Smaller city", "Solid training"]),
    ("McGaw Medical Center of Northwestern University", "Northwestern", "Chicago, IL", "University", 12, 97, 95, 3, 2, 97, "estimated", ["Prentice Women's Hospital", "Elite Midwest academic", "Lakefront Chicago"]),
    ("University of Chicago", "UChicago", "Chicago, IL", "University", 6, 92, 94, 4, 2, 93, "estimated", ["Hyde Park academic", "Complex tertiary", "Research-heavy"]),
    ("Rush University Medical Center", "Rush", "Chicago, IL", "University", 6, 86, 86, 8, 6, 84, "estimated", ["West Loop academic", "Strong clinical", "Chicago living"]),
    ("University of Illinois College of Medicine at Chicago", "UIC", "Chicago, IL", "University", 8, 82, 75, 10, 15, 78, "estimated", ["Safety-net academic", "Diverse patients", "Large class"]),
    ("Loyola University Medical Center", "Loyola", "Maywood, IL", "University", 6, 83, 85, 10, 5, 80, "estimated", ["Suburban academic", "Strong Jesuit tradition", "Chicago metro"]),
    ("Southern Illinois University", "SIU", "Springfield, IL", "University", 4, 74, 78, 14, 8, 64, "estimated", ["Capital city academic", "Affordable", "Hands-on"]),
    ("University of Illinois College of Medicine at Peoria", "UIC Peoria / OSF", "Peoria, IL", "Hybrid", 4, 73, 33, 40, 27, 58, "published", ["OSF Saint Francis Medical Center", "DO and IMG friendly", "Community-academic", "Affordable Midwest"]),
    ("Indiana University School of Medicine", "Indiana", "Indianapolis, IN", "University", 10, 86, 86, 8, 6, 84, "estimated", ["Large academic class", "Riley + Methodist system", "Affordable big city"]),
    ("University of Michigan Health System", "Michigan", "Ann Arbor, MI", "University", 7, 97, 95, 3, 2, 97, "estimated", ["Consistently top 5 reputation", "Von Voigtlander Women's", "Outstanding schools"]),
    ("Detroit Medical Center/Wayne State University", "Wayne State / DMC", "Detroit, MI", "University", 10, 81, 78, 13, 9, 76, "published", ["Hutzel Women's Hospital", "Very high volume", "DO-friendly academic"]),
    ("Henry Ford Hospital", "Henry Ford", "Detroit, MI", "University", 6, 80, 75, 16, 9, 74, "estimated", ["Integrated Henry Ford system", "Urban Detroit", "Solid fellowships"]),
    ("Corewell Health (Royal Oak)", "Corewell Royal Oak", "Royal Oak, MI", "Hybrid", 8, 80, 72, 18, 10, 72, "estimated", ["Beaumont legacy", "Suburban Detroit", "High volume"]),
    ("Corewell Health – Grand Rapids/Michigan State University", "Corewell Grand Rapids", "Grand Rapids, MI", "Hybrid", 6, 79, 78, 22, 0, 70, "published", ["West Michigan", "DO-friendly", "Lake Michigan nearby"]),
    ("Corewell Health (Dearborn)", "Corewell Dearborn", "Dearborn, MI", "Hybrid", 4, 72, 27, 20, 53, 58, "published", ["DO and IMG friendly", "Metro Detroit", "Community volume"]),
    ("Henry Ford Providence Hospital", "Providence Southfield", "Southfield, MI", "Hybrid", 4, 72, 25, 70, 5, 58, "published", ["Highly DO-friendly", "Suburban Detroit", "Community training"]),
    ("Ohio State University/Mount Carmel Hospital", "Ohio State", "Columbus, OH", "University", 11, 88, 86, 10, 4, 88, "estimated", ["Large academic class", "James + OSU Wexner", "Growing Columbus"]),
    ("University of Cincinnati Medical Center/College of Medicine", "Cincinnati", "Cincinnati, OH", "University", 8, 84, 84, 10, 6, 82, "estimated", ["Strong academic", "Ohio River city", "Good fellowships"]),
    ("Case Western Reserve University/University Hospitals Cleveland Medical Center", "Case / UH", "Cleveland, OH", "University", 6, 86, 88, 7, 5, 86, "estimated", ["MacDonald Women's Hospital", "Academic Cleveland", "Lake Erie"]),
    ("Cleveland Clinic Foundation", "Cleveland Clinic", "Cleveland, OH", "University", 6, 90, 90, 6, 4, 90, "estimated", ["World-class health system", "Strong gyn surgery", "Lake Erie city"]),
    ("The MetroHealth System/Case Western Reserve University", "MetroHealth", "Cleveland, OH", "University", 6, 78, 70, 14, 16, 70, "estimated", ["County academic", "High-volume safety-net", "Cleveland"]),
    ("Wright State University", "Wright State", "Dayton, OH", "University", 6, 75, 72, 18, 10, 64, "estimated", ["Wright-Patt / Dayton", "Affordable Ohio", "Solid generalist"]),
    ("University of Toledo", "Toledo", "Toledo, OH", "University", 4, 74, 70, 18, 12, 62, "estimated", ["Lake Erie access", "Affordable", "Regional academic"]),
    ("University of Wisconsin Hospitals and Clinics", "Wisconsin", "Madison, WI", "University", 8, 90, 90, 6, 4, 88, "estimated", ["Top public academic", "Lakes and campus town", "Excellent schools"]),
    ("Medical College of Wisconsin Affiliated Hospitals", "MCW", "Milwaukee, WI", "University", 8, 84, 84, 10, 6, 82, "estimated", ["Froedtert academic", "Lakefront Milwaukee", "Strong volume"]),
    ("University of Minnesota", "Minnesota", "Minneapolis, MN", "University", 9, 88, 88, 8, 4, 86, "estimated", ["Large academic Twin Cities", "Lakes lifestyle", "Strong fellowships"]),
    ("Mayo Clinic College of Medicine and Science (Rochester)", "Mayo Rochester", "Rochester, MN", "University", 5, 94, 94, 4, 2, 95, "estimated", ["Mayo system excellence", "Small-city academic", "Unmatched resources"]),
    ("University of Iowa Hospitals and Clinics", "Iowa", "Iowa City, IA", "University", 6, 88, 88, 8, 4, 86, "estimated", ["Perennial top-tier public", "College town", "Outstanding training"]),
    ("Washington University/B-JH/SLCH Consortium", "WashU", "St. Louis, MO", "University", 8, 96, 95, 3, 2, 97, "estimated", ["Elite academic Midwest", "Barnes-Jewish", "Research and fellowships"]),
    ("SSM Health/Saint Louis University School of Medicine", "SLU", "St. Louis, MO", "University", 5, 81, 92, 8, 0, 76, "published", ["SSM / SLU academic", "St. Louis", "Solid clinical"]),
    ("University of Missouri-Kansas City School of Medicine", "UMKC", "Kansas City, MO", "University", 6, 78, 77, 6, 17, 70, "published", ["Truman Medical Center", "KC lifestyle", "Urban safety-net"]),
    ("University of Missouri-Columbia", "Missouri", "Columbia, MO", "University", 4, 77, 82, 12, 6, 70, "estimated", ["Mizzou academic", "College town", "Affordable"]),
    ("University of Kansas School of Medicine", "Kansas", "Kansas City, KS", "University", 4, 80, 84, 10, 6, 76, "estimated", ["KU Med academic", "KC metro", "Solid fellowships"]),
    ("University of Kansas (Wichita)", "KU Wichita", "Wichita, KS", "University", 5, 74, 75, 18, 7, 62, "estimated", ["KUMC Wichita", "Community-academic", "Affordable plains city", "Hands-on"]),
    ("University of Nebraska Medical Center College of Medicine", "Nebraska", "Omaha, NE", "University", 5, 81, 84, 10, 6, 76, "estimated", ["UNMC", "Omaha livability", "Strong volume"]),
    ("Creighton University School of Medicine (Omaha)", "Creighton Omaha", "Omaha, NE", "University", 10, 80, 81, 6, 13, 74, "published", ["Large Jesuit class", "CHI Health", "DO-friendly academic"]),
    ("University of Kentucky College of Medicine", "Kentucky", "Lexington, KY", "University", 6, 82, 84, 10, 6, 78, "estimated", ["Bluegrass academic", "UK Chandler", "College-town plus horse country"]),
    ("University of Louisville School of Medicine", "Louisville", "Louisville, KY", "University", 6, 80, 80, 12, 8, 74, "estimated", ["Urban academic", "Ohio River city", "High volume"]),
    ("West Virginia University", "WVU", "Morgantown, WV", "University", 4, 76, 80, 14, 6, 68, "estimated", ["Mountain academic", "Very affordable", "Regional tertiary"]),
    ("University of Colorado", "Colorado", "Aurora, CO", "University", 10, 91, 90, 6, 4, 90, "estimated", ["CU Anschutz", "Anschutz academic", "Mountains and city", "Large class"]),
    ("University of Utah Health", "Utah", "Salt Lake City, UT", "University", 6, 87, 88, 8, 4, 86, "estimated", ["Mountain West flagship", "Outdoor lifestyle", "Strong academic"]),
    ("University of Arizona College of Medicine-Phoenix", "Arizona Phoenix", "Phoenix, AZ", "University", 6, 80, 80, 12, 8, 74, "estimated", ["Banner University Phoenix", "Desert metro", "Growing program"]),
    ("University of Arizona College of Medicine-Tucson", "Arizona Tucson", "Tucson, AZ", "University", 5, 79, 82, 10, 8, 74, "estimated", ["Historic UA academic", "Desert mountains", "Affordable West"]),
    ("Creighton University School of Medicine (Phoenix)", "Creighton Phoenix", "Phoenix, AZ", "University", 8, 78, 75, 16, 9, 70, "estimated", ["St. Joseph's / Dignity", "Large desert class", "Phoenix growth"]),
    ("University of New Mexico School of Medicine", "New Mexico", "Albuquerque, NM", "University", 6, 80, 82, 10, 8, 74, "estimated", ["Unique high-altitude Southwest", "Strong family planning tradition", "Sandia mountain city"]),
    ("Kirk Kerkorian School of Medicine at UNLV", "UNLV", "Las Vegas, NV", "University", 5, 76, 70, 18, 12, 66, "estimated", ["Kirk Kerkorian SOM", "24-hour city", "High volume"]),
    ("HCA Healthcare Sunrise Health GME/MountainView", "HCA MountainView", "Las Vegas, NV", "Community", 4, 70, 25, 69, 6, 52, "published", ["Highly DO-friendly", "Community Las Vegas", "Hands-on"]),
    ("University of California (San Francisco)", "UCSF", "San Francisco, CA", "University", 10, 99, 96, 2, 2, 99, "estimated", ["Often #1 reputation", "Zuckerberg SFGH + UCSF", "Unmatched academics"]),
    ("Stanford Health Care-Sponsored Stanford University", "Stanford", "Stanford, CA", "University", 6, 97, 96, 2, 2, 98, "estimated", ["Silicon Valley academic", "Lucile Packard + Stanford", "Elite research"]),
    ("UCLA David Geffen School of Medicine/UCLA Medical Center", "UCLA", "Los Angeles, CA", "University", 10, 96, 94, 4, 2, 96, "estimated", ["Westwood flagship", "Large class", "Top-tier fellowships"]),
    ("University of Southern California/LAC+USC Medical Center", "LAC+USC", "Los Angeles, CA", "University", 8, 88, 80, 8, 12, 86, "estimated", ["County + academic mix", "Enormous volume", "Downtown LA"]),
    ("University of California (San Diego) Medical Center", "UCSD", "San Diego, CA", "University", 7, 91, 92, 5, 3, 90, "estimated", ["La Jolla academic", "Pacific lifestyle", "Strong research"]),
    ("University of California (Irvine)", "UC Irvine", "Irvine, CA", "University", 7, 86, 88, 7, 5, 84, "estimated", ["Orange County academic", "Exceptional public schools", "Coast nearby"]),
    ("University of California Davis Health", "UC Davis", "Sacramento, CA", "University", 6, 86, 88, 7, 5, 84, "estimated", ["Northern CA academic", "More affordable than Bay", "Strong MFM"]),
    ("Los Angeles County-Harbor-UCLA Medical Center", "Harbor-UCLA", "Torrance, CA", "University", 6, 84, 78, 10, 12, 80, "estimated", ["County South Bay", "High-volume autonomy", "Near the Pacific"]),
    ("Cedars-Sinai Medical Center", "Cedars-Sinai", "Los Angeles, CA", "University", 6, 88, 88, 6, 6, 84, "estimated", ["Private LA tertiary", "Celebrity-city resources", "Strong gyn surgery"]),
    ("Loma Linda University Health Education Consortium", "Loma Linda", "Loma Linda, CA", "University", 6, 80, 82, 12, 6, 74, "estimated", ["Faith-based academic", "Inland Empire", "Solid volume"]),
    ("Kaiser Permanente Northern California (San Francisco)", "Kaiser SF", "San Francisco, CA", "Hybrid", 4, 84, 85, 10, 5, 72, "estimated", ["Kaiser integrated model", "SF living", "Population-health focus"]),
    ("Kaiser Permanente Northern California (Oakland)", "Kaiser Oakland", "Oakland, CA", "Hybrid", 5, 83, 82, 12, 6, 72, "estimated", ["East Bay Kaiser", "High volume", "Bay access"]),
    ("Kaiser Permanente Northern California (Santa Clara)", "Kaiser Santa Clara", "Santa Clara, CA", "Hybrid", 5, 83, 84, 10, 6, 72, "estimated", ["South Bay Kaiser", "Excellent schools nearby", "Silicon Valley"]),
    ("Kaiser Permanente Southern California (Los Angeles)", "Kaiser LA", "Los Angeles, CA", "Hybrid", 6, 82, 82, 12, 6, 70, "estimated", ["Sunset Kaiser", "Integrated LA", "Predictable system"]),
    ("University of California (San Francisco)/Fresno", "UCSF Fresno", "Fresno, CA", "University", 4, 76, 75, 14, 11, 66, "estimated", ["Central Valley volume", "UCSF affiliation", "Affordable California"]),
    ("Adventist Health White Memorial", "White Memorial", "Los Angeles, CA", "Community", 4, 72, 55, 25, 20, 56, "estimated", ["East LA community", "High-volume obstetrics", "DO-friendly"]),
    ("University of Washington", "UW", "Seattle, WA", "University", 7, 93, 93, 5, 2, 94, "estimated", ["WWAMI regional leader", "Pacific Northwest", "Top-tier academic"]),
    ("Oregon Health & Science University", "OHSU", "Portland, OR", "University", 7, 89, 90, 6, 4, 88, "estimated", ["Oregon flagship", "Hilltop campus", "Strong academics + lifestyle"]),
    ("University of Hawaii", "Hawaii", "Honolulu, HI", "University", 6, 80, 78, 12, 10, 70, "estimated", ["Only civilian program in Hawaii", "Island living", "Unique Pacific pathology"]),
]

CITIES.update(EXTRA_CITIES)
PROGRAMS.extend(EXTRA_PROGRAMS)

# Published hospital birth totals where the training site is well-known.
# Everything else is modeled from class size, program type, and volume language.
DELIVERY_OVERRIDES = {
    "University of Texas Southwestern Medical Center": 13374,
    "McGaw Medical Center of Northwestern University": 12000,
    "UPMC Medical Education": 10500,
    "Inova Fairfax Medical Campus": 10000,
    "Women and Infants Hospital of Rhode Island/Brown University": 8500,
    "Maimonides Medical Center": 7500,
    "Mass General Brigham/Brigham and Women's Hospital/Massachusetts General Hospital": 6200,
    "Christiana Care Health Services": 6200,
    "University of Southern California/LAC+USC Medical Center": 5500,
    "Rutgers Health/Cooperman Barnabas Medical Center": 5500,
    "Detroit Medical Center/Wayne State University": 5000,
    "University of Miami/Jackson Health System": 4500,
    "Abington Memorial Hospital": 4500,
    "MedStar Health/Washington Hospital Center": 4000,
}

DELIVERIES_PER_RESIDENT = {
    "Community": 320,
    "Hybrid": 400,
    "University": 450,
}


def estimate_deliveries(name: str, ptype: str, class_size: int, highlights: list[str]) -> int:
    if name in DELIVERY_OVERRIDES:
        return DELIVERY_OVERRIDES[name]
    base = float(class_size * DELIVERIES_PER_RESIDENT.get(ptype, 400))
    text = " ".join(highlights).lower()
    if any(key in text for key in ("enormous volume", "huge volume", "parkland")):
        base = max(base, 9000)
    elif "very high" in text:
        base *= 1.35
    elif any(
        key in text
        for key in ("high-volume", "high volume", "high delivery", "high clinical volume")
    ):
        base *= 1.2
    elif "community volume" in text:
        base *= 0.9
    digest = int(hashlib.md5(name.encode()).hexdigest()[:8], 16)
    factor = 0.93 + (digest % 15) / 100  # 0.93–1.07
    return max(250, int(round(base * factor / 50.0) * 50))


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def main() -> None:
    programs = []
    seen = set()
    for row in PROGRAMS:
        (
            name,
            short,
            city_key,
            ptype,
            class_size,
            quality,
            md,
            do,
            img,
            fellowship,
            do_source,
            highlights,
        ) = row
        city = CITIES[city_key]
        city_name, state = city_key.rsplit(", ", 1)
        overlay = overlay_for(name, city_name, state)
        if overlay.get("class_size"):
            class_size = overlay["class_size"]
        if overlay.get("source"):
            md = overlay["md"]
            do = overlay["do"]
            img = overlay["img"]
            do_source = overlay["source"]
        pid = slugify(short)
        if pid in seen:
            pid = slugify(f"{short}-{state}")
        seen.add(pid)

        # Corewell Dearborn had fellowship as string "58" due to a typo in the tuple
        if isinstance(fellowship, str):
            fellowship = int(fellowship)

        deliv = overlay_deliveries(name, city_name, state)
        if deliv:
            annual_deliveries = deliv["annual_deliveries"]
            deliveries_source = deliv["source"]
            deliveries_note = deliv["note"]
        else:
            annual_deliveries = estimate_deliveries(name, ptype, class_size, highlights)
            deliveries_source = "estimated"
            deliveries_note = (
                "No matched public hospital birth total; modeled from class size and program type."
            )

        programs.append(
            {
                "id": pid,
                "name": name,
                "shortName": short,
                "city": city_name,
                "state": state,
                "region": REGION[state],
                "type": ptype,
                "classSize": class_size,
                "annualDeliveries": annual_deliveries,
                "annualDeliveriesSource": deliveries_source,
                "annualDeliveriesNote": deliveries_note,
                "cityPopulation": city["pop"],
                "costOfLiving": city["col"],
                "middleSchoolQuality": city["ms"],
                "highSchoolQuality": city["hs"],
                "inStateCollegeQuality": city["colleges"],
                "programQuality": quality,
                "townQuality": city["town"],
                "waterProximity": city["water"],
                "waterNote": city["water_note"],
                "percentMD": md,
                "percentDO": do,
                "percentIMG": img,
                "doMdSource": do_source,
                "fellowshipStrength": fellowship,
                "safety": city["safety"],
                "walkability": city["walk"],
                "climate": city["climate"],
                "highlights": highlights,
            }
        )

    # Validate
    sources = {"published": 0, "estimated": 0, "roster": 0}
    delivery_sources: dict[str, int] = {}
    for p in programs:
        sources[p["doMdSource"]] = sources.get(p["doMdSource"], 0) + 1
        delivery_sources[p["annualDeliveriesSource"]] = (
            delivery_sources.get(p["annualDeliveriesSource"], 0) + 1
        )
        total = p["percentMD"] + p["percentDO"] + p["percentIMG"]
        if abs(total - 100) > 1:
            raise SystemExit(f"MD/DO/IMG mismatch for {p['shortName']}: {total}")
        if city_key := f"{p['city']}, {p['state']}":
            pass

    out = Path(__file__).resolve().parents[1] / "src" / "data" / "programs.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated": "2026-08-26",
        "notes": (
            "Program quality synthesizes Doximity-style reputation, academic standing, "
            "and fellowship depth. City stats use Census populations and C2ER-style cost "
            "of living (100 = U.S. average). School and college scores are metro/state "
            "approximations. DO/MD/IMG splits and class sizes use 2026 FREIDA program "
            "surveys (three-year resident averages) where matched; a few programs use a "
            "current resident-roster count (marked roster); otherwise they are estimates "
            "from program type and typical mix. Annual deliveries use hospital-published "
            "birth totals where available, New York SPARCS 2023 delivery discharges, "
            "California HCAI 2024 perinatal discharges, and CMS hospital cost-report "
            "nursery days (converted at ~2.1 nursery days per birth). A small remainder "
            "is still modeled from class size when no public hospital total matched."
        ),
        "programs": programs,
    }
    out.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {len(programs)} programs to {out}")
    print(
        f"Resident mix sources: {sources['published']} FREIDA 2026, "
        f"{sources['roster']} roster, {sources['estimated']} estimated"
    )
    print("Delivery sources:", ", ".join(f"{k} {v}" for k, v in sorted(delivery_sources.items())))


if __name__ == "__main__":
    main()
