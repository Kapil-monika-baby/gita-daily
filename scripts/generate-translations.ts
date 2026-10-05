import {TranslationServiceClient} from "@google-cloud/translate";
import {createClient} from "@supabase/supabase-js";

const SUPPORTED=["hi","mr","gu","bn","ta","te","kn","ml","pa","or","as","ur","ne","fr","de","es","pt","it","ru","ja","ko","zh","ar","id","th"];
const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
const translator=new TranslationServiceClient();
const projectId=process.env.GOOGLE_CLOUD_PROJECT_ID!;
const location=process.env.GOOGLE_CLOUD_LOCATION||"global";
const target=process.argv[2];

if(!projectId||!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or GOOGLE_CLOUD_PROJECT_ID");
if(!target||!SUPPORTED.includes(target)) throw new Error(`Usage: npm run translations:generate -- <language>. Supported: ${SUPPORTED.join(", ")}`);

const {data:verses,error}=await supabase.from("verses").select("id,chapter,verse,sanskrit,transliteration").order("chapter").order("verse");
if(error) throw error;
if(!verses?.length) throw new Error("No verses found");

const parent=`projects/${projectId}/locations/${location}`;
let generated=0;
for(let i=0;i<verses.length;i+=50){
 const batch=verses.slice(i,i+50);
 const contents=batch.map(v=>`Chapter ${v.chapter}, Verse ${v.verse}: ${v.sanskrit}`);
 const [response]=await translator.translateText({parent,sourceLanguageCode:"sa",targetLanguageCode:target,contents,mimeType:"text/plain"});
 const translations=response.translations||[];
 for(let j=0;j<batch.length;j++){
   const translated=translations[j]?.translatedText?.trim();
   if(!translated) continue;
   const quality=translated.length>=20?70:45;
   const {error:e}=await supabase.from("translations").upsert({
     verse_id:batch[j].id,language:target,meaning:translated,source_language:"sa",
     model:"google-cloud-translation",version:"v1-google",review_status:"pending",
     quality_score:quality,review_note:"Machine-generated; pending semantic review."
   },{onConflict:"verse_id,language"});
   if(e) throw e;
   generated++;
 }
 console.log(`Generated ${generated}/${verses.length} for ${target}`);
}
console.log(`Done: ${generated} translations for ${target}. All remain pending review.`);