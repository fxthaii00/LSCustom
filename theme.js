/**
 * theme.js — LTD RoxWood
 * 12 thèmes : sombres, clairs, spéciaux
 * Thème par défaut admin via config/global.defaultTheme
 */

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';

const FB={apiKey:"AIzaSyBA0yD6IqPV_x56BkXEfAG9zAF7wnYt_Zc",authDomain:"lscustom-5014d.firebaseapp.com",projectId:"lscustom-5014d",storageBucket:"lscustom-5014d.firebasestorage.app",messagingSenderId:"810475753399",appId:"1:810475753399:web:5aeb4067f810995a60e232",measurementId:"G-L6ELMX9LQX"};
const app=getApps().length?getApps()[0]:initializeApp(FB);
const db=getFirestore(app);

export const THEMES={
  // ── SOMBRES
  pompe:  {id:'pompe',  label:'Rouge Pompe',   category:'dark',   bg:'#07070a',bg2:'#0b0b0f',bg3:'#101015',bg4:'#14141a',tx:'#ededf0',tx2:'#52505e',tx3:'#232130',brd:'rgba(255,255,255,0.04)',brd2:'rgba(255,255,255,0.08)',accent:'#8B1F1F',accent2:'#5C0A0A',accentRgb:'139,31,31',aurora1:'rgba(139,31,31,.14)',aurora2:'rgba(92,10,10,.08)',desc:'Rouge bordeaux — les pompes du logo',bgRgb:'7,7,10',bg2Rgb:'11,11,15'},
  foret:  {id:'foret',  label:'Vert Forêt',    category:'dark',   bg:'#060a06',bg2:'#0a0f0a',bg3:'#0f150f',bg4:'#131a13',tx:'#e8f0e8',tx2:'#4a5e4a',tx3:'#1e2e1e',brd:'rgba(255,255,255,0.04)',brd2:'rgba(255,255,255,0.08)',accent:'#2D5A1B',accent2:'#1A3A0E',accentRgb:'45,90,27', aurora1:'rgba(45,90,27,.14)',aurora2:'rgba(26,58,14,.08)',desc:'Vert profond — les collines et sapins',bgRgb:'6,10,6',bg2Rgb:'10,15,10'},
  soleil: {id:'soleil', label:'Or Soleil',     category:'dark',   bg:'#080700',bg2:'#0e0c00',bg3:'#141100',bg4:'#1a1500',tx:'#f5f0e0',tx2:'#5a5020',tx3:'#2a2500',brd:'rgba(255,255,255,0.04)',brd2:'rgba(255,255,255,0.08)',accent:'#C8961E',accent2:'#8A6200',accentRgb:'200,150,30',aurora1:'rgba(200,150,30,.14)',aurora2:'rgba(138,98,0,.08)',desc:'Or chaud — le soleil levant du logo',bgRgb:'8,7,0',bg2Rgb:'14,12,0'},
  nuit:   {id:'nuit',   label:'Bleu Nuit',     category:'dark',   bg:'#05060f',bg2:'#080a14',bg3:'#0c0e1a',bg4:'#101220',tx:'#e8eaf5',tx2:'#42465e',tx3:'#1e2030',brd:'rgba(255,255,255,0.04)',brd2:'rgba(255,255,255,0.08)',accent:'#3B5BDB',accent2:'#1E3A8A',accentRgb:'59,91,219', aurora1:'rgba(59,91,219,.14)',aurora2:'rgba(30,58,138,.08)',desc:'Bleu profond — ciel de nuit',bgRgb:'5,6,15',bg2Rgb:'8,10,20'},
  violet: {id:'violet', label:'Violet Nuit',   category:'dark',   bg:'#070510',bg2:'#0b0815',bg3:'#100c1c',bg4:'#140f22',tx:'#ede8f5',tx2:'#524a6a',tx3:'#251e38',brd:'rgba(255,255,255,0.04)',brd2:'rgba(255,255,255,0.08)',accent:'#7C3AED',accent2:'#4C1D95',accentRgb:'124,58,237',aurora1:'rgba(124,58,237,.14)',aurora2:'rgba(76,29,149,.08)',desc:'Violet intense — mystère & élégance',bgRgb:'7,5,16',bg2Rgb:'11,8,21'},
  carbon: {id:'carbon', label:'Carbon',        category:'dark',   bg:'#000000',bg2:'#0a0a0a',bg3:'#111111',bg4:'#181818',tx:'#ffffff',tx2:'#666666',tx3:'#333333',brd:'rgba(255,255,255,0.06)',brd2:'rgba(255,255,255,0.10)',accent:'#e0e0e0',accent2:'#888888',accentRgb:'224,224,224',aurora1:'rgba(224,224,224,.08)',aurora2:'rgba(136,136,136,.05)',desc:'Noir absolu — minimaliste & épuré',bgRgb:'0,0,0',bg2Rgb:'10,10,10'},
  // ── CLAIRS
  jour:   {id:'jour',   label:'Blanc Jour',    category:'light',  bg:'#f8f8fa',bg2:'#ffffff',bg3:'#f0f0f4',bg4:'#e8e8ee',tx:'#0a0a0f',tx2:'#555560',tx3:'#aaaabc',brd:'rgba(0,0,0,0.07)',brd2:'rgba(0,0,0,0.12)',accent:'#8B1F1F',accent2:'#5C0A0A',accentRgb:'139,31,31', aurora1:'rgba(139,31,31,.08)',aurora2:'rgba(200,150,30,.05)',desc:'Fond blanc — couleurs du logo',bgRgb:'248,248,250',bg2Rgb:'255,255,255'},
  prairie:{id:'prairie',label:'Prairie',       category:'light',  bg:'#f4f7f0',bg2:'#ffffff',bg3:'#eaf0e4',bg4:'#dde8d6',tx:'#0e1a0a',tx2:'#4a6040',tx3:'#8aab80',brd:'rgba(0,0,0,0.07)',brd2:'rgba(0,0,0,0.12)',accent:'#2D5A1B',accent2:'#1A3A0E',accentRgb:'45,90,27',  aurora1:'rgba(45,90,27,.10)',aurora2:'rgba(200,150,30,.06)',desc:'Vert clair — air frais & nature',bgRgb:'244,247,240',bg2Rgb:'255,255,255'},
  creme:  {id:'creme',  label:'Crème Vintage', category:'light',  bg:'#faf6ec',bg2:'#fff9ee',bg3:'#f5eed8',bg4:'#ede4c4',tx:'#1a1500',tx2:'#6a5a20',tx3:'#b09a60',brd:'rgba(0,0,0,0.07)',brd2:'rgba(0,0,0,0.12)',accent:'#C8961E',accent2:'#8A6200',accentRgb:'200,150,30',aurora1:'rgba(200,150,30,.12)',aurora2:'rgba(139,31,31,.06)',desc:'Ivoire rétro — papier ancien',bgRgb:'250,246,236',bg2Rgb:'255,249,238'},
  ardoise:{id:'ardoise',label:'Ardoise',        category:'light',  bg:'#eef0f5',bg2:'#f8f9fc',bg3:'#e4e8f2',bg4:'#d8dced',tx:'#0a0c18',tx2:'#4a5070',tx3:'#9aa0c0',brd:'rgba(0,0,0,0.07)',brd2:'rgba(0,0,0,0.12)',accent:'#3B5BDB',accent2:'#1E3A8A',accentRgb:'59,91,219', aurora1:'rgba(59,91,219,.10)',aurora2:'rgba(124,58,237,.06)',desc:'Gris-bleu clair — sobre & moderne',bgRgb:'238,240,245',bg2Rgb:'248,249,252'},
  // ── SPÉCIAUX
  neon:   {id:'neon',   label:'Néon',          category:'special', bg:'#010108',bg2:'#030312',bg3:'#06061a',bg4:'#09091f',tx:'#e0e8ff',tx2:'#4050a0',tx3:'#202060',brd:'rgba(100,120,255,0.08)',brd2:'rgba(100,120,255,0.14)',accent:'#00f0ff',accent2:'#0060ff',accentRgb:'0,240,255',aurora1:'rgba(0,240,255,.15)',aurora2:'rgba(0,96,255,.10)',desc:'Cyan électrique — ambiance arcade',bgRgb:'1,1,8',bg2Rgb:'3,3,18'},
  ember:  {id:'ember',  label:'Ember',          category:'special', bg:'#0c0500',bg2:'#120800',bg3:'#1a0c00',bg4:'#221000',tx:'#ffeedd',tx2:'#7a4020',tx3:'#3a1a00',brd:'rgba(255,120,0,0.07)',brd2:'rgba(255,120,0,0.13)',accent:'#ff6b00',accent2:'#c04000',accentRgb:'255,107,0', aurora1:'rgba(255,107,0,.16)',aurora2:'rgba(192,64,0,.10)',desc:'Orange braise — chaleur & intensité',bgRgb:'12,5,0',bg2Rgb:'18,8,0'},
};

