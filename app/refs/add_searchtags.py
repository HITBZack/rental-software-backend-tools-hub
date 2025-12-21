import json
import re

INPUT_FILE = "booqable_products.json"
OUTPUT_FILE = "products_with_tags.json"
SYNONYMS_FILE = "synonyms.json"

# Stopwords: common filler words and junk tokens we don’t want in tags
STOPWORDS = {
    "the", "a", "an", "is", "this", "that", "by", "with", "only",
    "ft", "item", "items", "setup", "setups", "diameter", "width", "height",
    "length", "size", "sizes", "color", "colors", "style", "styles",
    "type", "types", "model", "models", "brand", "brands", "make",
    "br", "p", "x", "and", "or", "of", "on", "in", "for", "to", "as",
    "l", "m", "s", "xl", "xxl", "xxxl", "xxl", "xxs", "xs", "i", "it", "if", "perfect",
    "new", "used", "like", "more", "less", "than", "about",
    "all", "some", "any", "every", "such", "no", "not",
    "per", "pers", "we", "you", "up", "dimensions", "dimension", "dimensionses",
    "delivery", "deliveries", "rentals", "rental", "rents", "rent",
    "available", "availables", "availablity", "availablities", "service", "services", "pickup", "pickups", "pick-up",
    "setups", "setup", "setupes", "setuping", "product", "products", "w", "butt", "but", "butts",
    "item", "items", "itemes", "iteming", "itemses", "itemsing", "has", "have", "had", "having", "say",
    "hold","holds", "holding", "holded", "holdes", "holdings", "holdes", "holdingses",
    "use", "uses", "using", "used", "useing", "usees", "usings", "usingses",
    "make", "makes", "making", "mades", "mading", "madeing", "madees", "madeses",
    "do", "does", "doing", "did", "done", "doeses", "doings", "doed", "doesing", "doeses", "go", "nbsp", "nbsps",
    "included", "includes", "including", "include", "includedes", "includings", "includeds", "organically", "organicallies",
    "organic", "organics", "organicses", "organicing", "organices", "organicinges", "organicinges",
    "and/or", "andor", "andors", "andorses", "andoring", "andored", "andores",
    "or/and", "orand", "orands", "orandses", "oranding", "oranded", "orandes", "really", "realies", "reals", "realses", "realing", "realed", "reales","reallies",
    "people", "peoples", "person", "persons", "peopleing", "peoplees", "peopleinges",
    "personing", "persones", "personinges", "personings", "personingses", "personinges",
    "thing", "things", "thinges", "thinging", "thingesing", "thingesed", "thingeses",
    "like", "likes", "liking", "liked", "likeses", "likings", "likingses",
    "etc", "etcs", "etcetera", "etceteras", "timeless", "events", "timelesses", "ltd", "oz", "ozs", "ozes", "ozing", "ozed", "ozesing",
    "be", "tool", "tools"
}

def pluralize(word: str) -> str:
    if len(word) <= 2:  # skip tiny words like x, p, ft
        return word
    if word.endswith("y") and word[-2] not in "aeiou":
        return word[:-1] + "ies"
    elif word.endswith("s"):
        return word + "es"
    else:
        return word + "s"

# --- NEW: helper to split compound words like "tablerunner" → ["table", "runner"]
def split_compound(word: str) -> list[str]:
    known_terms = [
        "table", "runner", "cloth", "cover", "chair", "tent",
        "linen", "napkin", "candle", "stand", "arch", "backdrop"
    ]
    for term in known_terms:
        if word != term and term in word:
            remainder = word.replace(term, "")
            if remainder:
                return [term, remainder]
    return []

def generate_tags(name: str, description: str, synonyms: dict) -> list:
    tags = set()

    # Strip HTML tags from description
    clean_desc = re.sub(r"<[^>]+>", " ", description or "")
    text = f"{name} {clean_desc}".lower()

    # Tokenize into words
    words = re.findall(r"[a-zA-Z]+", text)
    for w in words:
        if w in STOPWORDS:
            continue

        tags.add(w)

        # add plural form
        plural = pluralize(w)
        if plural != w:
            tags.add(plural)

        # expand synonyms for single word
        if w in synonyms:
            tags.update(synonyms[w])

        # --- NEW: expand compound words like "tablerunner"
        parts = split_compound(w)
        if parts:
            tags.update(parts)               # add "table", "runner"
            tags.add(" ".join(parts))        # add "table runner"
            for p in parts:                  # add plurals for parts
                plural = pluralize(p)
                if plural != p:
                    tags.add(plural)

    # expand synonyms for multi-word phrases
    for phrase, syns in synonyms.items():
        if phrase in text:
            tags.update(syns)
            tags.add(phrase)

    # --- Already in your script: Handle compact number tags like "#2"
    compact_matches = re.findall(r"#\s*\d+", text)
    for match in compact_matches:
        compact = match.replace(" ", "")  # turn "# 2" → "#2"
        tags.add(match.strip())           # "# 2"
        tags.add(compact)                 # "#2"

# --- NEW RULE: Remove "glass"/"glasses" from Champagne Wall items
    if "champagne wall" in text:
        tags.discard("glass")
        tags.discard("glasses")

    return sorted(tags)

def enrich_products():
    with open(SYNONYMS_FILE, "r", encoding="utf-8") as f:
        synonyms = json.load(f)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        products = json.load(f)

    for p in products:
        auto_tags = generate_tags(
            p.get("name", ""),
            p.get("description", ""),
            synonyms
        )
        p["tags"] = sorted(set(p.get("tags", []) + auto_tags))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f"✅ Enriched {len(products)} products with extra tags → {OUTPUT_FILE}")

if __name__ == "__main__":
    enrich_products()
