import Join from './join';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const {pin}=await searchParams;
return <Join start={typeof pin==='string'&&/^\d{6}$/.test(pin)?pin:''}/>;}
