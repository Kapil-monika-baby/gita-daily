"use client";

import { useEffect, useMemo, useState } from "react";

type Verse = {
  id: string;
  chapter: number;
  verse: number;
  sanskrit: string;
  transliteration: string | null;
};

const languages = [
  ["en", "English"], ["hi", "हिन्दी"], ["mr", "मराठी"], ["gu", "ગુજરાતી"],
  ["bn", "বাংলা"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"],
  ["ml", "മലയാളം"], ["pa", "ਪੰਜਾਬੀ"], ["or", "ଓଡ଼ିଆ"], ["as", "অসমীয়া"],
  ["ur", "اردو"], ["ne", "नेपाली"], ["fr", "Français"], ["de", "Deutsch"],
  ["es", "Español"], ["pt", "Português"], ["it", "Italiano"], ["ru", "Русский"],
  ["ja", "日本語"], ["ko", "한국어"], ["zh", "中文"], ["ar", "العربية"],
  ["id", "Bahasa Indonesia"], ["th", "ไทย"],
];

export default function Reader() {
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [language, setLanguage] = useState("en");
  const [open, setOpen] = useState<string | null>(null);
  const [meanings, setMeanings] = useState<Record<string, string>>({});
  const [loadingMeaning, setLoadingMeaning] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setBookmarks(JSON.parse(localStorage.getItem("gita-daily-bookmarks") || "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedChapter = Number(params.get("chapter"));
    if (Number.isInteger(requestedChapter) && requestedChapter >= 1 && requestedChapter <= 18) {
      setChapter(requestedChapter);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    setOpen(null);
    fetch("/api/verses?chapter=" + chapter)
      .then(r => r.json())
      .then(x => {
        if (x.error) throw new Error(x.error);
        setVerses(x.verses || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chapter]);


  // Support links from the curated wisdom cards, e.g. /reader?chapter=2&verse=47.
  useEffect(() => {
    if (loading || verses.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const requestedChapter = Number(params.get("chapter"));
    const requestedVerse = Number(params.get("verse"));
    if (!Number.isInteger(requestedChapter) || requestedChapter !== chapter) return;
    if (!Number.isInteger(requestedVerse) || requestedVerse < 1) return;
    document.getElementById("verse-" + requestedVerse)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [chapter, loading, verses]);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  function toggleBookmark(id: string) {
    const next = bookmarkSet.has(id)
      ? bookmarks.filter(x => x !== id)
      : [...bookmarks, id];
    setBookmarks(next);
    localStorage.setItem("gita-daily-bookmarks", JSON.stringify(next));
  }

  async function toggleMeaning(verse: Verse) {
    if (open === verse.id) {
      setOpen(null);
      return;
    }
    setOpen(verse.id);
    if (meanings[verse.id] !== undefined) return;

    setLoadingMeaning(verse.id);
    try {
      const response = await fetch(
        "/api/translation?verseId=" + encodeURIComponent(verse.id) + "&language=" + encodeURIComponent(language)
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setMeanings(prev => ({
        ...prev,
        [verse.id]: data.translation?.meaning || "A reviewed translation is not available for this language yet.",
      }));
    } catch {
      setMeanings(prev => ({ ...prev, [verse.id]: "Unable to load the reviewed meaning right now." }));
    } finally {
      setLoadingMeaning(null);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">ॐ <span>Gita Daily</span></a>
        <a className="secondary" href="/">Today</a>
      </header>

      <section className="hero" style={{ paddingBottom: 24 }}>
        <div className="eyebrow">Bhagavad Gita • Full Reader</div>
        <h1>Read all 18 chapters.</h1>
        <p>Explore the complete 700-verse collection. Sanskrit remains the source text; reviewed meanings appear only when available.</p>
      </section>

      <section className="card">
        <div className="actions" style={{ marginTop: 0, alignItems: "center" }}>
          <label>
            <span className="muted">Chapter </span>
            <select value={chapter} onChange={e => setChapter(Number(e.target.value))} style={{ marginLeft: 6, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}>
              {Array.from({ length: 18 }, (_, i) => <option key={i + 1} value={i + 1}>Chapter {i + 1}</option>)}
            </select>
          </label>
          <label>
            <span className="muted">Meaning </span>
            <select value={language} onChange={e => { setLanguage(e.target.value); setMeanings({}); }} style={{ marginLeft: 6, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}>
              {languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </label>
          <span className="muted">{verses.length} verses</span>
        </div>
      </section>

      {error && <section className="card" style={{ marginTop: 20 }}><p style={{ color: "#a33" }}>{error}</p></section>}
      {loading && <section className="card" style={{ marginTop: 20 }}><p className="muted">Loading chapter…</p></section>}

      <section style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {!loading && verses.map(verse => (
          <article className="card" key={verse.id} id={"verse-" + verse.verse}>
            <div className="verse-meta">
              <span>Chapter {verse.chapter} • Verse {verse.verse}</span>
              <button
                className="secondary"
                onClick={() => toggleBookmark(verse.id)}
                aria-label={bookmarkSet.has(verse.id) ? "Remove bookmark" : "Bookmark verse"}
                style={{ padding: "7px 10px" }}
              >
                {bookmarkSet.has(verse.id) ? "★ Saved" : "☆ Save"}
              </button>
            </div>
            <div className="verse sanskrit" style={{ margin: "20px 0 12px", fontSize: "clamp(25px, 3.2vw, 38px)" }}>{verse.sanskrit}</div>
            {verse.transliteration && <div className="muted">{verse.transliteration}</div>}
            <div className="actions">
              <button className="primary" onClick={() => toggleMeaning(verse)}>
                {open === verse.id ? "Hide meaning" : "Show meaning"}
              </button>
            </div>
            {open === verse.id && (
              <div className="meaning" style={{ marginTop: 18 }}>
                <strong>Reviewed meaning</strong><br />
                {loadingMeaning === verse.id ? "Loading…" : meanings[verse.id]}
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
