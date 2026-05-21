"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTelegram } from "@/hooks/useTelegram";

type BodyType = "crossover" | "sedan" | "minivan";
type BudgetKey = "lt10" | "10_15" | "15_20" | "gt20";
type CountryCode = "RU" | "KZ" | "KG" | "UZ";

const STEPS_TOTAL = 4;

const BODY_TYPES: { key: BodyType; label: string }[] = [
  { key: "crossover", label: "🚙 Кроссовер" },
  { key: "sedan", label: "🚗 Седан" },
  { key: "minivan", label: "🚐 Минивэн" },
];

const BUDGETS: { key: BudgetKey; label: string; usd: number }[] = [
  { key: "lt10", label: "до $10 000", usd: 10_000 },
  { key: "10_15", label: "$10 000 – $15 000", usd: 15_000 },
  { key: "15_20", label: "$15 000 – $20 000", usd: 20_000 },
  { key: "gt20", label: "от $20 000", usd: 25_000 },
];

const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: "RU", label: "🇷🇺 Россия" },
  { code: "KZ", label: "🇰🇿 Казахстан" },
  { code: "KG", label: "🇰🇬 Кыргызстан" },
  { code: "UZ", label: "🇺🇿 Узбекистан" },
];

function StepTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-4 text-left text-sm font-semibold transition ${
        selected
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-900 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

export function QuizClient() {
  const router = useRouter();
  const { user, isInTelegram, showBackButton, hideBackButton } = useTelegram();
  const [step, setStep] = useState(1);
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [budgetKey, setBudgetKey] = useState<BudgetKey | null>(null);
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const tgUsername = user?.username ? `@${user.username}` : "@unknown";

  useEffect(() => {
    if (!user) return;
    const fullName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`.trim();
    if (!fullName) return;
    setName((current) => (current.trim() ? current : fullName));
  }, [user]);

  const progress = useMemo(() => (step / STEPS_TOTAL) * 100, [step]);

  const budgetUsd = useMemo(() => {
    if (!budgetKey) return null;
    return BUDGETS.find((b) => b.key === budgetKey)?.usd ?? null;
  }, [budgetKey]);

  function goNext() {
    setStep((s) => Math.min(STEPS_TOTAL, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  useEffect(() => {
    if (!isInTelegram) return;
    showBackButton(() => {
      if (step > 1) goBack();
      else if (window.history.length > 1) router.back();
      else router.push("/");
    });
    return () => hideBackButton();
  }, [hideBackButton, isInTelegram, router, showBackButton, step]);

  async function submit() {
    if (!bodyType || !budgetKey || !budgetUsd || !country) return;
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tg_username: tgUsername,
          body_type: bodyType,
          budget_usd: budgetUsd,
          destination_country: country,
          budget: budgetKey,
          country,
        }),
      });

      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error("Lead submit failed:", await res.text());
        return;
      }

      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-950">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="text-3xl">✅</div>
          <h1 className="mt-4 text-xl font-semibold">Заявка отправлена!</h1>
          <p className="mt-2 text-sm text-gray-500">
            Менеджер свяжется с вами
            <br />
            в течение 30 минут
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            ← На главную
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-950">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (step > 1) goBack();
                else if (window.history.length > 1) router.back();
                else router.push("/");
              }}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700"
              aria-label="Назад"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
            <div className="text-xs font-medium text-gray-500">
              Шаг {step} из {STEPS_TOTAL}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gray-900 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {step === 1 ? (
            <>
              <StepTitle title="Какой тип авто ищете?" />
              <div className="grid gap-3">
                {BODY_TYPES.map((opt) => (
                  <OptionButton
                    key={opt.key}
                    label={opt.label}
                    selected={bodyType === opt.key}
                    onClick={() => {
                      setBodyType(opt.key);
                      goNext();
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepTitle title="Ваш бюджет под ключ?" />
              <div className="grid gap-3 sm:grid-cols-2">
                {BUDGETS.map((opt) => (
                  <OptionButton
                    key={opt.key}
                    label={opt.label}
                    selected={budgetKey === opt.key}
                    onClick={() => {
                      setBudgetKey(opt.key);
                      goNext();
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepTitle title="Куда доставляем?" />
              <div className="grid gap-3 sm:grid-cols-2">
                {COUNTRIES.map((opt) => (
                  <OptionButton
                    key={opt.code}
                    label={opt.label}
                    selected={country === opt.code}
                    onClick={() => {
                      setCountry(opt.code);
                      goNext();
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <StepTitle title="Как с вами связаться?" />
              <div className="space-y-3">
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-gray-500">
                    Имя
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </label>
                <div>
                  <div className="mb-1 text-xs font-medium text-gray-500">
                    Telegram
                  </div>
                  <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                    {tgUsername}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={
                    isSubmitting ||
                    !name.trim() ||
                    !bodyType ||
                    !budgetKey ||
                    !budgetUsd ||
                    !country
                  }
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Отправляем..." : "Отправить заявку"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