export function applyTheme(themeId, customThemes={}){
  const t=THEMES[themeId]||customThemes[themeId]||THEMES.pompe;
  const s=document.documentElement.style;
  s.setProperty('--bg',t.bg);s.setProperty('--bg2',t.bg2);s.setProperty('--bg3',t.bg3);s.setProperty('--bg4',t.bg4);
  s.setProperty('--tx',t.tx);s.setProperty('--tx2',t.tx2);s.setProperty('--tx3',t.tx3);
  s.setProperty('--brd',t.brd);s.setProperty('--brd2',t.brd2);
  // Normalise accent (les thèmes custom peuvent utiliser ac/accent)
  const ac=t.accent||t.ac||'#8B1F1F';
  const ac2=t.accent2||t.ac2||ac;
  const acRgb=t.accentRgb||t.rgb||'139,31,31';
  s.setProperty('--ac',ac);s.setProperty('--ac2',ac2);s.setProperty('--acRgb',acRgb);s.setProperty('--acD',`rgba(${acRgb},0.10)`);
  if(t.bgRgb){s.setProperty('--bgRgb',t.bgRgb);s.setProperty('--bg2Rgb',t.bg2Rgb);}
  document.documentElement.style.background=t.bg;
  document.querySelectorAll('.aurora .ab').forEach((el,i)=>{
    const a1=t.aurora1||`rgba(${acRgb},.14)`;
    const a2=t.aurora2||`rgba(${acRgb},.08)`;
    if(i===0)el.style.background=`radial-gradient(ellipse,${a1},transparent 70%)`;
    if(i===1)el.style.background=`radial-gradient(ellipse,${a2},transparent 70%)`;
  });
  document.body.classList.toggle('theme-light',t.category==='light');
  localStorage.setItem('rxw_theme',themeId);
  // Sauvegarder aussi le thème custom dans localStorage pour application immédiate
  if(!THEMES[themeId] && customThemes[themeId]){
    localStorage.setItem('rxw_custom_theme_'+themeId, JSON.stringify(customThemes[themeId]));
    localStorage.setItem('rxw_custom_theme_active', themeId);
  } else {
    localStorage.removeItem('rxw_custom_theme_active');
  }
}

