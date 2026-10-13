"use client";
import { useEffect, useState, type FormEvent } from "react";

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
  const [importFile,setImportFile]=useState<File|null>(null);
  const [importing,setImporting]=useState(false);
  const [importMessage,setImportMessage]=useState("");

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

  async function importWorkbook(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!importFile || importing)return;
    if(!window.confirm("Import 14,700 Google Translate entries as pending drafts? Human-reviewed approved translations will be preserved; pending/rejected drafts and legacy Argos machine translations may be refreshed as pending. Nothing from this file will be automatically approved."))return;
    setImporting(true);setImportMessage("");
    try{
      const form=new FormData();
      form.append("file",importFile);
      const r=await fetch("/api/admin/translations/import",{method:"POST",body:form});
      const x=await r.json();
      if(!r.ok)throw new Error(x.error||"Import failed.");
      setImportMessage(`Import complete. ${Number(x.imported_or_refreshed_as_pending).toLocaleString()} entries imported/refreshed as pending; ${Number(x.approved_entries_preserved).toLocaleString()} already-approved entries preserved. The new drafts are hidden from readers until approved.`);
      setImportFile(null);
      const input=document.getElementById("translation-import-file") as HTMLInputElement|null;
      if(input)input.value="";
      await load();
    }catch(e){setImportMessage(e instanceof Error?e.message:"Import failed.");}
    finally{setImporting(false);}
  }

  return <main className="shell">
    <header className="topbar"><div className="brand">ॐ <span>Translation Review</span></div><a className="secondary" href="/">← Gita Daily</a></header>
    <section className="hero"><div className="eyebrow">Admin • Translation review</div><h1>Review machine translations.</h1><p>Approve, reject, or edit translations before they become visible to readers.</p></section>
    <section className="card" style={{marginBottom:24}}>
      <h2 style={{marginTop:0}}>Import your Google Translate workbook</h2>
      <p className="muted">Choose the prepared <strong>Gita_Daily_Google_Translate_Import.csv</strong> file (700 verses × 21 languages). Imports are saved as pending drafts. Human-reviewed approved entries are preserved; legacy Argos machine translations may be replaced by pending workbook drafts.</p>
      <form onSubmit={importWorkbook}>
        <div className="actions" style={{alignItems:"center",flexWrap:"wrap"}}>
          <input id="translation-import-file" type="file" accept=".csv,text/csv" onChange={e=>setImportFile(e.target.files?.[0]??null)} required={!importFile} />
          <button className="primary" type="submit" disabled={!importFile||importing}>{importing?"Importing…":"Import CSV as drafts"}</button>
        </div>
      </form>
      {importMessage&&<div className="meaning" role="status" style={{marginTop:16,whiteSpace:"pre-wrap"}}>{importMessage}</div>}
      <p className="footer">The importer validates all 14,700 verse/language pairs before writing, keeps Chapter 13 aligned to the app’s 34-verse numbering, and refuses incomplete or duplicate imports.</p>
    </section>
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
