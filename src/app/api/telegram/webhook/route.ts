import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBAPP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://autoexport-nu.vercel.app";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function upsertUser(from: any) {
  if (!from?.id) return;

  const tgUserId = String(from.id);

  const { data: existing } = await supabase
    .from("users")
    .select("id, launches_count")
    .eq("tg_user_id", tgUserId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("users")
      .update({
        last_seen_at: new Date().toISOString(),
        launches_count: (existing.launches_count ?? 0) + 1,
        tg_username: from.username ?? null,
        first_name: from.first_name ?? null,
        last_name: from.last_name ?? null,
      })
      .eq("tg_user_id", tgUserId);
  } else {
    await supabase.from("users").insert({
      tg_user_id: tgUserId,
      tg_username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      language_code: from.language_code ?? null,
      launches_count: 1,
      last_seen_at: new Date().toISOString(),
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;

  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id as number;
  const text = message.text as string | undefined;
  const from = message.from;

  // Сохраняем пользователя при любом сообщении
  await upsertUser(from);

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
