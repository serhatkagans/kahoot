import type {Metadata} from 'next';
import Editor from '../editor';
export const metadata:Metadata={title:'Kahoot düzenle · GençTek Kahoot'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const {id}=await searchParams;return <Editor id={typeof id==='string'?id:''}/>;}
