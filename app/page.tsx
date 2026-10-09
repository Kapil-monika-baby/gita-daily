"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Verse={id:string;chapter:number;verse:number;sanskrit:string;transliteration:string};
type Translation={language:string;meaning:string;status?:string};
const languages=[["en","English"],["hi","हिन्दी"],["mr","मराठी"],["gu","ગુજરાતી"],["bn","বাংলা"],["ta","தமிழ்"],["te","తెలుగు"],["kn","ಕನ್ನಡ"],["ml","മലയാളം"],["pa","ਪੰਜਾਬੀ"],["or","ଓଡ଼ିଆ"],["as","অসমীয়া"],["ur","اردو"],["ne","नेपाली"],["fr","Français"],["de","Deutsch"],["es","Español"],["pt","Português"],["it","Italiano"],["ru","Русский"],["ja","日本語"],["ko","한국어"],["zh","中文"],["ar","العربية"],["id","Bahasa Indonesia"],["th","ไทย"]];

export default function Home(){
 const [verse,setVerse]=useState<Verse|null>(null);
 const [translation,setTranslation]=useState<Translation|null>(null);
 const [language,setLanguage]=useState("en");
 const [show,setShow]=useState(false);
 const [loadingMeaning,setLoadingMeaning]=useState(false);
 const [error,setError]=useState("");
 const [userEmail,setUserEmail]=useState<string|null>(null);

 useEffect(()=>{
  const canonical="https://gita-daily-nine.vercel.app";
  if(window.location.hostname.endsWith(".vercel.app") && window.location.hostname!=="gita-daily-nine.vercel.app"){
   window.location.replace(canonical+window.location.pathname+window.location.search+window.location.hash);
   return;
  }

  const supabase=createClient();
  supabase.auth.getUser().then(({data})=>setUserEmail(data.user?.email??null));
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   setUserEmail(session?.user?.email??null);
  });
  return ()=>subscription.unsubscribe();
 },[]);

 useEffect(()=>{fetch("/api/verse").then(r=>r.json()).then(x=>{if(x.error)throw new Error(x.error);setVerse(x.verse)}).catch(e=>setError(e.message))},[]);
 useEffect(()=>{
  if(!verse || !show)return;
  setLoadingMeaning(true);setTranslation(null);
  fetch("/api/translation?verseId="+encodeURIComponent(verse.id)+"&language="+encodeURIComponent(language))
   .then(async r=>{const x=await r.json();if(!r.ok||x.error)throw new Error(x.error||"Unable to load translation");return x})
   .then(x=>setTranslation(x.translation??null))
   .catch(e=>setTranslation({language,meaning:e.message,status:"unavailable"}))
   .finally(()=>setLoadingMeaning(false));
 },[verse,language,show]);

 async function signOut(){
  const supabase=createClient();
  await supabase.auth.signOut();
  setUserEmail(null);
 }

 return <main className="shell">
  <header className="topbar"><div className="brand">ॐ <span>Gita Daily</span></div><div className="pill">{userEmail?"Signed in":"Free • Plus"}</div></header>
  <section className="hero"><div className="eyebrow">A moment of wisdom, every day</div><h1>Carry one verse with you.</h1><p>Gita Daily brings a Bhagavad Gita shlok to your phone each day — with a meaning in your chosen language.</p></section>
  <section className="grid"><article className="card">
   {error?<p style={{color:"#a33"}}>{error}</p>:!verse?<p className="muted">Loading today’s shlok…</p>:<>
   <div className="verse-meta"><span>Bhagavad Gita</span><span>Chapter {verse.chapter} • Verse {verse.verse}</span></div>
   <div className="verse sanskrit">{verse.sanskrit}</div><div className="muted">{verse.transliteration}</div>
   <label className="muted" style={{display:"block",marginTop:18}}>Meaning language</label>
   <select value={language} onChange={e=>setLanguage(e.target.value)} style={{marginTop:6,padding:"10px 12px",borderRadius:10,border:"1px solid #ddd",background:"white"}}>
    {languages.map(([code,name])=><option key={code} value={code}>{name}</option>)}
   </select>
   {show&&<div className="meaning"><strong>Meaning</strong><br/>{loadingMeaning?"Translating…":translation?.meaning??"A translation is not available right now."}
    {!loadingMeaning&&translation?.status==="ai_generated_unverified"&&<p className="muted" style={{marginTop:8,fontSize:12}}>AI-translated · Not yet verified</p>}
    {!loadingMeaning&&translation?.status==="reviewed"&&<p className="muted" style={{marginTop:8,fontSize:12}}>Reviewed translation</p>}
   </div>}
   <div className="actions"><button className="primary" onClick={()=>setShow(v=>!v)}>{show?"Hide meaning":"Reveal meaning"}</button><a className="secondary" href="/reader">Read all 700 verses</a></div>
   </>}
  </article>
  <aside className="card"><div className="eyebrow">Gita Daily Plus</div><h2>Build a daily practice.</h2><div className="features">
   <div className="feature"><b>🔔 Daily shlok</b><span className="muted">One meaningful reminder every day.</span></div>
   <div className="feature"><b>🌐 Your language</b><span className="muted">On-demand translations, cached for future readers.</span></div>
   <div className="feature"><b>🖼️ Daily wallpaper</b><span className="muted">Automatic lock-screen updates on supported Android devices in Plus.</span></div>
  </div>
  {userEmail ? <div style={{display:"grid",gap:8}}>
    <div className="muted">Signed in as {userEmail}</div>
    <div className="actions"><a className="secondary" href="/admin/translations">Review translations</a><button className="secondary" onClick={signOut}>Sign out</button></div>
   </div> : <a className="secondary" href="/auth">Sign in</a>}
  </aside></section>
  <footer className="footer">Sanskrit is preserved as the source text. Translations generated on demand are labelled unverified until reviewed.</footer>
 </main>
}
