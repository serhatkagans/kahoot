import type {Metadata} from 'next';
import Host from '../host';
export const metadata:Metadata={title:'Oyunu sun · GençTek Kahoot'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const {id,pin}=await searchParams;return <Host id={typeof id==='string'?id:''} pin={typeof pin==='string'&&/^\d{6}$/.test(pin)?pin:''}/>;}
