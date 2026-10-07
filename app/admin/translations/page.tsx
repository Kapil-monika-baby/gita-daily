"use client";
import { useEffect, useState } from "react";

const languages: [string,string][] = [
  ["hi","हिन्दी"],["mr","मराठी"],["gu","ગુજરાતી"],["bn","বাংলা"],["ta","தமிழ்"],["te","తెలుగు"],
  ["kn","ಕನ್ನಡ"],["ml","മലയാളം"],["pa","ਪੰਜਾਬੀ"],["or","ଓଡ଼ିଆ"],["as","অসমীয়া"],["ur","اردو"],
  ["ne","नेपाली"],["fr","Français"],["de","Deutsch"],["es","Español"],["pt","Português"],["it","Italiano"],
  ["ru","Русский"],["ja","日本語"],["ko","한국어"],["zh","中文"],["ar","العربية"],["id","Bahasa Indonesia"],["th","ไทย"]
];

type Row={id:string;meaning:string;review_status:string;quality_score:number|null;review_note:string|null;verses:{chapter:number;verse:number;sanskrit:string;transliteration:string|null}|null};

export default function TranslationAdmin(){
  const [language,setLanguage]=useState("mr");
  const [rows,setRows]=useState<Row[]>([]);
  const [index,setIndex]=useState(0);
  const [status,setStatus]=useState("pending");
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    setLoading(true);setMessage("");
    try{
      const r=await fetch(`/api/admin/translations?language=${language}&status=${status}&limit=100`,{cache:"no-store"});
      const x=await r.json();
      if(!r.ok) throw new Error(x.error||"Unable to load translations.");
      setRows(x.translations||[]);setIndex(0);
    }catch(e){setRows([]);setMessage(e instanceof Error?e.message:"Unable to load translations.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load()},[language,status]);

  const row=rows[index];
  async function review(nextStatus:string){
    if(!row)return;
    const r=await fetch("/api/admin/translations",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:row.id,status:nextStatus,meaning:row.meaning})});
    const x=await r.json();
    if(!r.ok){setMessage(x.error||"Could not save.");return;}
    setMessage(nextStatus==="approved"?"Approved.":nextStatus==="rejected"?"Rejected.":"Saved.");
    if(index+1<rows.length)setIndex(index+1);else load();
  }

  return <main className="shell">
    <header className="topbar"><div className="brand">ॐ <span>Translation Review</span></div><a className="secondary" href="/">← Gita Daily</a></header>
    <section className="hero"><div className="eyebrow">Admin • Translation review</div><h1>Review machine translations.</h1><p>Approve, reject, or edit translations before they become visible to readers.</p></section>
    <section className="card">
      <div className="actions" style={{justifyContent:"space-between",flexWrap:"wrap"}}>
        <div><label className="muted">Language </label><select value={language} onChange={e=>setLanguage(e.target.value)} style={{marginLeft:8,padding:"10px 12px",borderRadius:10,border:"1px solid #ddd"}}>{languages.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select></div>
        <div><label className="muted">Status </label><select value={status} onChange={e=>setStatus(e.target.value)} style={{marginLeft:8,padding:"10px 12px",borderRadius:10,border:"1px solid #ddd"}}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
      </div>
      {message&&<div className="meaning" style={{marginTop:16}}>{message}</div>}
      {loading?<p className="muted">Loading…</p>:!row?<p className="muted">No {status} translations in this batch.</p>:<>
        <div className="verse-meta"><span>Chapter {row.verses?.chapter} • Verse {row.verses?.verse}</span><span>Quality score: {row.quality_score ?? "—"}</span></div>
        <div className="verse sanskrit">{row.verses?.sanskrit}</div>
        <p className="muted">{row.verses?.transliteration}</p>
        <label className="muted">Translation</label>
        <textarea value={row.meaning} onChange={e=>setRows(rs=>rs.map((x,i)=>i===index?{...x,meaning:e.target.value}:x))} rows={7} style={{width:"100%",marginTop:8,padding:14,border:"1px solid var(--line)",borderRadius:12,fontSize:16,lineHeight:1.5}}/>
        <div className="actions">
          <button className="primary" onClick={()=>review("approved")}>✓ Approve</button>
          <button className="secondary" onClick={()=>review("rejected")}>✕ Reject</button>
          <button className="secondary" onClick={()=>review("pending")}>Save pending</button>
        </div>
        <div className="footer">Showing item {index+1} of {rows.length} loaded. The page loads up to 100 at a time.</div>
      </>}
    </section>
  </main>
}
