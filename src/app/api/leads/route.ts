import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

async function sendTelegramNotification(lead: {
  name: string;
  tg_username: string;
  body_type: string;
  budget: string;
  country: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_MANAGER_CHAT_ID;

  if (!token || !chatId) {
    console.log("Telegram: skip (missing TELEGRAM_BOT_TOKEN or TELEGRAM_MANAGER_CHAT_ID)");
    return;
  }

  const bodyTypeMap: Record<string, string> = {
    crossover: "🚙 Кроссовер",
    sedan: "🚗 Седан",
    minivan: "🚐 Минивэн",
  };

  const countryMap: Record<string, string> = {
    RU: "🇷🇺 Россия",
    KZ: "🇰🇿 Казахстан",
    KG: "🇰🇬 Кыргызстан",
    UZ: "🇺🇿 Узбекистан",
  };

  const text = `
🆕 *Новая заявка AutoExport*

👤 Имя: ${lead.name}
📱 Telegram: ${lead.tg_username}
${bodyTypeMap[lead.body_type] ?? lead.body_type}
💰 Бюджет: ${lead.budget}
🌏 Доставка: ${countryMap[lead.country] ?? lead.country}
⏱ Только что
  `.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    const ok = res.ok;
    const respText = await res.text();
    console.log("Telegram: sendMessage", { ok, status: res.status, body: respText.slice(0, 200) });
  } catch (e) {
    console.log("Telegram: sendMessage failed", e instanceof Error ? e.message : String(e));
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase.from("leads").insert({
    name: body.name,
    tg_username: body.tg_username ?? "@unknown",
    body_type: body.body_type,
    budget_usd: body.budget_usd,
    destination_country: body.destination_country,
    ai_context: {
      body_type: body.body_type,
      budget: body.budget,
      country: body.country,
    },
  });

  if (error) return NextResponse.json({ error }, { status: 500 });

  await sendTelegramNotification({
    name: body.name,
    tg_username: body.tg_username ?? "@unknown",
    body_type: body.body_type,
    budget: body.budget,
    country: body.country,
  });

  return NextResponse.json({ ok: true });
}
