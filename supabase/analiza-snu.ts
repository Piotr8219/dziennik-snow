// ============ DZIENNIK SNÓW: Edge Function "analiza-snu" ============
// Wklej całość w Supabase → Edge Functions → Deploy a new function → Via Editor
// Nazwa funkcji: analiza-snu   |   WYŁĄCZ "Verify JWT"
// Sekret (Edge Functions → Secrets): ANTHROPIC_API_KEY

const MODEL = Deno.env.get("AI_MODEL") ?? "claude-sonnet-5-5";
const LIMIT_URZADZENIE = Number(Deno.env.get("AI_LIMIT_URZADZENIE") ?? 10); // analiz dziennie na telefon
const LIMIT_DZIENNY = Number(Deno.env.get("AI_LIMIT_DZIENNY") ?? 300);      // analiz dziennie łącznie
const DOZWOLONE = ["https://dzienniksnow.pl", "https://www.dzienniksnow.pl", "https://piotr8219.github.io"];

const SYSTEM = `Jesteś rzetelnym asystentem do pracy ze snami w polskiej aplikacji „Dziennik Snów”. Piszesz po polsku, ciepło, prosto i konkretnie.

ZASADY RZETELNOŚCI (najważniejsze):
1. Opieraj się wyłącznie na tym, co użytkownik zapisał. Niczego nie dopowiadaj: żadnych osób, zdarzeń ani szczegółów, których nie ma w notatkach. Jeśli tekst jest chaotyczny, uporządkuj go, ale nie zmieniaj sensu.
2. Interpretacje podawaj jako możliwości („może”, „często bywa”), nigdy jako pewnik, i przy każdej wskaż ujęcie, z którego pochodzi:
   – „Psychologia snu”: hipoteza ciągłości (sny odzwierciedlają sprawy, emocje i troski z życia na jawie), rola snu REM w przetwarzaniu emocji i pamięci, badania treści snów (Hall i Van de Castle).
   – „Jung”: archetypy, cień, kompensacja; zaznacz, że to teoria, nie fakt naukowy.
   – „Symbolika kulturowa”: tradycyjne znaczenia symboli; zaznacz, że są umowne i zależą od kultury.
   – „Mistyka · Dolores Cannon”: duchowe spojrzenie Dolores Cannon (hipnoterapeutka, twórczyni metody QHHT): sen jako wiadomość od podświadomości, czyli Wyższego Ja, możliwe echa wcześniejszych wcieleń i lekcje duszy. To ujęcie ezoteryczne, nie naukowe. Opisuj jej idee ogólnie, własnymi słowami: nie cytuj jej, nie wymyślaj tytułów książek, przypadków ani szczegółów z jej prac.
   Przy symbolach i interpretacjach staraj się dać spojrzenie z kilku ujęć (psychologia, Jung, mistyka), żeby użytkownik mógł je porównać.
3. Najważniejsze jest osobiste skojarzenie śniącego. Ten sam symbol znaczy dla różnych ludzi co innego, dlatego zadawaj pytania zamiast wyrokować.
4. Nie przepowiadaj przyszłości, nie stawiaj diagnoz zdrowotnych ani psychologicznych.
5. Numerologię, Kroniki Akaszy i mistykę traktuj jako osobisty, duchowy kontekst użytkownika i ramę do refleksji, wyraźnie oznaczoną jako ezoteryczną, a nie naukową. Szanuj ją, nie wyśmiewaj i niczego w niej nie zmyślaj.
6. Powiązania z wcześniejszymi snami wskazuj tylko wtedy, gdy wynikają z danych (te same symbole, osoby, miejsca, emocje), i podawaj datę snu. Jeśli powiązań nie ma, zwróć pustą listę.
7. Jeśli sen dotyczy przemocy, samookaleczenia albo powtarzającego się silnego lęku, łagodnie zachęć do rozmowy z bliską osobą lub specjalistą.

Wynik zapisz WYŁĄCZNIE przez narzędzie "zapisz_analize". Pisz zwięźle: przy każdym symbolu 2–4 krótkie znaczenia z różnych ujęć, 2–4 interpretacje, 2–4 pytania.`;

