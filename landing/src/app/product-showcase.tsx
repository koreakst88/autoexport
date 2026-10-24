'use client';

import { useRef, useState } from 'react';
import Preview from './preview';
import { products } from '../data/products';

const scenes = [
  { image: '/mockups/autoexport-catalog-desktop.png', title: 'Весь каталог.\nВаш бренд.', caption: 'КАТАЛОГ / AUTOEXPORT', accent: 'web', domain: 'autoexport · каталог автомобилей', tags: ['Поиск и фильтры', 'Расчёт до РФ'], note: 'Реальный экран демо', detail: 'Каталог · Фильтры · Расчёты' },
  { image: '/mockups/autoexport-miniapp-mobile.png', title: 'Ваш каталог.\nВ Telegram.', caption: 'TELEGRAM MINI APP', accent: 'tma', domain: 'AutoExport', tags: ['Без установки', 'Внутри Telegram'], note: 'Реальный экран приложения', detail: 'Фотографии · Характеристики · Стоимость' },
  { image: '/mockups/autoexport-radar-report.png', title: 'Свежие авто.\nВ поле зрения.', caption: 'AUTOEXPORT RADAR', accent: 'radar', domain: 'AutoExport Radar', tags: ['Новые объявления', 'Фильтры Encar'], note: 'Пример отчёта в Telegram', detail: 'Encar · Мониторинг · Уведомления' },
  { image: '/mockups/autoexport-calculator-home.png', title: 'Все расходы.\nОдин расчёт.', caption: 'AUTOEXPORT CALCULATE', accent: 'calculator', domain: 'AutoExport Calculate', tags: ['Стоимость до РФ', 'История расчётов'], note: 'Интерфейс в разработке', detail: 'Расчёт стоимости · История автомобилей' },
  { image: '/mockups/autohome-reference.jpg', title: 'Китай.\nНа вашем языке.', caption: 'КИТАЙ / AUTOHOME', accent: 'china', domain: 'autohome.com.cn · источник автомобилей', tags: ['Каталог на русском', 'Автомобили из Китая'], note: 'Макет AutoExport · фотографии Autohome', detail: 'Русский язык · Марки · Характеристики' },
  { image: '/mockups/mobile-de-reference.jpg', title: 'Европа.\nВ вашем каталоге.', caption: 'ЕВРОПА / MOBILE.DE', accent: 'europe', domain: 'mobile.de · источник объявлений', tags: ['Объявления mobile.de', 'Единый каталог'], note: 'Макет AutoExport · объявления mobile.de', detail: 'Европейские авто · Характеристики · Цена в евро' },
];

function Arrow() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>;
}

function SourceCatalog({ europe }: { europe: boolean }) {
  const cars = europe ? [
    { name: 'Volkswagen ID.7', detail: 'Электро · Автомат', price: '50 990 €' },
    { name: 'Opel Mokka-e', detail: 'Электро · Автомат', price: '33 950 €' },
    { name: 'Opel Mokka-e', detail: 'Электро · Автомат', price: '33 950 €' },
  ] : [
    { name: 'Subaru BRZ', detail: 'Спорткупе', price: 'Смотреть авто' },
    { name: 'Geely Boyue', detail: 'Кроссовер', price: 'Смотреть авто' },
    { name: 'Tank 500', detail: 'Внедорожник', price: 'Смотреть авто' },
    { name: 'Dongfeng L8', detail: 'Кроссовер', price: 'Смотреть авто' },
  ];
  return <div className={`source-catalog ${europe ? 'source-catalog-eu' : 'source-catalog-cn'}`}>
    <div className="source-catalog-header"><b>AUTOEXPORT<span>КАТАЛОГ АВТОМОБИЛЕЙ</span></b><span>{europe ? 'Европа' : 'Китай'} <i>⌄</i></span></div>
    <div className="source-catalog-filters"><span>Все марки ⌄</span><span>Модель ⌄</span><span>Тип авто ⌄</span><b>Найти автомобиль</b></div>
    <div className="source-catalog-title"><b>{europe ? 'Автомобили из Европы' : 'Автомобили из Китая'}</b><span>{europe ? 'Источник: mobile.de' : 'Источник: Autohome'}</span></div>
    <div className="source-catalog-cars">{cars.map((car, i) => <div className="source-car" key={`${car.name}-${i}`}><div className={`source-car-photo source-car-photo-${i}`} role="img" aria-label={`Фотография ${car.name} с ${europe ? 'mobile.de' : 'Autohome'}`} /><div><b>{car.name}</b><span>{car.detail}</span><strong>{car.price} <i>↗</i></strong></div></div>)}</div>
    <div className="source-catalog-bottom">{europe ? 'Объявления mobile.de в едином каталоге' : 'Русский интерфейс · марки · модели · характеристики'}<span>ПРЕВЬЮ ИНТЕРФЕЙСА</span></div>
  </div>;
}

