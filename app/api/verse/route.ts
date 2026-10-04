import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(){
  const supabase=await createClient();
  const now=new Date();
  const start=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
  const day=Math.floor(start/86400000);
  const index=((day%700)+700)%700;
  const {data,error}=await supabase.from("verses").select("id,chapter,verse,sanskrit,transliteration").order("chapter").order("verse").range(index,index);
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({verse:data?.[0]??null});
}