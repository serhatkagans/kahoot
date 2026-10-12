import {assignmentReport,getAssignment,gradeAssignment,listAssignments,saveAssignment} from '../../../lib/assignments';
import {fail,isTeacher,sameOrigin} from '../../../lib/server';
import {getLiveReport,gradeLiveReport,listLiveReports,reportCsv,reportSummary,type StoredReport} from '../../../lib/reports';
export const dynamic='force-dynamic';

function find(id:string|null):StoredReport|undefined{if(!id)return;const match=id.match(/^odev-(\d{6})$/);if(match){const a=getAssignment(match[1]);return a?assignmentReport(a):undefined;}return getLiveReport(id);}
export async function GET(request:Request){if(!isTeacher(request))return fail('Öğretmen girişi gerekli.',401);const q=new URL(request.url).searchParams,id=q.get('id');
if(id){const report=find(id);if(!report)return fail('Rapor bulunamadı.',404);if(q.get('csv'))return new Response(reportCsv(report),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${report.id}.csv"`}});return Response.json(report);}
const reports=[...listLiveReports(),...listAssignments().map(a=>assignmentReport(a))].sort((a,b)=>b.createdAt-a.createdAt);return Response.json(reports.map(reportSummary));}
export async function POST(request:Request){if(!sameOrigin(request)||!isTeacher(request))return fail('Öğretmen girişi gerekli.',401);try{const p=await request.json() as Record<string,unknown>;if(p.action!=='grade'||typeof p.id!=='string'||typeof p.player!=='string'||!Number.isInteger(p.question)||typeof p.ok!=='boolean')return fail('Geçersiz istek.');const index=p.question as number;
const match=p.id.match(/^odev-(\d{6})$/);if(match){const a=getAssignment(match[1]);if(!a||!gradeAssignment(a,p.player,index,p.ok))return fail('Yanıt bulunamadı.',404);saveAssignment(a);return Response.json(assignmentReport(a));}
const r=getLiveReport(p.id);if(!r||!gradeLiveReport(r,p.player,index,p.ok))return fail('Yanıt bulunamadı.',404);return Response.json(r);
}catch{return fail('Değerlendirme kaydedilemedi.',503);}}
