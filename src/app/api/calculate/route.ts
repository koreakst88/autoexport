import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const params = new URLSearchParams({
    price: String(body.price_krw),
    year: String(body.year),
    month: String(body.month ?? "1"),
    v: String(body.engine_cc ?? 0),
    powerDVS: String(body.power_hp ?? 0),
    p: String(body.power_hp ?? 0),
    fiz: "1",
    currency: "KRW",
    sanction: "1",
    strategy: "auto_koreya",
    html: "1",
    m: body.fuel_type === "diesel" ? "d" : "b",
  });

  try {
    const res = await fetch(
      "https://korex-auto.com/netcat/modules/default/classes/calculator/actions/calculate.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: "https://korex-auto.com",
          Referer: "https://korex-auto.com/korea/",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        body: params.toString(),
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Calculator unavailable" },
        { status: 503 },
      );
    }

    const html = await res.text();

    const totalMatch = html.match(/js-calc-full-price-top[^>]*>\s*([\d\s]+)/);
    const utilMatch = html.match(/js-calc-util[^>]*>([\d\s]+)/);
    const dutyMatch = html.match(/js-calc-full-duty[^>]*>([\d\s]+)/);
    const feesMatch = html.match(/js-calc-full-fees[^>]*>([\d\s]+)/);
    const rateMatch = html.match(/1000₩ - ([\d,]+)/);
    const priceRuMatch = html.match(/js-calc-price-ru[^>]*>([\d\s]+)/);
    const freightMatch = html.match(
      /ВЛАДИВОСТОК\)[\s\S]*?<span>([\d\s]+₽)<\/span>/,
    );
    const brokerMatch = html.match(
      /Брокерские расходы[\s\S]*?<span>([\d\s]+₽)<\/span>/,
    );

    const parseNum = (s: string | undefined) =>
      parseInt((s ?? "0").replace(/[^\d]/g, ""), 10) || 0;

    const rate1000 = rateMatch?.[1]?.replace(",", ".") ?? "0";

    return NextResponse.json({
      rate_krw_rub: parseFloat(rate1000) / 1000,
      car_price_rub: parseNum(priceRuMatch?.[1]),
      duty_rub: parseNum(dutyMatch?.[1]),
      fees_rub: parseNum(feesMatch?.[1]),
      util_rub: parseNum(utilMatch?.[1]),
      total_rub: parseNum(totalMatch?.[1]),
      // Fallbacks (we keep them stable for now)
      freight_rub: freightMatch ? parseNum(freightMatch?.[1]) : 85141,
      broker_rub: brokerMatch ? parseNum(brokerMatch?.[1]) : 90000,
    });
  } catch {
    return NextResponse.json({ error: "Failed to calculate" }, { status: 500 });
  }
}

