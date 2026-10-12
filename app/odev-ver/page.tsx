import AssignmentCreate from '../assignment-create';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const {id}=await searchParams;return <AssignmentCreate id={typeof id==='string'?id:''}/>;}