function ProductArt({ index }: { index: number }) {
  const scene = scenes[index];
  const phone = index > 0 && index < 4;
  return <div className={`product-scene scene-${scene.accent}`}>
    <div className="scene-mesh" aria-hidden="true" />
    <div className="scene-disc" aria-hidden="true" />
    {index === 1 && <svg className="scene-telegram" viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-3.5 18-6-4.5-3 2.5.5-5L19 5 5.5 13 .5 11.5Z" /></svg>}
    {index === 2 && <div className="scene-radar-dial" aria-hidden="true"><i /><i /><i /><span /></div>}
    {index === 3 && <span className="scene-symbol" aria-hidden="true">₩<span>→</span>₽</span>}
    <span className="scene-eyebrow">{scene.caption}</span>
    <div className="scene-editorial"><strong>{scene.title.split('\n').map(line => <span key={line}>{line}</span>)}</strong><div className="scene-tags">{scene.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div>
    <div className={phone ? 'scene-device' : 'scene-browser'}>
      {!phone && <div className="scene-browser-chrome"><div><i /><i /><i /></div><span>{scene.domain}</span><Arrow /></div>}
      <div className="scene-screen">{index >= 4 ? <SourceCatalog europe={index === 5} /> : <img src={scene.image} alt={`Реальный интерфейс ${products[index].name}`} loading="lazy" draggable={false} />}</div>
    </div>
    <span className="scene-proof"><span />{scene.note}</span>
  </div>;
}

function action(index: number) {
  return index === 0 ? 'Открыть веб-демо' : products[index].href ? 'Открыть в Telegram' : 'Обсудить подключение';
}

export default function ProductShowcase() {
  const [active, setActive] = useState(0);
  const mobileTrack = useRef<HTMLDivElement>(null);
  const product = products[active];
  const total = String(products.length).padStart(2, '0');
  const progress = `${((active + 1) / products.length) * 100}%`;
  const goal = (index: number) => products[index].href ? index === 0 ? 'web_demo_open' : 'product_telegram_open' : undefined;
  const openSource = (index: number) => {
    setActive(index);
    const track = mobileTrack.current;
    const card = track?.querySelector<HTMLElement>('.mobile-project-shell');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (track && card) track.scrollTo({ left: (card.offsetWidth + 14) * index, behavior: reduced ? 'instant' : 'smooth' });
    document.getElementById('case')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
  };

  return <section className="showcase" id="case">
    <div className="showcase-heading"><p className="eyebrow">СОЗДАНО В KOREDIGITAL / AUTOEXPORT</p><div><h2>От поиска авто<br /><em>до вашего клиента.</em></h2><p>Каталог, Telegram и расчёты — в одной экосистеме.<br />Посмотрите продукты и источники автомобилей.</p></div></div>
    <div className="showcase-pinned">
      <div className="showcase-tabs" role="tablist" aria-label="Продукты и источники AutoExport">{products.map((item, index) => <button role="tab" aria-selected={active === index} aria-controls="product-stage" id={`product-tab-${index}`} key={item.name} onClick={() => setActive(index)} onKeyDown={event => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? products.length - 1 : (active + (event.key === 'ArrowRight' ? 1 : products.length - 1)) % products.length;
        setActive(next);
        document.getElementById(`product-tab-${next}`)?.focus();
      }} tabIndex={active === index ? 0 : -1}><span>0{index + 1}</span>{item.name}<i>↗</i></button>)}</div>
      <a className="stage-card-link" href={product.href ?? '#contact'} target={product.href ? '_blank' : undefined} rel={product.href ? 'noopener noreferrer' : undefined} data-metrica-goal={goal(active)} aria-label={`${action(active)}: ${product.name}`}>
        <div className={`showcase-stage showcase-redesign`} id="product-stage" role="tabpanel" aria-labelledby={`product-tab-${active}`}>
          <ProductArt index={active} key={active} />
          <div className="stage-copy" key={`copy-${active}`}><div className="stage-copy-top"><span className="stage-counter">0{active + 1}<span> / {total}</span></span><span className={`product-status ${product.href ? '' : 'status-progress'}`}>{product.status}</span></div><div className="stage-copy-main"><span className="stage-category">{active < 4 ? 'ПРОДУКТ AUTOEXPORT' : 'ИСТОЧНИК КАТАЛОГА'}</span><h3>{product.name}</h3><p>{product.description}</p><div className="stage-details">{scenes[active].detail}</div></div><div className="stage-copy-bottom"><span className="button">{action(active)} <Arrow /></span><small>{active === 0 ? 'Цены в демо приведены для примера и могут устареть.' : active === 4 ? 'Русскоязычный макет каталога с фотографиями Autohome.' : active === 5 ? 'Макет каталога с объявлениями mobile.de. Цены приведены из референса.' : 'На превью — реальный экран продукта.'}</small></div></div>
        </div>
      </a>
      <div className="showcase-under"><span>0{active + 1} / {total} <i>—</i> {active < 4 ? 'Продукты AutoExport' : 'Источники автомобилей'}</span><Preview src={scenes[active].image} name={product.name} /></div>
      <div className="scene-progress" aria-hidden="true"><span style={{ width: progress }} /></div>
    </div>
    <div className="mobile-projects">
      <div className="mobile-projects-hint" aria-hidden="true"><span>ПРОДУКТЫ И ИСТОЧНИКИ</span><span>Листайте <b>←</b></span></div>
      <div className="mobile-projects-track" ref={mobileTrack} onScroll={event => { const track = event.currentTarget; const card = track.querySelector<HTMLElement>('.mobile-project-shell'); if (card) setActive(Math.min(products.length - 1, Math.round(track.scrollLeft / (card.offsetWidth + 14)))); }}>
        {products.map((item, index) => <article className="mobile-project-shell" key={item.name}>
          <a className="mobile-project-card" href={item.href ?? '#contact'} target={item.href ? '_blank' : undefined} rel={item.href ? 'noopener noreferrer' : undefined} data-metrica-goal={goal(index)} aria-label={`${action(index)}: ${item.name}`}>
            <ProductArt index={index} />
            <div className="mobile-project-copy"><div className="mobile-card-meta"><span className={`product-status ${item.href ? '' : 'status-progress'}`}>{item.status}</span><span>0{index + 1} / {total}</span></div><h3>{item.name}</h3><p>{item.description}</p><span className="mobile-project-link">{action(index)} <Arrow /></span></div>
          </a>
        </article>)}
      </div>
      <div className="mobile-projects-pagination" aria-label={`Проект ${active + 1} из ${products.length}`}><div><span style={{ width: progress }} /></div><span>0{active + 1} <i>/ {total}</i></span></div>
    </div>
    <div className="china-anchor" id="china"><span>РАСШИРЯЙТЕ ГЕОГРАФИЮ КАТАЛОГА</span><div><button onClick={() => openSource(4)}>Китай / Autohome <Arrow /></button><button onClick={() => openSource(5)}>Европа / mobile.de <Arrow /></button></div></div>
  </section>;
}