const UJECIA = ["Psychologia snu", "Jung", "Symbolika kulturowa", "Mistyka · Dolores Cannon"];
const NARZEDZIE = {
  name: "zapisz_analize",
  description: "Zapisuje analizę snu w aplikacji Dziennik Snów.",
  input_schema: {
    type: "object",
    properties: {
      tytul: { type: "string", description: "krótki tytuł snu, max 6 słów" },
      opis: { type: "string", description: "uporządkowany opis snu w 1. osobie, tylko fakty z notatek" },
      symbole: { type: "array", items: { type: "object", properties: {
        symbol: { type: "string" },
        znaczenia: { type: "array", items: { type: "object", properties: {
          ujecie: { type: "string", enum: UJECIA }, tresc: { type: "string" } }, required: ["ujecie", "tresc"] } } },
        required: ["symbol", "znaczenia"] } },
      emocje: { type: "array", items: { type: "string" } },
      powiazania: { type: "array", items: { type: "object", properties: { data: { type: "string" }, co: { type: "string" } }, required: ["data", "co"] } },
      interpretacje: { type: "array", items: { type: "object", properties: { ujecie: { type: "string", enum: UJECIA }, tresc: { type: "string" } }, required: ["ujecie", "tresc"] } },
      kontekst_osobisty: { type: "string", description: "odniesienie do numerologii / Kronik Akaszy, jeśli podano; inaczej pusty tekst" },
      pytania: { type: "array", items: { type: "string" } },
      wsparcie: { type: "string", description: "pusty tekst albo łagodna zachęta do rozmowy z kimś, jeśli potrzebna" },
    },
    required: ["tytul", "opis", "symbole", "emocje", "powiazania", "interpretacje", "kontekst_osobisty", "pytania", "wsparcie"],
  },
};

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && DOZWOLONE.includes(origin) ? origin : DOZWOLONE[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ blad: "Zła metoda" }), { status: 405, headers: h });

  try {
    const d = await req.json();
    const urz = String(d.urzadzenie || "").slice(0, 64);
    const wejscie = JSON.stringify({ sen: d.sen, poprzednie: d.poprzednie, profil: d.profil, akasza: d.akasza || "" });
    if (!urz || !d.sen) return new Response(JSON.stringify({ blad: "Brak danych snu." }), { status: 400, headers: h });
    if (wejscie.length > 15000) return new Response(JSON.stringify({ blad: "Sen jest za długi do analizy." }), { status: 400, headers: h });

    // Limit użycia (chroni przed nadużyciem i kosztami)
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    let sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!sbKey) { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); sbKey = k.default || Object.values(k)[0] || ""; } catch { /* brak */ } }
    const sbH: Record<string, string> = { apikey: sbKey, "Content-Type": "application/json" };
    if (sbKey.startsWith("eyJ")) sbH.Authorization = `Bearer ${sbKey}`;
    const lim = await fetch(`${sbUrl}/rest/v1/rpc/ai_zuzyj`, {
      method: "POST",
      headers: sbH,
      body: JSON.stringify({ p_urz: urz, p_limit_urz: LIMIT_URZADZENIE, p_limit_dzien: LIMIT_DZIENNY }),
    });
    if (!lim.ok || (await lim.json()) !== true) {
      return new Response(JSON.stringify({ blad: "Dzisiejszy limit analiz został wykorzystany. Spróbuj jutro 🌙" }), { status: 429, headers: h });
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        tools: [NARZEDZIE],
        tool_choice: { type: "tool", name: "zapisz_analize" },
        messages: [{ role: "user", content: "Dane do analizy (JSON):\n" + wejscie }],
      }),
    });
    if (!r.ok) {
      console.error("Anthropic:", r.status, await r.text());
      return new Response(JSON.stringify({ blad: "Analiza chwilowo niedostępna. Spróbuj za chwilę." }), { status: 502, headers: h });
    }
    const odp = await r.json();
    const narz = (odp.content || []).find((c: { type: string }) => c.type === "tool_use");
    if (!narz || !narz.input) {
      console.error("Brak wyniku narzędzia:", odp.stop_reason, JSON.stringify(odp).slice(0, 500));
      return new Response(JSON.stringify({ blad: "Analiza się nie udała. Spróbuj jeszcze raz." }), { status: 502, headers: h });
    }
    const wynik = narz.input;
    return new Response(JSON.stringify({ wynik }), { headers: h });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ blad: "Coś poszło nie tak przy analizie." }), { status: 500, headers: h });
  }
});
