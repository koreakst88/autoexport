'use client';
import { useEffect, useRef } from 'react';

export default function Preview({src,name}:{src:string;name:string}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const previousOverflow=useRef<string|null>(null);
  function restore(){if(previousOverflow.current!==null){document.body.style.overflow=previousOverflow.current;previousOverflow.current=null;}}
  useEffect(()=>()=>restore(),[]);
  return <><button type="button" className="preview-trigger" onClick={()=>{previousOverflow.current=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();}}>Рассмотреть интерфейс <span aria-hidden="true">＋</span></button>
    <dialog className="product-preview" ref={dialog} aria-label={`Интерфейс: ${name}`} onClose={restore} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
      <div className="preview-header"><strong>{name}</strong><button type="button" autoFocus onClick={()=>dialog.current?.close()} aria-label="Закрыть просмотр">Закрыть ×</button></div>
      <div className="preview-image"><img src={src} alt={`Реальный интерфейс ${name}`}/></div>
      <p>Скриншот продукта. Цены и наличие могут измениться.</p>
    </dialog></>;
}
