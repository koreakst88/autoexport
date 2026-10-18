'use client';

import { useEffect } from 'react';
import Script from 'next/script';

const counterId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
const validCounterId = counterId && /^\d+$/.test(counterId) ? Number(counterId) : null;
type MetricaFunction = ((...args: [number, string, ...unknown[]]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: MetricaFunction;
  }
}

export type MetricaGoal = 'lead_draft_requested' | 'lead_form_start' | 'telegram_contact_open' | 'web_demo_open' | 'product_telegram_open';

export function trackMetricaGoal(goal: MetricaGoal) {
  if (validCounterId && typeof window !== 'undefined') {
    if (!window.ym) {
      const queue: MetricaFunction = (...args) => {
        (queue.a ??= []).push(args);
      };
      window.ym = queue;
    }
    window.ym?.(validCounterId, 'reachGoal', goal);
  }
}

export default function Metrica() {
  useEffect(() => {
    if (!validCounterId) return;
    let leadFormStarted = false;
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('[data-metrica-goal]');
      const goal = link?.dataset.metricaGoal;
      if (goal === 'telegram_contact_open' || goal === 'web_demo_open' || goal === 'product_telegram_open') {
        trackMetricaGoal(goal);
      }
    };
    const handleFormStart = (event: FocusEvent) => {
      const target = event.target;
      if (!leadFormStarted && target instanceof Element && target.closest('.lead-form')) {
        leadFormStarted = true;
        trackMetricaGoal('lead_form_start');
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('focusin', handleFormStart);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('focusin', handleFormStart);
    };
  }, []);

  if (!validCounterId) return null;

  // Pass this as a function so Next.js does not escape template interpolation
  // inside the inline script during compilation.
  const bootstrap = `!function(){var id=${validCounterId};(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<e.scripts.length;j++){if(e.scripts[j].src===r){return}}k=e.createElement(t),a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id="+id,"ym");ym(id,"init",{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true})}();`;

  return <>
    <Script id="yandex-metrica" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: bootstrap }} />
    <noscript><div><img src={`https://mc.yandex.ru/watch/${validCounterId}`} style={{ position: 'absolute', left: '-9999px' }} alt="" /></div></noscript>
  </>;
}
