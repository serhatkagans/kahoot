// Uygulama ilk açıldığında kütüphaneye yazılan hazır soru setleri. Silinirlerse geri gelmezler (lib/server.ts → ready).
// Tekno Girişimcilik: GençTek Terimler Sözlüğü'ndeki 25 soruluk hazır yarışma (10 Doğru/Yanlış, 15 test sorusu).
// Örnek: her soru türünden birer soru; düzenleyiciyi tanımak için.
const now=Date.UTC(2026,9,11);
export const SEEDS=[
{id:'tekno-girisimcilik',title:'Tekno Girişimcilik',description:'Girişimcilik temel kavramları: MVP, pivot, iş modeli kanvası, yatırım aşamaları ve ekip rolleri.',createdAt:now,updatedAt:now,questions:[
{id:'gir001',type:'tf',text:"MVP'nin temel amacı pazara en kusursuz ürünü sunmaktır.",time:20,points:1,options:[{text:'Doğru',ok:false},{text:'Yanlış',ok:true}]},
{id:'gir002',type:'tf',text:"Bir girişimin değer önerisi, müşteriye sunduğu benzersiz faydadır.",time:20,points:1,options:[{text:'Doğru',ok:true},{text:'Yanlış',ok:false}]},
{id:'gir003',type:'tf',text:"'Pivot' etmek, stratejide köklü değişiklik yapmaktır.",time:20,points:1,options:[{text:'Doğru',ok:true},{text:'Yanlış',ok:false}]},
{id:'gir004',type:'tf',text:"'Bootstrap' yöntemi, yatırım almadan öz sermaye ile büyümektir.",time:20,points:1,options:[{text:'Doğru',ok:true},{text:'Yanlış',ok:false}]},
{id:'gir005',type:'tf',text:"Ölçeklenebilirlik, geliri artırırken maliyetleri aynı oranda artırmamaktır.",time:20,points:1,options:[{text:'Doğru',ok:true},{text:'Yanlış',ok:false}]},
{id:'gir006',type:'tf',text:"Girişimci, risk almaktan her zaman kaçınan kişidir.",time:20,points:1,options:[{text:'Doğru',ok:false},{text:'Yanlış',ok:true}]},
{id:'gir007',type:'tf',text:"Yalın Girişim felsefesinin temeli 'İnşa et-Ölç-Öğren' döngüsüdür.",time:20,points:1,options:[{text:'Doğru',ok:true},{text:'Yanlış',ok:false}]},
{id:'gir008',type:'tf',text:"Patent hakları ömür boyu geçerlidir.",time:20,points:1,options:[{text:'Doğru',ok:false},{text:'Yanlış',ok:true}]},
{id:'gir009',type:'tf',text:"Pazar doğrulaması ürünün müşteri tarafından istendiğini kanıtlamaktır.",time:20,points:1,options:[{text:'Doğru',ok:true},{text:'Yanlış',ok:false}]},
{id:'gir010',type:'tf',text:"Tekno-Girişimcilikte çevresel etki önemli değildir.",time:20,points:1,options:[{text:'Doğru',ok:false},{text:'Yanlış',ok:true}]},
{id:'gir011',type:'quiz',text:"İş Modeli Kanvası'nda 'Maliyet Yapısı' nerede yer alır?",time:20,points:1,options:[{text:"Sol tarafta",ok:true},{text:"Sağ tarafta",ok:false},{text:"Gelirler tarafında",ok:false},{text:"Ekip kısmında",ok:false}]},
{id:'gir012',type:'quiz',text:"Yatırımcı sunumunda (Pitch Deck) hangisi yer almaz?",time:20,points:1,options:[{text:"Problem",ok:false},{text:"Çözüm",ok:false},{text:"Şirket'in mutfak temizliği",ok:true},{text:"Gelir Modeli",ok:false}]},
{id:'gir013',type:'quiz',text:"Ekipte 'Hustler' rolü neyi temsil eder?",time:20,points:1,options:[{text:"Satış ve büyüme",ok:true},{text:"Teknik geliştirme",ok:false},{text:"Tasarım",ok:false},{text:"Yatırımcı",ok:false}]},
{id:'gir014',type:'quiz',text:"Seri A yatırımı öncesi ilk aşama hangisidir?",time:20,points:1,options:[{text:"Tohum (Seed)",ok:true},{text:"Exit",ok:false},{text:"Halka arz",ok:false},{text:"Temettü",ok:false}]},
{id:'gir015',type:'quiz',text:"Growth Hacking nedir?",time:20,points:1,options:[{text:"Kreatif büyüme",ok:true},{text:"Sadece reklam",ok:false},{text:"Pazarı kapatma",ok:false},{text:"Maaş artışı",ok:false}]},
{id:'gir016',type:'quiz',text:"'Problem Tanımı' girişimcilikte neden kritiktir?",time:20,points:1,options:[{text:"Çözümün doğruluğu için",ok:true},{text:"Sadece para için",ok:false},{text:"Zaman geçirmek için",ok:false},{text:"Rakipleri korkutmak için",ok:false}]},
{id:'gir017',type:'quiz',text:"Fikri mülkiyet kapsamında 'Telif Hakkı' neyi korur?",time:20,points:1,options:[{text:"Sanat ve yazılı eserleri",ok:true},{text:"Teknik cihazı",ok:false},{text:"Ofis binasını",ok:false},{text:"Müşteri listesini",ok:false}]},
{id:'gir018',type:'quiz',text:"Bir startup için en büyük risk nedir?",time:20,points:1,options:[{text:"Pazarın istemediği bir ürün yapmak",ok:true},{text:"Çok çalışmak",ok:false},{text:"Az çalışan olması",ok:false},{text:"Ofisin küçük olması",ok:false}]},
{id:'gir019',type:'quiz',text:"'Hipster' rolü ekipte neyi yönetir?",time:20,points:1,options:[{text:"Tasarım ve kullanıcı deneyimi",ok:true},{text:"Satış",ok:false},{text:"Kodlama",ok:false},{text:"Finans",ok:false}]},
{id:'gir020',type:'quiz',text:"İş Modeli Kanvası'nda 'Müşteri İlişkileri' neyi açıklar?",time:20,points:1,options:[{text:"İlişki kurma yollarını",ok:true},{text:"Kira ödemelerini",ok:false},{text:"Çalışan maaşlarını",ok:false},{text:"Hukuki süreçleri",ok:false}]},
{id:'gir021',type:'quiz',text:"'Hacker' rolü ekipte neyle ilgilenir?",time:20,points:1,options:[{text:"Ürünün teknik geliştirilmesi",ok:true},{text:"Sunum yapma",ok:false},{text:"Muhasebe",ok:false},{text:"Yasal izinler",ok:false}]},
{id:'gir022',type:'quiz',text:"'Ölüm Vadisi' aşaması neyi ifade eder?",time:20,points:1,options:[{text:"Girişimin ilk zorlu dönemi",ok:true},{text:"Şirket kapanışı",ok:false},{text:"Yatırım sonrası kutlama",ok:false},{text:"Pazarın doygunluğunu",ok:false}]},
{id:'gir023',type:'quiz',text:"MVP'nin amacı hangisidir?",time:20,points:1,options:[{text:"Hızlı geri bildirim",ok:true},{text:"Kusursuz ürün",ok:false},{text:"Şirketi kapatmak",ok:false},{text:"Daha fazla borç almak",ok:false}]},
{id:'gir024',type:'quiz',text:"Aşağıdakilerden hangisi bir 'Değer Önerisi' olabilir?",time:20,points:1,options:[{text:"Daha hızlı çözüm",ok:true},{text:"Ofis rengi",ok:false},{text:"Çalışan sayısı",ok:false},{text:"Şirket kuruluşu",ok:false}]},
{id:'gir025',type:'quiz',text:"'Melek Yatırımcı' kime destek verir?",time:20,points:1,options:[{text:"Erken aşama girişimlere",ok:true},{text:"Büyük holdinglere",ok:false},{text:"Devlet kurumlarına",ok:false},{text:"Sadece kendi çocuklarına",ok:false}]},
]},
{id:'ornek-soru-turleri',title:'Örnek: Bütün soru türleri',description:'Test, Doğru/Yanlış, Cevabı yaz, Sıralama ve Anket sorularının birer örneği. Kopyalayıp kendi sorularınızla değiştirebilirsiniz.',createdAt:now-1,updatedAt:now-1,questions:[
{id:'ornek001',type:'quiz',text:"Türkiye'nin başkenti neresidir?",time:20,points:1,options:[{text:'İstanbul',ok:false},{text:'Ankara',ok:true},{text:'İzmir',ok:false},{text:'Bursa',ok:false}]},
{id:'ornek002',type:'quiz',text:'Hangileri programlama dilidir? (Birden çok doğru var)',time:30,points:1,multi:true,options:[{text:'Python',ok:true},{text:'HTML',ok:false},{text:'JavaScript',ok:true},{text:'Excel',ok:false}]},
{id:'ornek003',type:'tf',text:'Işık, sesten daha hızlı yayılır.',time:10,points:2,options:[{text:'Doğru',ok:true},{text:'Yanlış',ok:false}]},
{id:'ornek004',type:'type',text:'Bilgisayarın "beyni" olarak bilinen merkezî işlem biriminin İngilizce kısaltması nedir?',time:30,points:1,options:[],accept:['CPU']},
{id:'ornek005',type:'puzzle',text:"Gezegenleri Güneş'e en yakından en uzağa sırala.",time:45,points:1,options:[{text:'Merkür',ok:false},{text:'Venüs',ok:false},{text:'Dünya',ok:false},{text:'Mars',ok:false}]},
{id:'ornek006',type:'poll',text:'Bugünkü dersi nasıl buldun?',time:20,points:0,options:[{text:'Çok iyi',ok:false},{text:'İyi',ok:false},{text:'Orta',ok:false},{text:'Zor',ok:false}]},
]},
];
