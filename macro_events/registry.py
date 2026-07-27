"""Macro event registry — static JSON lookup with convenience filters."""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Literal

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_REGISTRY_PATH = _DATA_DIR / "macro_events.json"

Category = Literal[
    "fed_decision",
    "tariff",
    "election",
    "banking_crisis",
    "exogenous_shock",
]


class MacroEvent:
    __slots__ = ("id", "name", "category", "date", "description", "expected", "magnitude_bp")

    def __init__(
        self,
        id: str,
        name: str,
        category: str,
        date: date,
        description: str,
        expected: bool,
        magnitude_bp: int | None,
    ) -> None:
        self.id = id
        self.name = name
        self.category = category
        self.date = date
        self.description = description
        self.expected = expected
        self.magnitude_bp = magnitude_bp

    def __repr__(self) -> str:
        return f"MacroEvent({self.id!r}, {self.date.isoformat()})"


def _load_raw() -> list[dict]:
    with open(_REGISTRY_PATH, "r") as f:
        return json.load(f)["events"]


def _to_event(raw: dict) -> MacroEvent:
    return MacroEvent(
        id=raw["id"],
        name=raw["name"],
        category=raw["category"],
        date=datetime.strptime(raw["date"], "%Y-%m-%d").date(),
        description=raw["description"],
        expected=raw["expected"],
        magnitude_bp=raw["magnitude_bp"],
    )


def all_events() -> list[MacroEvent]:
    return [_to_event(e) for e in _load_raw()]


def events_by_category(category: Category) -> list[MacroEvent]:
    return [e for e in all_events() if e.category == category]


def events_between(start: date, end: date) -> list[MacroEvent]:
    return [e for e in all_events() if start <= e.date <= end]


def get_event(event_id: str) -> MacroEvent | None:
    matches = [e for e in all_events() if e.id == event_id]
    return matches[0] if matches else None


def event_dates(category: Category | None = None) -> list[date]:
    evts = events_by_category(category) if category else all_events()
    return sorted(e.date for e in evts)
