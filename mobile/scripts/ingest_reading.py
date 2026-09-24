# -*- coding: utf-8 -*-
# Okuma hatti: telifsiz/bireysel kaynaklardan metin + gorsel + ses ceker,
# uygulamanin makale formatina yazar. ingest_songs.py deseniyle ayni ruh:
# fiziksel indir -> (istege bagli) whisper ile kelime zaman damgasi -> json.
#
# Kaynak modulleri (adapter):
#   paste     : ONERILEN (VOA icin). Govde metnini SEN saglarsin (item.body ya da
#               scripts/reading_text/<id>.txt); ses + kapak gorseli page_url'den
#               OTOMATIK cekilir, --align ile Whisper kelime kelime hizalar.
#               (VOA govdesi JS+bot koruma yuzunden otomatik cekilemiyor; test edildi.)
#   gutenberg : Project Gutenberg (gutendex API) duz metin (KAMU MALI). GUVENILIR,
#               tam calisir. Ses yok (istersen item'a audio_url ile LibriVox MP3 ekle).
#   voa       : VOA RSS otomatik. MP3 + gorsel alir AMA govde METNI cekilemez (yukari
#               bak). Sadece medya toplamak istersen; metin icin 'paste' kullan.
#   html      : Genel HTML cikarici (BBC / British Council / LibriVox). API yok,
#               KIRILGAN; cogu JS ile render. audio_url verilirse MP3 iner.
#
# Kullanim:
#   # 1) VOA: sayfa metnini scripts/reading_text/<id>.txt dosyasina yapistir,
#   #    reading_sources.json items'a source:"paste" + page_url gir, sonra:
#   python scripts/ingest_reading.py voa_health_telefon --align  # metin+ses+gorsel+hizalama
#   python scripts/ingest_reading.py gutenberg_alice_ch1         # Gutenberg tek parca
#   python scripts/ingest_reading.py --all                       # tum items (+voa feed'leri)
#   python scripts/ingest_reading.py --all --no-tr               # Turkce ceviriyi atla
#   python scripts/ingest_reading.py voa_health_telefon --force  # var olsa da yeniden yaz
#
# Gereksinimler:
#   pip install requests beautifulsoup4 deep-translator playwright
#   python -m playwright install chromium     # JS ile render edilen sayfalar (VOA/BBC/BC) icin
#   (--align icin ayrica) pip install faster-whisper
#
# Uretilenler (her id icin):
#   assets/reading/<id>.mp3          (ses varsa)
#   assets/reading/<id>.jpg          (kapak gorseli varsa)
#   assets/reading/<id>.words.json   (--align ile: kelime zaman damgasi, karaoke icin)
#   assets/articles/_articles.json   (metin girdisi UPSERT: id/title/source/cefr/topic/body_en/body_tr
#                                     + media alanlari (image/audio/has_words) ileride oynatici icin)
import json
import os
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
READ_DIR = os.path.join(ROOT, "assets", "reading")
ARTICLES = os.path.join(ROOT, "assets", "articles", "_articles.json")
SOURCES = os.path.join(ROOT, "scripts", "reading_sources.json")

os.makedirs(READ_DIR, exist_ok=True)

