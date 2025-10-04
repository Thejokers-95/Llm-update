import os, json, re, datetime
import requests
from bs4 import BeautifulSoup

URL = os.getenv("LEADERBOARD_URL", "https://llm-stats.com/").strip()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml"
}

def clean_txt(s):
    return re.sub(r"\s+", " ", s or "").strip()

def parse_rows(card):
    """
    Récupère les lignes 'rang | nom | valeur' dans une carte.
    La structure des cartes est cohérente: un conteneur <div class="space-y-3">
    avec plusieurs <div class="flex ... justify-between ..."> pour chaque rang.
    """
    results = []
    grid = card.find("div", class_=lambda c: c and "space-y-3" in c)
    if not grid:
        return results

    rows = grid.find_all("div", class_=lambda c: c and "justify-between" in c)
    for row in rows:
        # nom : lien <a> si présent, sinon <span> dans le bloc min-w-0
        name_tag = row.select_one("div.min-w-0 a") or row.select_one("div.min-w-0 span")
        name = clean_txt(name_tag.get_text()) if name_tag else ""

        # valeur : <span class="tabular-nums ...">
        val_tag = row.find("span", class_=lambda c: c and "tabular-nums" in c)
        value = clean_txt(val_tag.get_text()) if val_tag else ""

        # si jamais le nom a été coupé (ex: "GPT" + "5"), tente de recoller
        if name == "GPT" and value and value.startswith("5"):
            name = "GPT-5"

        if name:
            results.append({"name": name, "value": value})
    return results

def card_by_title(soup, title_text):
    """
    Retourne le bloc 'carte' en partant du <h3> dont le texte contient title_text.
    On remonte au wrapper qui contient ensuite les lignes.
    """
    h3 = soup.find("h3", string=lambda t: t and title_text.lower() in t.lower())
    if not h3:
        return None
    # Le <h3> est à l'intérieur d'un <div class="p-6"> qui, lui, contient la liste.
    return h3.find_parent("div", class_=lambda c: c and "p-6" in c)

def fetch():
    r = requests.get(URL, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.text

def build_payload(html):
    soup = BeautifulSoup(html, "lxml")

    sections = {
        "code":           "Best LLM - Code",
        "multimodal":     "Best Multimodal LLM",
        "knowledge":      "Best LLM - Knowledge",
        "longest_context":"Longest Context Model",
        "cheapest":       "Cheapest API Provider",
        "fastest":        "Fastest API Provider",
    }

    data = {k: [] for k in sections}

    for key, title in sections.items():
        card = card_by_title(soup, title)
        if not card:
            continue
        rows = parse_rows(card)
        # limite à 5 pour rester lisible côté plugin
        data[key] = rows[:5]

    payload = {
        "source": URL,
        "last_updated": datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
        **data
    }
    return payload

def save_files(payload, html):
    # fichier principal
    with open("top-leaderboards.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    # petit log pour debug
    with open("build-log.json", "w", encoding="utf-8") as f:
        json.dump({
            "fetched_from": URL,
            "utc": datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "counts": {k: len(payload.get(k, [])) for k in
                       ["code","multimodal","knowledge","longest_context","cheapest","fastest"]}
        }, f, ensure_ascii=False, indent=2)

def main():
    html = fetch()
    payload = build_payload(html)
    save_files(payload, html)
    print("COUNTS:", {k: len(payload[k]) for k in payload if isinstance(payload[k], list)})

if __name__ == "__main__":
    main()
