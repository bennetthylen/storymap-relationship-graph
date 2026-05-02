#!/usr/bin/env python3
"""One-off helper: merge published-storymap node labels into i18n/canvas-labels.json with AR + EN fallback for EU langs."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Arabic catalogue-style titles for image / auxiliary nodes (canonical English label → AR).
AR_LABELS: dict[str, str] = {
    '"Confessions of a Husband"': "«اعترافات زوج»",
    "AAWC": "AAWC",
    "Alya's Drawing": "رسم علياء",
    "Ballsam's Village": "قرية بلسم",
    "Biography of Im Ibrahim": "سيرة أم إبراهيم",
    "Biography of Wedad Mitri": "سيرة وداد متري",
    "Divorce Agreement": "اتفاق طلاق",
    "Embroidered Palestinian Dress": "فستان فلسطيني مطرّز",
    "Gam3aya": "جمعية",
    "Hind Rustom and Passent": "هند رستم وبسنت",
    "Hind Rustum Advertisement": "إعلان هند رستم",
    "Hind Rustum Poster": "ملصق هند رستم",
    "Im Ibrahim's Embroidery": "تطريز أم إبراهيم",
    "Kawkab's Certificate": "شهادة كوكب",
    "Kawkab's Family Photos": "صور عائلة كوكب",
    "Mai Kassicieh": "ماي قسيسية",
    "Mariam's Soap & Oil": "صابون وزيت مريم",
    "May Kassicieh's Embroidery": "تطريز ماي قسيسية",
    "Nada Abdel Rahman's Keys": "مفاتيح ندى عبد الرحمن",
    "Nada Shaving": "ندى تحلق",
    "Nubian Women": "نساء نوبيات",
    "Passports": "جوازات سفر",
    "Reem and Shahinda": "ريم وشاهندة",
    "Reem's Grandmother": "جدّة ريم",
    "Rim El Jundi": "ريم الجندي",
    "Saadeya's Wedding Ring": "خاتم زفاف سعادية",
    "Safeya's Basket": "سلة صفية",
    "Shahenda's Letter to Reem": "رسالة شاهندة إلى ريم",
    "The Nubian Exodus": "النزوح النوبي",
    "The Palestinian Exodus": "النزوح الفلسطيني",
    "Wedad Metri's Family Photo": "صورة عائلة وداد متري",
    "Wedad Mitri and her Students": "وداد متري وطالباتها",
    "Wedad's Postcards": "بطاقات وداد البريدية",
    "Widad al Orfali": "وداد العرفلي",
    "Widad al-Orfali Biography": "سيرة وداد العرفلي",
}


def main() -> None:
    labels_path = ROOT / "i18n" / "canvas-labels.json"
    pub_path = ROOT / "published-storymap.json"
    labels = json.loads(labels_path.read_text(encoding="utf-8"))
    pub = json.loads(pub_path.read_text(encoding="utf-8"))

    def key_for(n: dict) -> str:
        from_label = str(n.get("label", "")).strip()
        if from_label:
            return from_label
        return str(n.get("content", "")).strip()

    needed = sorted({key_for(n) for n in pub.get("nodes", []) if key_for(n)})
    # Canonical hub spelling used in i18n files; runtime alias maps published variant → this key.
    skip_alias_only = {"On Reassembling Relations"}

    for eng in needed:
        if eng in skip_alias_only:
            continue
        if eng in labels:
            continue
        if eng not in AR_LABELS:
            raise SystemExit(f"Missing AR_LABELS entry for published label: {eng!r}")
        ar = AR_LABELS[eng]
        labels[eng] = {
            "ar": ar,
            "it": eng,
            "fr": eng,
            "es": eng,
            "de": eng,
        }

    labels_path.write_text(json.dumps(labels, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Updated", labels_path, "keys:", len(labels))


if __name__ == "__main__":
    main()
