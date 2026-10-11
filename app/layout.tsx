import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'GençTek Kahoot',description:'Kahoot tarzı canlı bilgi yarışması: soru setini hazırla, PIN ile oyuncuları bağla, sorular tahtada ilerlesin, sonunda podyum.'};
export const viewport:Viewport={themeColor:'#46178f'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>;}
