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

const {data:masters,error}=await supabase.from("verse_meanings").select("verse_id,meaning").eq("language","en").eq("review_status","approved").order("created_at");
if(error) throw error;
if(!masters?.length) throw new Error("No approved English master meanings found. Approve the master meanings before translating.");

const parent=`projects/${projectId}/locations/${location}`;
let generated=0;
for(let i=0;i<masters.length;i+=50){
 const batch=masters.slice(i,i+50);
 const contents=batch.map(v=>v.meaning);
 const [response]=await translator.translateText({parent,sourceLanguageCode:"en",targetLanguageCode:target,contents,mimeType:"text/plain"});
 const translations=response.translations||[];
 for(let j=0;j<batch.length;j++){
   const translated=translations[j]?.translatedText?.trim();
   if(!translated) continue;
   const quality=translated.length>=20?70:45;
   const {error:e}=await supabase.from("translations").upsert({
     verse_id:batch[j].verse_id,language:target,meaning:translated,source_language:"en",
     model:"google-cloud-translation",version:"v1-google",review_status:"pending",
     quality_score:quality,review_note:"Machine-generated from approved English master; pending semantic review."
   },{onConflict:"verse_id,language"});
   if(e) throw e;
   generated++;
 }
 console.log(`Generated ${generated}/${masters.length} for ${target}`);
}
console.log(`Done: ${generated} translations for ${target}. All remain pending review.`);