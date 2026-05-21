import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBAPP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://autoexport-nu.vercel.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;

  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id as number;
  const text = message.text as string | undefined;
  const from = message.from;

  if (from && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    await upsertBotUser({
      telegram_id: from.id,
      chat_id: chatId,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      language_code: from.language_code ?? null,
      is_bot: from.is_bot ?? null,
      last_seen_at: new Date().toISOString(),
    });
  }

  if (text === "/start" || (typeof text === "string" && text.startsWith("/start"))) {
    await sendWelcome(chatId);
  }

  return NextResponse.json({ ok: true });
}

async function upsertBotUser(user: {
  telegram_id: number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
  is_bot: boolean | null;
  last_seen_at: string;
}) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from("bot_users")
    .upsert(user, { onConflict: "telegram_id" });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("bot_users upsert failed:", error);
  }
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
