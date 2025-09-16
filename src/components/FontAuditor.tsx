'use client';
import { useEffect, useState } from 'react';

export default function FontAuditor(){
  const [info, setInfo] = useState<any>();
  
  useEffect(()=>{
    const el = document.createElement('span');
    el.textContent = 'Reckless Auditor';
    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;font-family:"Reckless",serif;font-weight:400;font-size:32px';
    document.body.appendChild(el);
    const cs = getComputedStyle(el);
    setInfo({ family: cs.fontFamily, weight: cs.fontWeight, ua: navigator.userAgent });
    el.remove();
  },[]);
  
  if(!info) return null;
  
  return (
    <div style={{position:'fixed',bottom:12,right:12,background:'rgba(0,0,0,.8)',color:'#fff',padding:'8px 10px',borderRadius:8,fontSize:12,zIndex:9999}}>
      <b>FontAuditor</b>
      <div>family: {info.family}</div>
      <div>weight: {info.weight}</div>
    </div>
  );
}