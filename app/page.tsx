"use client";
import { useEffect, useState } from "react";

type Verse={chapter:number;verse:number;sanskrit:string;transliteration:string};

export default function Home(){
 const [verse,setVerse]=useState<Verse|null>(null);
 const [show,setShow]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{fetch("/api/verse").then(r=>r.json()).then(x=>{if(x.error) throw new Error(x.error);setVerse(x.verse)}).catch(e=>setError(e.message))},[]);
 return <main className="shell">
  <header className="topbar"><div className="brand">ॐ <span>Gita Daily</span></div><div className="pill">Free • Plus</div></header>
  <section className="hero"><div className="eyebrow">A moment of wisdom, every day</div><h1>Carry one verse with you.</h1><p>Gita Daily brings a Bhagavad Gita shlok to your phone each day — in Sanskrit, with a clear meaning in the language you choose.</p></section>
  <section className="grid"><article className="card">
   {error?<p style={{color:"#a33"}}>{error}</p>:!verse?<p className="muted">Loading today’s shlok…</p>:<>
   <div className="verse-meta"><span>Bhagavad Gita</span><span>Chapter {verse.chapter} • Verse {verse.verse}</span></div>
   <div className="verse sanskrit">{verse.sanskrit}</div><div className="muted">{verse.transliteration}</div>
   {show&&<div className="meaning"><strong>Meaning</strong><br/>Meaning generation will be connected to your chosen language next.</div>}
   <div className="actions"><button className="primary" onClick={()=>setShow(v=>!v)}>{show?"Hide meaning":"Reveal meaning"}</button><button className="secondary">Today’s wallpaper</button></div></>}
  </article><aside className="card"><div className="eyebrow">Gita Daily Plus</div><h2>Build a daily practice.</h2><div className="features"><div className="feature"><b>🔔 Daily shlok</b><span className="muted">One meaningful reminder every day.</span></div><div className="feature"><b>🌐 Your language</b><span className="muted">Keep Sanskrit original; read the meaning in your language.</span></div><div className="feature"><b>🖼️ Daily wallpaper</b><span className="muted">Automatic lock-screen updates on supported Android devices in Plus.</span></div></div><a className="secondary" href="/auth">Sign in</a></aside></section>
  <footer className="footer">Gita Daily uses a normalized 700-verse structure. Sanskrit source data is tracked for verification before store release.</footer>
 </main>
}