UA = {"User-Agent": "Mozilla/5.0 (langapp reading ingest; personal use)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}
_MODEL = None
_tr = None
_pw = None
_browser = None


# --- yardimcilar -----------------------------------------------------------
def http_get(url, timeout=30):
    import requests
    r = requests.get(url, headers=UA, timeout=timeout)
    r.raise_for_status()
    return r


# --- basssiz tarayici (JS ile render edilen sayfalar: VOA / BBC / BC) -------
def _get_browser():
    global _pw, _browser
    if _browser is None:
        from playwright.sync_api import sync_playwright
        _pw = sync_playwright().start()
        _browser = _pw.chromium.launch(headless=True)
    return _browser


def render_html(url, timeout=45000):
    # Sayfayi gercek tarayicida acar, JS calissin, tam DOM'u dondurur.
    br = _get_browser()
    page = br.new_page(user_agent=UA["User-Agent"])
    try:
        page.goto(url, wait_until="networkidle", timeout=timeout)
        return page.content()
    finally:
        page.close()


def close_browser():
    global _pw, _browser
    try:
        if _browser:
            _browser.close()
        if _pw:
            _pw.stop()
    except Exception:
        pass
    _browser = None
    _pw = None


def clean_paras(text):
    # Ham metni paragraflara boler; cok kisa/bos satirlari eler.
    parts = re.split(r"\n\s*\n", text.replace("\r", ""))
    out = []
    for p in parts:
        p = re.sub(r"[ \t]+", " ", p.strip())
        p = re.sub(r"\n+", " ", p)
        if len(p) >= 40:
            out.append(p)
    return out


def word_count(paras):
    return sum(len(p.split()) for p in paras)


def _gtx(chunk):
    # Anahtarsiz Google ucu (translate_a). deep_translator'in kazayicisi rate-limit
    # yerken bu uc genelde calisir. Basarisizsa deep_translator'a duser.
    import urllib.parse
    u = ("https://translate.googleapis.com/translate_a/single?client=gtx"
         "&sl=en&tl=tr&dt=t&q=" + urllib.parse.quote(chunk))
    d = http_get(u, timeout=20).json()
    return "".join(seg[0] for seg in d[0] if seg and seg[0])


def _tr_chunk(chunk):
    # Tek parcayi cevir: once googleapis ucu, olmazsa deep_translator (MyMemory/Google).
    for attempt in range(4):
        try:
            out = _gtx(chunk)
            if out:
                time.sleep(0.3)
                return out
        except Exception:
            pass
        global _tr
        if _tr is None:
            try:
                from deep_translator import MyMemoryTranslator, GoogleTranslator
                _tr = (MyMemoryTranslator(source="en-GB", target="tr-TR"),
                       GoogleTranslator(source="en", target="tr"))
            except Exception:
                _tr = ()
        for prov in _tr:
            try:
                out = prov.translate(chunk[:490])
                if out:
                    time.sleep(0.3)
                    return out
            except Exception:
                pass
        time.sleep(2 * (attempt + 1))  # geri cekil
    return ""


def translate(text):
    # Uzun paragrafi cumle sinirinda ~1500 char parcalara bolup cevirir. Bos donerse "".
    text = text.strip()
    if not text:
        return ""
    sents = re.split(r"(?<=[.!?]) ", text)
    chunks, buf = [], ""
    for s in sents:
        if len(buf) + len(s) + 1 > 1500 and buf:
            chunks.append(buf.strip())
            buf = ""
        buf += s + " "
    if buf.strip():
        chunks.append(buf.strip())
    out = [_tr_chunk(c) for c in chunks]
    if not any(out):
        return ""
    return " ".join(o for o in out if o)


def download(url, out):
    if not url:
        return False
    if os.path.exists(out):
        print(f"  [atla] var: {os.path.basename(out)}")
        return True
    try:
        r = http_get(url, timeout=60)
        with open(out, "wb") as f:
            f.write(r.content)
        print(f"  [indir] {os.path.basename(out)} ({len(r.content)//1024} KB)")
        return True
    except Exception as e:
        print(f"  [HATA] indirme: {url} -> {e}")
        return False


def align_words(media_path):
    # Ses dosyasindan kelime zaman damgasi (karaoke). Agir; sadece --align ile.
    from faster_whisper import WhisperModel
    global _MODEL
    if _MODEL is None:
        _MODEL = WhisperModel("base.en", device="cpu", compute_type="int8")
    segs, _ = _MODEL.transcribe(media_path, language="en", vad_filter=False, word_timestamps=True)
    words = []
    for s in segs:
        for w in (s.words or []):
            ww = w.word.strip()
            if ww:
                words.append({"w": ww, "start_ms": int(w.start * 1000), "end_ms": int(w.end * 1000)})
    return words


# --- makale yazma ----------------------------------------------------------
def load_articles():
    if os.path.exists(ARTICLES):
        with open(ARTICLES, encoding="utf-8") as f:
            return json.load(f)
    return []


def save_articles(arr):
    with open(ARTICLES, "w", encoding="utf-8") as f:
        json.dump(arr, f, ensure_ascii=False, indent=2)


def save_article(rec, paras, image_url, audio_url, do_tr, do_align, force):
    # rec: {id,title,source,cefr,topic}. paras: Ingilizce paragraf listesi.
    aid = rec["id"]
    if not paras:
        print(f"  [ATLA] {aid}: metin bos")
        return
    arts = load_articles()
    exists = next((a for a in arts if a.get("id") == aid), None)
    if exists and not force:
        print(f"  [atla] {aid} zaten kayitli (--force ile yenile)")
        return

    body_en = "\n\n".join(paras)
    body_tr = ""
    if do_tr:
        print(f"  [ceviri] {len(paras)} paragraf...")
        trs = [translate(p) for p in paras]
        if any(t.strip() for t in trs):
            body_tr = "\n\n".join(trs)
        else:
            print("  [uyari] ceviri alinamadi (rate limit?); Ingilizce yazildi, TR sonra doldurulabilir")

    img_ok = download(image_url, os.path.join(READ_DIR, f"{aid}.jpg")) if image_url else False
    aud_ok = download(audio_url, os.path.join(READ_DIR, f"{aid}.mp3")) if audio_url else False

    has_words = False
    if do_align and aud_ok:
        print(f"  [hizala] whisper...")
        try:
            words = align_words(os.path.join(READ_DIR, f"{aid}.mp3"))
            with open(os.path.join(READ_DIR, f"{aid}.words.json"), "w", encoding="utf-8") as f:
                json.dump(words, f, ensure_ascii=False, indent=2)
            has_words = len(words) > 0
            print(f"  [ok] {len(words)} kelime zamanlandi")
        except Exception as e:
            print(f"  [HATA] hizalama: {e}")

    entry = {
        "id": aid,
        "title": rec["title"],
        "source": rec.get("source_label") or rec.get("source"),
        "cefr": rec.get("cefr"),
        "topic": rec.get("topic"),
        "body_en": body_en,
        "body_tr": (body_tr.strip() or None) if body_tr else None,
        # Kapak: uygulama uzak adresten (uri) gosterir; yerel dosya yedek/ileride offline icin.
        "image_url": image_url or None,
        "image": f"reading/{aid}.jpg" if img_ok else None,
        "audio": f"reading/{aid}.mp3" if aud_ok else None,
        "has_words": has_words,
    }
    arts = [a for a in arts if a.get("id") != aid]
    arts.append(entry)
    save_articles(arts)
    wc = word_count(paras)
    print(f"  [yaz] {aid}: {wc} kelime, ~{max(1, round(wc/200))} dk"
          f"{' +ses' if aud_ok else ''}{' +gorsel' if img_ok else ''}")


# --- adapter: VOA (RSS) ----------------------------------------------------
def voa_ingest(feed, limit, do_tr, do_align, force):
    import xml.etree.ElementTree as ET
    print(f"[VOA:{feed['name']}] {feed['url']}")
    try:
        xml = http_get(feed["url"]).text
    except Exception as e:
        print(f"  [HATA] feed: {e}")
        return
    root = ET.fromstring(xml)
    items = root.findall(".//item")[:limit]
    ns = {"content": "http://purl.org/rss/1.0/modules/content/"}
    for it in items:
        link = (it.findtext("link") or "").strip()
        title = (it.findtext("title") or "").strip()
        if not link or not title:
            continue
        # id: link'ten kararli bir slug uret
        slug = re.sub(r"[^a-z0-9]+", "_", link.lower().split("//")[-1])[-48:].strip("_")
        aid = f"voa_{feed['name']}_{slug[-32:]}"
        # VOA govdesi JS ile geliyor -> sayfayi basssiz tarayicida render et.
        paras, image_url, audio_url = fetch_page(link, render=True)
        # RSS enclosure gorseli (statik, guvenilir); sayfadan gelmezse yedek.
        enc = it.find("enclosure")
        if enc is not None:
            etype = enc.get("type") or ""
            if "audio" in etype and not audio_url:
                audio_url = enc.get("url")
            if "image" in etype:
                image_url = image_url or enc.get("url")
        rec = {"id": aid, "title": title, "source": "voa",
               "source_label": "VOA Learning English", "cefr": feed.get("cefr"),
               "topic": feed.get("topic")}
        print(f"  - {title[:60]}")
        save_article(rec, paras, image_url, audio_url, do_tr, do_align, force)


# --- adapter: Project Gutenberg (gutendex) ---------------------------------
def gutenberg_ingest(item, do_tr, do_align, force):
    print(f"[GUTENBERG] {item['id']} (#{item['gutenberg_id']})")
    try:
        meta = http_get(f"https://gutendex.com/books/{item['gutenberg_id']}").json()
    except Exception as e:
        print(f"  [HATA] gutendex: {e}")
        return
    fmts = meta.get("formats", {})
    txt_url = next((v for k, v in fmts.items() if k.startswith("text/plain")), None)
    img_url = fmts.get("image/jpeg")
    if not txt_url:
        print("  [HATA] duz metin bulunamadi")
        return
    raw = http_get(txt_url).text
    raw = strip_gutenberg(raw)
    max_chars = item.get("max_chars", 3000)
    paras = clean_paras(raw[:max_chars * 2])  # bol, sonra kirp
    # max_chars'a kadar paragraf topla
    picked, total = [], 0
    for p in paras:
        if total + len(p) > max_chars and picked:
            break
        picked.append(p)
        total += len(p)
    rec = {"id": item["id"], "title": item.get("title") or meta.get("title", item["id"]),
           "source": "gutenberg", "source_label": "Project Gutenberg",
           "cefr": item.get("cefr"), "topic": item.get("topic")}
    save_article(rec, picked, img_url, item.get("audio_url", ""), do_tr, do_align, force)


# --- adapter: Simple English Wikipedia (TAM OTOMATIK metin + gorsel) -------
def wikipedia_ingest(item, do_tr, do_align, force):
    # Basit Ingilizce Wikipedia'dan duz metin + kapak gorseli ceker. Yasal (CC-BY-SA),
    # seviyeli (kolay Ingilizce). Ses yok; uygulama okurken telefon sesiyle (TTS) okur.
    import urllib.parse
    lang = item.get("wiki_lang", "simple")
    title = item.get("wiki_title") or item.get("title")
    print(f"[WIKI] {item['id']} <- {title}")
    u = (f"https://{lang}.wikipedia.org/w/api.php?action=query&format=json"
         "&prop=extracts|pageimages&explaintext=1&exsectionformat=plain&redirects=1"
         f"&pithumbsize=800&titles={urllib.parse.quote(title)}")
    try:
        d = http_get(u).json()
    except Exception as e:
        print(f"  [HATA] wiki api: {e}")
        return
    pages = d.get("query", {}).get("pages", {})
    pg = next(iter(pages.values()), {})
    txt = pg.get("extract", "") or ""
    if not txt or "missing" in pg:
        print(f"  [ATLA] sayfa bulunamadi: {title}")
        return
    # Wikipedia paragraflari tek satirla ayrilir; satir bazli topla.
    lines = [re.sub(r"\s+", " ", l).strip() for l in txt.split("\n")]
    paras = [l for l in lines if len(l) >= 40 and not l.endswith("==")]
    max_chars = item.get("max_chars", 2500)
    picked, total = [], 0
    for p in paras:
        if total + len(p) > max_chars and picked:
            break
        picked.append(p)
        total += len(p)
    image = (pg.get("thumbnail") or {}).get("source")
    rec = {"id": item["id"], "title": item.get("title") or pg.get("title"),
           "source": "wikipedia", "source_label": "Simple Wikipedia",
           "cefr": item.get("cefr"), "topic": item.get("topic")}
    save_article(rec, picked, image, item.get("audio_url", ""), do_tr, do_align, force)


# --- adapter: elle metin + otomatik ses/gorsel (VOA icin onerilen yol) -----
def extract_media(html):
    # Bir sayfa HTML'inden ses (mp3) + kapak gorseli linkini cikarir (requests yeter).
    mp3s = re.findall(r'https?://[^\s"\'<>]+\.mp3', html)
    audio = None
    if mp3s:
        hq = [m for m in mp3s if "_hq" in m]
        audio = (hq or mp3s)[0].split("&")[0]
    image = None
    try:
        from bs4 import BeautifulSoup
        og = BeautifulSoup(html, "html.parser").find("meta", property="og:image")
        if og and og.get("content"):
            image = og["content"]
    except Exception:
        pass
    if not image:
        imgs = re.findall(r'https?://[^\s"\'<>]+?\.(?:jpg|jpeg|png)', html)
        big = [i for i in imgs if re.search(r'_w(?:[89]\d\d|1\d\d\d)', i)]  # buyuk boyutu tercih et
        if big or imgs:
            image = (big or imgs)[0]
    return audio, image


def paste_ingest(item, do_tr, do_align, force):
    # Govde metnini SEN saglarsin (item.body veya scripts/reading_text/<id>.txt);
    # ses + gorsel page_url'den OTOMATIK cekilir, --align ile Whisper hizalar.
    aid = item["id"]
    print(f"[PASTE] {aid}")
    body = item.get("body")
    if not body:
        tf = os.path.join(ROOT, "scripts", "reading_text", f"{aid}.txt")
        if os.path.exists(tf):
            with open(tf, encoding="utf-8") as f:
                body = f.read()
        else:
            print(f"  [ATLA] metin yok: item.body doldur ya da dosya ekle -> {tf}")
            return
    paras = clean_paras(body)
    audio_url = item.get("audio_url")
    image_url = item.get("image_url")
    page = item.get("page_url")
    if page and (not audio_url or not image_url):
        try:
            a, i = extract_media(http_get(page).text)
            audio_url = audio_url or a
            image_url = image_url or i
            print(f"  [medya] ses={'ok' if audio_url else 'yok'} gorsel={'ok' if image_url else 'yok'}")
        except Exception as e:
            print(f"  [HATA] sayfa medyasi: {e}")
    rec = {"id": aid, "title": item.get("title") or aid, "source": "voa",
           "source_label": item.get("source_label") or "VOA Learning English",
           "cefr": item.get("cefr"), "topic": item.get("topic")}
    save_article(rec, paras, image_url, audio_url, do_tr, do_align, force)


# --- adapter: genel HTML (BBC / British Council / LibriVox sayfasi) --------
def html_ingest(item, do_tr, do_align, force):
    print(f"[HTML] {item['id']} {item.get('url','')}")
    # BBC/BC de JS ile render ediliyor; render varsayilan (item'da "render": false ile kapatilir).
    render = item.get("render", True)
    paras, image_url, audio_url = fetch_page(item["url"], render=render)
    audio_url = item.get("audio_url") or audio_url
    rec = {"id": item["id"], "title": item.get("title") or item["id"],
           "source": "html", "source_label": item.get("source_label") or "Web",
           "cefr": item.get("cefr"), "topic": item.get("topic")}
    if not item.get("title"):
        # baslik verilmediyse sayfadan al (meta og:title genelde head'de bulunur)
        try:
            from bs4 import BeautifulSoup
            page = render_html(item["url"]) if render else http_get(item["url"]).text
            soup = BeautifulSoup(page, "html.parser")
            og = soup.find("meta", property="og:title")
            if og and og.get("content"):
                rec["title"] = og["content"].strip()
        except Exception:
            pass
    save_article(rec, paras, image_url, audio_url, do_tr, do_align, force)


# --- HTML govde cikarici ---------------------------------------------------
def extract_body(html):
    # Tam HTML'den (govde paragraflari, og:image, mp3) uc bilesenini cikarir.
    # VOA govdesi div.wsw icinde; yoksa <article>, o da yoksa tum <p>'ler.
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", property="og:image")
    image_url = og["content"] if og and og.get("content") else None
    container = soup.select_one("div.wsw") or soup.find("article") or soup
    ps = [p.get_text(" ", strip=True) for p in container.find_all("p")]
    paras = [re.sub(r"\s+", " ", p) for p in ps if len(p) >= 40]
    # mp3: sayfadaki ham linklerden yuksek kaliteliyi tercih et
    mp3s = re.findall(r'https?://[^\s"\'<>]+\.mp3', html)
    audio_url = None
    if mp3s:
        hq = [m for m in mp3s if "_hq" in m]
        audio_url = (hq or mp3s)[0].split("&")[0]
    return paras, image_url, audio_url


def fetch_page(url, render=False):
    # Sayfayi cek (render=True -> basssiz tarayici, JS calissin) + govdeyi cikar.
    try:
        html = render_html(url) if render else http_get(url).text
    except Exception as e:
        print(f"  [HATA] sayfa{' (render)' if render else ''}: {e}")
        return [], None, None
    try:
        return extract_body(html)
    except ImportError:
        print("  [HATA] beautifulsoup4 kurulu degil: pip install beautifulsoup4")
        return [], None, None


def strip_gutenberg(raw):
    # Gutenberg lisans basligini/altbilgisini at, sadece eser govdesini birak.
    start = re.search(r"\*\*\* START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*", raw, re.I | re.S)
    end = re.search(r"\*\*\* END OF (THE|THIS) PROJECT GUTENBERG", raw, re.I | re.S)
    if start:
        raw = raw[start.end():]
    if end:
        raw = raw[:end.start()]
    return raw.strip()


# --- ana akis --------------------------------------------------------------
def main():
    with open(SOURCES, encoding="utf-8") as f:
        cfg = json.load(f)
    argv = sys.argv[1:]
    force = "--force" in argv
    do_tr = "--no-tr" not in argv
    do_align = "--align" in argv
    do_all = "--all" in argv

    voa_limit = 0
    if "--voa" in argv:
        i = argv.index("--voa")
        voa_limit = int(argv[i + 1]) if i + 1 < len(argv) and argv[i + 1].isdigit() else 5
    if do_all and not voa_limit:
        voa_limit = 5

    ids = [a for a in argv if not a.startswith("--") and not a.isdigit()]

    try:
        # 1) VOA feed'leri
        if voa_limit:
            for feed in cfg.get("voa_feeds", []):
                try:
                    voa_ingest(feed, voa_limit, do_tr, do_align, force)
                except Exception as e:
                    print(f"  [HATA] VOA {feed.get('name')}: {e}")

        # 2) tekil items
        items = cfg.get("items", [])
        if ids:
            items = [it for it in items if it["id"] in ids]
        elif not do_all and not voa_limit:
            print("Bir sey secilmedi. Ornek: --voa 5  |  --all  |  <item_id>")
            return
        if do_all or ids:
            for it in items:
                try:
                    src = it.get("source")
                    if src == "wikipedia":
                        wikipedia_ingest(it, do_tr, do_align, force)
                    elif src == "gutenberg":
                        gutenberg_ingest(it, do_tr, do_align, force)
                    elif src in ("paste", "voa_manual"):
                        paste_ingest(it, do_tr, do_align, force)
                    elif src == "html":
                        html_ingest(it, do_tr, do_align, force)
                    else:
                        print(f"[?] bilinmeyen source: {src} ({it.get('id')})")
                except Exception as e:
                    print(f"  [HATA] {it.get('id')}: {e}")
    finally:
        close_browser()


if __name__ == "__main__":
    main()