// ── Application instantanée (avant tout rendu)
(function(){
  const saved=localStorage.getItem('rxw_theme');
  // D'abord chercher dans les thèmes built-in
  let t=THEMES[saved]||null;
  // Si c'est un thème custom, le récupérer depuis localStorage
  if(!t && saved){
    const customRaw=localStorage.getItem('rxw_custom_theme_'+saved);
    if(customRaw){try{t=JSON.parse(customRaw);}catch(e){}}
  }
  if(!t)return;
  const ac=t.accent||t.ac||'#8B1F1F';
  const ac2=t.accent2||t.ac2||ac;
  const acRgb=t.accentRgb||t.rgb||'139,31,31';
  const s=document.documentElement.style;
  s.setProperty('--bg',t.bg);s.setProperty('--bg2',t.bg2);s.setProperty('--bg3',t.bg3);s.setProperty('--bg4',t.bg4);
  s.setProperty('--tx',t.tx);s.setProperty('--tx2',t.tx2);s.setProperty('--tx3',t.tx3);
  s.setProperty('--brd',t.brd);s.setProperty('--brd2',t.brd2);
  s.setProperty('--ac',ac);s.setProperty('--ac2',ac2);s.setProperty('--acRgb',acRgb);s.setProperty('--acD',`rgba(${acRgb},0.10)`);
  if(t.bgRgb){s.setProperty('--bgRgb',t.bgRgb);s.setProperty('--bg2Rgb',t.bg2Rgb);}
  document.documentElement.style.background=t.bg;
  document.addEventListener('DOMContentLoaded',()=>{
    const a1=t.aurora1||`rgba(${acRgb},.14)`;
    const a2=t.aurora2||`rgba(${acRgb},.08)`;
    document.querySelectorAll('.aurora .ab').forEach((el,i)=>{
      if(i===0)el.style.background=`radial-gradient(ellipse,${a1},transparent 70%)`;
      if(i===1)el.style.background=`radial-gradient(ellipse,${a2},transparent 70%)`;
    });
    document.body.classList.toggle('theme-light',t.category==='light');
  });
})();

