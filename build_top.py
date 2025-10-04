import os, json, re, datetime
import requests
from bs4 import BeautifulSoup

URL = os.getenv("LEADERBOARD_URL", "https://llm-stats.com/").strip()
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml"
}

def clean_txt(s): return re.sub(r"\s+", " ", s or "").strip()

def find_card_by_title(soup, title_text):
    """Trouve le bloc carte en partant du <h3> (ex: 'Best LLM - Code')."""
    h3 = soup.find("h3", string=lambda t: t and title_text.lower() in t.lower())
    if not h3: return None
    return h3.find_parent("div", class_=lambda c: c and "p-6" in c) or h3.parent

def parse_rows(card):
    """
    Lis chaque rang (ligne avec justify-between) et récupère (name, value).
    Attention: pour Cheapest/Fastest, il y a un span '1/2/3...' DANS un div.min-w-0.flex-1,
    et le vrai nom est dans un deuxième div.min-w-0.flex-1 imbriqué.
    On prend donc le DERNIER 'div.min-w-0.flex-1' de la ligne.
    """
    results = []
    if not card: return results
    rows = card.find_all("div", class_=lambda c: c and "justify-between" in c)
    for row in rows:
        # cibler spécifiquement le conteneur profond qui porte le nom
        deep = row.select("div.min-w-0.flex-1")
        name = ""
        if deep:
            d = deep[-1]  # le plus interne = le bon
            tag = d.find("a") or d.find("span")
            if tag: name = clean_txt(tag.get_text())
        else:
            # fallback (au cas où)
            d2 = row.select("div.min-w-0")
            if d2:
                tag = d2[-1].find("a") or d2[-1].find("span")
                if tag: name = clean_txt(tag.get_text())

        val_tag = row.find("span", class_=lambda c: c and "tabular-nums" in c)
        value = clean_txt(val_tag.get_text()) if val_tag else ""
        if name:
            results.append({"name": name, "value": value})
    return results

def build_payload(html):
    soup = BeautifulSoup(html, "lxml")
    sections = {
        "code":            "Best LLM - Code",
        "multimodal":      "Best Multimodal LLM",
        "knowledge":       "Best LLM - Knowledge",
        "longest_context": "Longest Context Model",
        "cheapest":        "Cheapest API Provider",
        "fastest":         "Fastest API Provider",
    }
    data = {}
    for key, title in sections.items():
        card = find_card_by_title(soup, title)
        rows = parse_rows(card)[:5]
        # pour les 3 benchmarks, on renomme 'value' -> 'score' (nombre)
        if key in ("code","multimodal","knowledge"):
            fixed = []
            for r in rows:
                m = re.search(r"(\d{1,3}(?:\.\d+)?)", r["value"])
                if m:
                    fixed.append({"name": r["name"], "score": float(m.group(1))})
            data[key] = fixed
        else:
            data[key] = rows

    payload = {
        "source": URL,
        "last_updated": datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
        **data
    }
    return payload

def main():
    html = requests.get(URL, headers=HEADERS, timeout=35).text
    payload = build_payload(html)
    with open("top-leaderboards.json","w",encoding="utf-8") as f:
        json.dump(payload,f,indent=2,ensure_ascii=False)
    with open("build-log.json","w",encoding="utf-8") as f:
        json.dump({
            "fetched_from": URL,
            "utc": datetime.datetime.utcnow().isoformat(timespec="seconds")+"Z",
            "counts": {k: len(v) for k,v in payload.items() if isinstance(v,list)}
        }, f, indent=2, ensure_ascii=False)
    print("COUNTS:", {k: len(v) for k,v in payload.items() if isinstance(v,list)})

if __name__ == "__main__":
    main()
