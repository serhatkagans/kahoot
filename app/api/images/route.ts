import {fail,isTeacher,limited,maxImage,readImage,sameOrigin,saveImage} from '../../../lib/server';
export const dynamic='force-dynamic';
// Soru görseli (?id=…). Ad içerik özeti olduğu için değişmez; uzun süre önbellekte tutulabilir.
export async function GET(request:Request){const img=readImage(new URL(request.url).searchParams.get('id'));if(!img)return new Response('Bulunamadı',{status:404});
return new Response(new Uint8Array(img.body),{headers:{'Content-Type':img.type,'Cache-Control':'public, max-age=31536000, immutable'}});}
// Görsel yükleme (form alanı: file). PNG, JPG, GIF ya da WEBP; en çok 3 MB.
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);if(!isTeacher(request))return fail('Öğretmen girişi gerekli.',401);
if(limited(request,'images',200,10*60_000))return fail('Çok fazla görsel yüklendi. Birkaç dakika sonra tekrar dene.',429);
try{const f=(await request.formData()).get('file');if(!(f instanceof Blob))return fail('Görsel seçilmedi.');if(f.size>maxImage)return fail('Görsel en çok 3 MB olabilir.',413);
const id=saveImage(Buffer.from(await f.arrayBuffer()));return id?Response.json({id},{status:201}):fail('Yalnızca PNG, JPG, GIF ya da WEBP yüklenebilir.');
}catch(e){console.error('Görsel yüklenemedi',e);return fail('Görsel yüklenemedi. Tekrar dene.',503);}}