// ── Init async
const _page=window.location.pathname.split('/').pop()||'index.html';
const _skip=['index.html','maintenance.html','config-maintenance.html','admin.html'];
(async()=>{
  const uid=localStorage.getItem('currentUser');
  let isAdmin=false;
  try{
    // Charger thèmes custom Firestore
    let customThemes={};
    try{
      const customSnap=await getDoc(doc(db,'config','themes'));
      if(customSnap.exists()) customThemes=customSnap.data()||{};
      // Mettre à jour le cache localStorage des thèmes custom
      Object.entries(customThemes).forEach(([id,t])=>{
        localStorage.setItem('rxw_custom_theme_'+id, JSON.stringify(t));
      });
    }catch(e){}

    const cfgSnap=await getDoc(doc(db,'config','global'));
    const cfg=cfgSnap.exists()?cfgSnap.data():{};

    if(uid){
      // Utilisateur connecté — priorité à son thème perso
      const uSnap=await getDoc(doc(db,'users',uid));
      if(uSnap.exists()){
        const ud=uSnap.data();
        isAdmin=!!ud.isAdmin;
        if(ud.theme){
          applyTheme(ud.theme, customThemes);
        } else if(cfg.defaultTheme){
          // Pas de thème perso → thème global sans sauvegarder dans localStorage
          if(!THEMES[cfg.defaultTheme]&&cfg.defaultCustomThemeData){
            customThemes[cfg.defaultTheme]=cfg.defaultCustomThemeData;
            localStorage.setItem('rxw_custom_theme_'+cfg.defaultTheme, JSON.stringify(cfg.defaultCustomThemeData));
          }
          applyTheme(cfg.defaultTheme, customThemes);
          // Ne pas garder en localStorage pour que le thème global reste dynamique
          localStorage.removeItem('rxw_theme');
        }
      }
    } else {
      // Visiteur non connecté — toujours appliquer le thème global depuis Firestore
      if(cfg.defaultTheme){
        if(!THEMES[cfg.defaultTheme]&&cfg.defaultCustomThemeData){
          customThemes[cfg.defaultTheme]=cfg.defaultCustomThemeData;
          localStorage.setItem('rxw_custom_theme_'+cfg.defaultTheme, JSON.stringify(cfg.defaultCustomThemeData));
        }
        // Mettre en cache pour application immédiate au prochain chargement
        localStorage.setItem('rxw_global_theme', cfg.defaultTheme);
        applyTheme(cfg.defaultTheme, customThemes);
        localStorage.removeItem('rxw_theme');
      }
    }
    if(!isAdmin&&!_skip.includes(_page)&&cfg.maintenance===true){
      window.location.replace('maintenance.html');
    }
  }catch(e){console.warn('[theme.js]',e.message);}
})();

window.__rxwTheme={applyTheme,THEMES};
