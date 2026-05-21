import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBAPP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://autoexport-nu.vercel.app";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;

  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id as number;
  const text = message.text as string | undefined;

  if (text === "/start" || (typeof text === "string" && text.startsWith("/start"))) {
    await sendWelcome(chatId);
  }

  return NextResponse.json({ ok: true });
}

async function sendWelcome(chatId: number) {
  const text = `🚗 *Добро пожаловать в AutoExport!*

Авто из Кореи под ключ — с доставкой и растаможкой в СНГ.

✅ Реальные объявления с Encar
💰 Цена под ключ сразу — без скрытых расходов
🌏 Россия, Казахстан, Кыргызстан, Узбекистан

Нажмите кнопку ниже чтобы открыть каталог 👇`;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚗 Открыть каталог",
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
      },
    }),
  });
}

