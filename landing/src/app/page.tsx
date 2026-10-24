import ProductShowcase from "./product-showcase";
import Motion from "./motion";
import LeadForm from "./lead-form";

export default function Home() {
  return <main>
    <Motion/>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Koredigital — на главную"><img src="/koredigital-logo.svg" alt="Koredigital" /></a>
      <nav aria-label="Основная навигация"><a href="#case">Продукты</a><a href="#china">Источники авто</a></nav>
      <a className="header-cta" href="https://t.me/koreakim88" data-metrica-goal="telegram_contact_open" target="_blank" rel="noopener noreferrer" aria-label="Обсудить проект в Telegram">
        <svg className="header-cta-telegram" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 3.5 18.2 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.6 13.6.7 12c-1.1-.3-1.1-1 .2-1.5L20 3c.9-.3 1.6.2 1.4.5Z"/></svg>
        <span>Обсудить проект</span><span className="header-cta-arrow" aria-hidden="true">↗</span>
      </a>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot"/> ДЛЯ АВТОДИЛЕРОВ И КОМПАНИЙ ПО АВТОИМПОРТУ</p>
        <h1><span>Цифровая платформа</span><span>для вашего</span><span><em>автобизнеса.</em></span></h1>
        <p className="hero-lead">Разрабатываем сайты, каталоги автомобилей и Telegram-приложения с расчётом стоимости доставки до РФ — под ваш бренд и процессы.</p>
        <div className="hero-actions"><a className="button" href="#contact">Обсудить разработку <span>↗</span></a><a className="text-link" href="#case">Посмотреть продукты <span>↓</span></a></div>
        <ol className="hero-journey" aria-label="Путь клиента"><li><span>01</span>Выбрать авто</li><li><span>02</span>Рассчитать стоимость</li><li><span>03</span>Обратиться в Telegram</li></ol><div className="hero-note"><span className="note-mark">↗</span><span>От поиска автомобиля<br/>до обращения клиента</span></div>
      </div>
      <div className="hero-visual" aria-label="Реальные экраны каталога и Telegram Mini App AutoExport">
        <div className="hero-halo"/><div className="orbital orbital-one"/><div className="orbital orbital-two"/><span className="scene-coordinate">KOREDIGITAL / РАЗРАБОТКА</span><div className="visual-label"><span/> ПРОДУКТЫ AUTOEXPORT <b>01 — 06</b></div><div className="browser-mockup"><div className="browser-chrome"><span/><span/><span/><b>autoexport-showcase.vercel.app</b><i>•••</i></div><img src="/mockups/autoexport-catalog-desktop.png" alt="Каталог AutoExport с реальными фотографиями автомобилей"/></div>
        <div className="phone-mockup"><img src="/mockups/autoexport-miniapp-mobile.png" alt="Мобильное приложение AutoExport с реальными фотографиями автомобилей"/></div>
        <p className="visual-caption">Реальные экраны демо · цены и наличие могут устареть</p>
      </div>
    </section>

    <div className="hero-index"><span>01 / РАЗРАБОТКА ДЛЯ АВТОБИЗНЕСА</span><span>Веб-платформы · Telegram · Автоматизация</span><a href="#case">ИССЛЕДОВАТЬ ПРОДУКТЫ ↓</a></div>
    <ProductShowcase/>
    <section className="atelier"><div className="atelier-top"><span>KOREDIGITAL / ИНДИВИДУАЛЬНАЯ РАЗРАБОТКА</span><span>02 / ВАШ БИЗНЕС</span></div><h2>Ваш бренд.<br/>Ваша логика расчёта.<br/><em>Ваш сервис.</em></h2><div className="atelier-bottom"><p>Настраиваем внешний вид, источники автомобилей, формулы стоимости и путь обращения клиента под вашу компанию.</p><a href="#contact" aria-label="Обсудить индивидуальную разработку">Обсудить платформу <span aria-hidden="true">↗</span></a></div><div className="atelier-tags"><span>Фирменный стиль</span><span>Источники данных</span><span>Логика расчёта</span><span>Интеграции</span></div></section>

    <section className="contact-section" id="contact"><div className="contact-orb"/><div className="contact-layout"><div className="contact-copy"><p className="eyebrow">ЕСТЬ ЗАДАЧА ДЛЯ АВТОБИЗНЕСА?</p><h2>Давайте обсудим<br/><em>ваш проект.</em></h2><p>Расскажите, что нужно вашему автосалону: сайт, расчёт стоимости, Telegram-инструмент или поиск автомобилей.</p></div><LeadForm/></div></section>

    <footer><a className="footer-brand" href="#top"><img src="/koredigital-mark.svg" alt=""/>Koredigital</a><span>Цифровые решения для автомобильного бизнеса</span><a href="#top">Наверх ↑</a><span>© 2026 Koredigital</span></footer>
  </main>;
}
