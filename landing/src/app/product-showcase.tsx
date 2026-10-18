'use client';
import { useRef, useState } from 'react';
import { products } from '../data/products';
const images = ['/mockups/autoexport-catalog-desktop.png', '/mockups/autoexport-miniapp-mobile.png', '/mockups/autoexport-radar-report.png', '/mockups/autoexport-calculator-home.png'];
const labels = ['WEB PLATFORM', 'TELEGRAM MINI APP', 'MARKET RADAR', 'COST CALCULATOR', 'CHINA / AUTOHOME'];
export default function ProductShowcase() {
  const [active, setActive] = useState(0);
  const mobileTrack = useRef<HTMLDivElement>(null);
  const product = products[active];
  return <section className="showcase" id="case">
    <div className="showcase-heading"><p className="eyebrow">СОЗДАНО В KOREDIGITAL / AUTOEXPORT</p><div><h2>Продукты, которые<br/><em>можно увидеть.</em></h2><p>Одна экосистема для автоимпорта.<br/>Исследуйте реальные интерфейсы наших продуктов.</p></div></div>
    <div className="showcase-pinned"><div className="showcase-tabs" role="tablist" aria-label="Продукты AutoExport">{products.map((p,i)=><button role="tab" aria-selected={active===i} aria-controls="product-stage" id={`product-tab-${i}`} key={p.name} onClick={()=>setActive(i)} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?4:(active+(e.key==='ArrowRight'?1:4))%5;setActive(next);document.getElementById(`product-tab-${next}`)?.focus();}}} tabIndex={active===i?0:-1}><span>0{i+1}</span>{p.name}<i>↗</i></button>)}</div>
    <a className="stage-card-link" href={product.href ?? '#contact'} target={product.href ? '_blank' : undefined} rel={product.href ? 'noopener noreferrer' : undefined} data-metrica-goal={product.href ? (active===0?'web_demo_open':'product_telegram_open') : undefined} aria-label={`${active===0?'Исследовать демо':product.href?'Открыть в Telegram':'Обсудить направление'}: ${product.name}`}>
    <div className={`showcase-stage stage-${product.preview}`} id="product-stage" role="tabpanel" aria-labelledby={`product-tab-${active}`}>
      <div className="stage-art" key={active}><div className="stage-grid"/><span className="stage-label">{labels[active]}</span>{active===0?<div className="stage-browser"><div className="stage-toolbar"><i/><i/><i/><span>autoexport-showcase.vercel.app</span><b>↗</b></div><img src={images[active]} alt="Реальный каталог AutoExport"/></div>:active<4?<div className="stage-phone"><img src={images[active]} alt={`Реальный экран ${product.name}`}/></div>:<div className="stage-china"><span>中国</span><strong>Новый рынок.<br/>Новые возможности.</strong><small>Поиск автомобилей из Китая / Autohome</small></div>}<span className="stage-footnote">{active<4?'РЕАЛЬНЫЙ ИНТЕРФЕЙС ПРОДУКТА':'НАПРАВЛЕНИЕ В РАЗРАБОТКЕ'}</span></div>
      <div className="stage-copy" key={`copy-${active}`}><span className="stage-counter">0{active+1}<span> / 05</span></span><span className={`product-status ${product.status==='В разработке'?'status-progress':''}`}>{product.status}</span><h3>{product.name}</h3><p>{product.description}</p><div className="stage-details">{active===0?'Каталог · Фильтры · Расчёты':active===1?'Каталог внутри Telegram':active===2?'Encar · Свежие объявления':active===3?'Расчёт · История автомобилей':'Китай · Autohome'}</div><span className="button">{active===0?'Исследовать демо':product.href?'Открыть в Telegram':'Обсудить направление'} <span>↗</span></span><small>Цены и наличие на скриншотах могут устареть.{active===0?' Пример расчёта — до Владивостока.':''}</small></div>
    </div></a><div className="scene-progress" aria-hidden="true"><span style={{width:`${(active+1)*20}%`}}/></div></div>
    <div className="mobile-projects">
      <div className="mobile-projects-hint" aria-hidden="true"><span>ЛИСТАЙТЕ ПРОЕКТЫ</span><span>Листайте влево <b>←</b></span></div>
      <div className="mobile-projects-track" ref={mobileTrack} onScroll={e=>{const track=e.currentTarget;const card=track.querySelector<HTMLElement>('.mobile-project-card');if(card){const gap=parseFloat(getComputedStyle(track).columnGap)||12;setActive(Math.min(products.length-1,Math.round(track.scrollLeft/(card.offsetWidth+gap))));}}}>
        {products.map((item,i)=>{
          const href=item.href??'#contact';
          return <a className={`mobile-project-card mobile-project-kind-${item.preview}`} href={href} target={item.href?'_blank':undefined} rel={item.href?'noopener noreferrer':undefined} data-metrica-goal={item.href?(i===0?'web_demo_open':'product_telegram_open'):undefined} aria-label={`${i===0?'Исследовать демо':item.href?'Открыть в Telegram':'Обсудить направление'}: ${item.name}`} key={item.name}>
            <div className="mobile-project-art">
              <span className="mobile-project-number">0{i+1} / 05</span>
              {i<4?<div className={i===0?'mobile-project-browser':'mobile-project-phone'}>
                {i===0&&<div className="mobile-project-browser-bar"><i/><i/><i/><span>AutoExport</span></div>}
                <img src={images[i]} alt={`Реальный экран продукта ${item.name}`} loading="lazy" draggable={false}/>
              </div>:<div className="mobile-project-china-art"><span>中国</span><small>CHINA / AUTOHOME</small><p>Следующее направление</p></div>}
            </div>
            <div className="mobile-project-copy"><span className={`product-status ${item.status==='В разработке'?'status-progress':''}`}>{item.status}</span><h3>{item.name}</h3><p>{item.description}</p><span className="mobile-project-link">{i===0?'Исследовать демо':item.href?'Открыть в Telegram':'Обсудить направление'} <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></span></div>
          </a>;
        })}
      </div>
      <div className="mobile-projects-pagination" aria-label={`Проект ${active+1} из ${products.length}`}><div><span style={{width:`${(active+1)*20}%`}}/></div><span>0{active+1} <i>/ 05</i></span></div>
    </div>
    <div className="china-anchor" id="china"><span>СЛЕДУЮЩИЙ ГОРИЗОНТ</span><button onClick={()=>{setActive(4);mobileTrack.current?.scrollTo({left:mobileTrack.current.scrollWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});document.getElementById('case')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}>Китай / Autohome <span>В разработке ↗</span></button></div>
  </section>;
}
