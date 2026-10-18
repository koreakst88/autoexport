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
      `Задача: ${brief}`,
    ].filter(Boolean).join('\n');

    trackMetricaGoal('lead_draft_requested');
    window.open(`https://t.me/${telegramRecipient}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <label>
        Что нужно разработать?
        <select name="product" defaultValue="" required>
          <option value="" disabled>Выберите направление</option>
          <option>Сайт или каталог автомобилей</option>
          <option>Расчёт стоимости автомобиля</option>
          <option>Telegram Mini App</option>
          <option>Мониторинг объявлений</option>
          <option>Поиск автомобилей из Китая</option>
          <option>Другое</option>
        </select>
      </label>
      <label>
        Компания <span className="optional-label">необязательно</span>
        <input className="ym-disable-keys" name="company" type="text" autoComplete="organization" placeholder="Название автосалона или компании" />
      </label>
      <label>
        Коротко о задаче
        <textarea className="ym-disable-keys" name="brief" rows={4} required placeholder="Что хотите упростить или запустить?" />
      </label>
      <button className="button lead-submit" type="submit">Продолжить в Telegram <span>↗</span></button>
      <p className="contact-caption">Откроется черновик сообщения в Telegram. Проверьте его и нажмите «Отправить»; лендинг не хранит текст заявки.</p>
    </form>
  );
}
