'use client';

import { trackMetricaGoal } from './metrica';

const telegramRecipient = 'koreakim88';

export default function LeadForm() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const product = String(formData.get('product') ?? '').trim();
    const brief = String(formData.get('brief') ?? '').trim();
    const company = String(formData.get('company') ?? '').trim();
    const message = [
      'Здравствуйте! Хочу обсудить цифровой продукт для автобизнеса.',
      `Направление: ${product}`,
      company ? `Компания: ${company}` : '',
      brief ? `Задача: ${brief}` : '',
    ].filter(Boolean).join('\n');

    trackMetricaGoal('lead_draft_requested');
    window.open(`https://t.me/${telegramRecipient}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <fieldset className="direction-picker"><legend>Что хотите разработать?</legend><div>{['Каталог автомобилей','Калькулятор','Telegram-приложение','Мониторинг объявлений','Поиск авто из Китая','Пока не знаю'].map(option=><label key={option}><input type="radio" name="product" value={option} defaultChecked={option==='Пока не знаю'}/><span>{option}</span></label>)}</div></fieldset>
      <label>
        Компания <span className="optional-label">необязательно</span>
        <input className="ym-disable-keys" name="company" type="text" autoComplete="organization" placeholder="Название автосалона или компании" />
      </label>
      <label>
        Коротко о задаче <span className="optional-label">необязательно</span>
        <textarea className="ym-disable-keys" name="brief" rows={3} placeholder="Что хотите упростить или запустить?" />
      </label>
      <button className="button lead-submit" type="submit">Обсудить в Telegram <span>↗</span></button>
      <p className="contact-caption">Подготовим сообщение с выбранным направлением. Отправить его можно будет в Telegram.</p>
    </form>
  );
}
