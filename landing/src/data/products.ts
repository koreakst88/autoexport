export const products = [
 { name: "Веб-платформа", status: "Демо", description: "Каталог под вашим брендом: поиск, фильтры, карточки автомобилей и пример расчёта стоимости до Владивостока.", href: "https://autoexport-showcase.vercel.app", preview: "web" },
 { name: "Telegram Mini App", status: "Прототип", description: "Каталог автомобилей прямо в Telegram — с фотографиями, характеристиками и стоимостью.", href: "https://t.me/autoexport_test_bot", preview: "tma" },
 { name: "AutoExport Radar", status: "Проверка функций", description: "Мониторинг новых объявлений Encar по заданным параметрам. Уведомления проходят проверку.", href: "https://t.me/Autoexportradar_bot", preview: "radar" },
 { name: "Калькулятор TMA", status: "В разработке", description: "Стоимость автомобиля и расходы на доставку до РФ — в одном приложении, с сохранением истории расчётов.", href: "https://t.me/autoexportcalculate_bot", preview: "calculator" },
 { name: "Китай / Autohome", status: "В разработке", description: "Каталог Autohome адаптирован на русский язык — автомобили и фильтры в привычном формате.", href: null, preview: "china" },
 { name: "Европа / mobile.de", status: "Направление разработки", description: "Добавление объявлений с mobile.de в каталог AutoExport: фотографии, характеристики и цена в евро.", href: null, preview: "europe" },
] as const;
