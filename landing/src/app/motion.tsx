'use client';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function Motion() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline.from('.hero h1 > span', { y: 45, opacity: 0, duration: 1, stagger: .13 })
        .from('.hero .eyebrow, .hero-lead, .hero-actions, .hero-note', { y: 16, opacity: 0, duration: .65, stagger: .09 }, '-=.7')
        .from('.browser-mockup', { y: 55, opacity: 0, duration: 1.2 }, .25)
        .from('.phone-mockup', { y: 75, opacity: 0, duration: 1 }, .6);
      gsap.from('.hero-journey li', {scrollTrigger:{trigger:'.hero-journey',start:'top 95%'},opacity:0,y:12,duration:.5,stagger:.3});
      gsap.from('.showcase-heading', { scrollTrigger: { trigger: '.showcase-heading', start: 'top 90%' }, y: 35, opacity: 0, duration: .9 });
      gsap.from('.atelier h2, .atelier-bottom, .atelier-tags', {scrollTrigger:{trigger:'.atelier', start:'top 80%'}, y:45, opacity:0, duration:1, stagger:.15});
      gsap.to('.orbital-one', {rotation:12, scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:1}});
      gsap.to('.hero-halo', { scale: 1.12, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    });
    media.add('(min-width: 1000px) and (hover: hover) and (prefers-reduced-motion: no-preference)', () => {
      const scene=document.querySelector<HTMLElement>('.hero-visual');
      if(!scene)return;
      const rotateX=gsap.quickTo(scene,'rotationX',{duration:.7,ease:'power2.out'});
      const rotateY=gsap.quickTo(scene,'rotationY',{duration:.7,ease:'power2.out'});
      const move=(event:PointerEvent)=>{const r=scene.getBoundingClientRect();rotateX(-(event.clientY-r.top-r.height/2)/r.height*4);rotateY((event.clientX-r.left-r.width/2)/r.width*5);};
      const reset=()=>{rotateX(0);rotateY(0);};
      scene.addEventListener('pointermove',move);scene.addEventListener('pointerleave',reset);
      return ()=>{scene.removeEventListener('pointermove',move);scene.removeEventListener('pointerleave',reset);};
    });
    return () => media.revert();
  }, []);
  return null;
}
