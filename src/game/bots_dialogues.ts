import * as THREE from "three";

export type DialogueLine = {
  speaker: string;
  text: string;
};

export type Dialogue = DialogueLine[];

function renderBubble(text: string): THREE.Texture {
  const fontSize = 32;
  const padX = 26;
  const padY = 20;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const textW = metrics.width;

  const w = Math.min(1024, Math.ceil(textW + padX * 2));
  const h = fontSize + padY * 2;
  canvas.width = w;
  canvas.height = h;

  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  const r = 18;
  ctx.fillStyle = "rgba(15, 25, 35, 0.94)";
  roundedRect(ctx, 2, 2, w - 4, h - 4, r);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 3;
  roundedRect(ctx, 2, 2, w - 4, h - 4, r);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
  ctx.lineWidth = 7;
  ctx.strokeText(text, w / 2, h / 2 + 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const bubbleCache = new Map<string, THREE.Texture>();

export function getSpeechBubbleTexture(text: string): THREE.Texture {
  const cached = bubbleCache.get(text);
  if (cached) return cached;
  const tex = renderBubble(text);
  bubbleCache.set(text, tex);
  return tex;
}

export const BOT_DIALOGUES: Dialogue[] = [
  [
    { speaker: "Якарь", text: "Слышь, серж, а где этот ниндзя?" },
    { speaker: "Веин", text: "Не знаю. Патрулируй, а не болтай." },
    { speaker: "Якарь", text: "А если он в кустах?" },
    { speaker: "Веин", text: "Тогда ты его не увидишь. Иди работай." },
  ],
  [
    { speaker: "Якарь", text: "Серж, а серж." },
    { speaker: "Веин", text: "Что." },
    { speaker: "Якарь", text: "А мы тут надолго?" },
    { speaker: "Веин", text: "Пока он не сдохнет." },
  ],
  [
    { speaker: "Якарь", text: "У меня идея!" },
    { speaker: "Веин", text: "Нет." },
    { speaker: "Якарь", text: "Ты даже не выслушал!" },
    { speaker: "Веин", text: "Знаю тебя." },
  ],
  [
    { speaker: "Якарь", text: "Ты когда-нибудь улыбаешься?" },
    { speaker: "Веин", text: "Нет." },
    { speaker: "Якарь", text: "А зря. Морщины будут." },
  ],
  [
    { speaker: "Якарь", text: "А что если он нас слушает?" },
    { speaker: "Веин", text: "Тогда он уже мёртв." },
    { speaker: "Якарь", text: "Логично." },
  ],
  [
    { speaker: "Якарь", text: "Скучно." },
    { speaker: "Веин", text: "Иди работай." },
    { speaker: "Якарь", text: "Работа — для роботов." },
    { speaker: "Веин", text: "Ты и есть робот." },
  ],
  [
    { speaker: "Якарь", text: "А помнишь того парня?" },
    { speaker: "Веин", text: "Какого?" },
    { speaker: "Якарь", text: "Ну того. С пистолетом." },
    { speaker: "Веин", text: "Их было трое." },
  ],
  [
    { speaker: "Якарь", text: "Эй, ты вообще разговариваешь?" },
    { speaker: "Философ", text: "Иногда." },
    { speaker: "Якарь", text: "И всё?" },
    { speaker: "Философ", text: "Всё." },
  ],
  [
    { speaker: "Якарь", text: "О чём думаешь?" },
    { speaker: "Философ", text: "О смысле." },
    { speaker: "Якарь", text: "Смысле чего?" },
    { speaker: "Философ", text: "Всего." },
  ],
  [
    { speaker: "Якарь", text: "Давай поспорим!" },
    { speaker: "Философ", text: "О чём?" },
    { speaker: "Якарь", text: "О чём угодно!" },
    { speaker: "Философ", text: "Спор бессмысленен." },
  ],
  [
    { speaker: "Якарь", text: "Слушай, а мы вообще настоящие?" },
    { speaker: "Философ", text: "Хороший вопрос." },
    { speaker: "Якарь", text: "Ну?" },
    { speaker: "Философ", text: "Не знаю." },
  ],
  [
    { speaker: "Якарь", text: "Ты грустный." },
    { speaker: "Философ", text: "Я задумчивый." },
    { speaker: "Якарь", text: "Это одно и то же." },
    { speaker: "Философ", text: "Возможно." },
  ],
  [
    { speaker: "Якарь", text: "Бу!" },
    { speaker: "Патриций", text: "ААА!" },
    { speaker: "Якарь", text: "Ха-ха!" },
    { speaker: "Патриций", text: "Так нельзя!" },
  ],
  [
    { speaker: "Якарь", text: "Ты боишься?" },
    { speaker: "Патриций", text: "Нет!" },
    { speaker: "Якарь", text: "А почему трясёшься?" },
    { speaker: "Патриций", text: "Холодно!" },
  ],
  [
    { speaker: "Якарь", text: "Он где-то рядом." },
    { speaker: "Патриций", text: "ГДЕ?!" },
    { speaker: "Якарь", text: "Шучу." },
    { speaker: "Патриций", text: "Не шути так!" },
  ],
  [
    { speaker: "Якарь", text: "Если он выстрелит, что сделаешь?" },
    { speaker: "Патриций", text: "Побегу!" },
    { speaker: "Якарь", text: "А если он побежит?" },
    { speaker: "Патриций", text: "Тогда замру!" },
  ],
  [
    { speaker: "Якарь", text: "Ты вообще воевал?" },
    { speaker: "Патриций", text: "Один раз." },
    { speaker: "Якарь", text: "И как?" },
    { speaker: "Патриций", text: "Спрятался." },
  ],
  [
    { speaker: "Веин", text: "Доложи обстановку." },
    { speaker: "Философ", text: "Тихо." },
    { speaker: "Веин", text: "Это всё?" },
    { speaker: "Философ", text: "Этого достаточно." },
  ],
  [
    { speaker: "Веин", text: "Ты стрелял?" },
    { speaker: "Философ", text: "Нет." },
    { speaker: "Веин", text: "Почему?" },
    { speaker: "Философ", text: "Не было повода." },
  ],
  [
    { speaker: "Веин", text: "Почему ты всегда молчишь?" },
    { speaker: "Философ", text: "Слова ничего не меняют." },
    { speaker: "Веин", text: "В армии — меняют." },
  ],
  [
    { speaker: "Веин", text: "Приказ: держать позицию." },
    { speaker: "Философ", text: "Все позиции временны." },
    { speaker: "Веин", text: "Это приказ." },
    { speaker: "Философ", text: "Хорошо." },
  ],
  [
    { speaker: "Веин", text: "Ты странный." },
    { speaker: "Философ", text: "Все странные." },
    { speaker: "Веин", text: "Не все." },
    { speaker: "Философ", text: "Ты тоже." },
  ],
  [
    { speaker: "Веин", text: "Держи строй." },
    { speaker: "Патриций", text: "Он там!" },
    { speaker: "Веин", text: "Где?" },
    { speaker: "Патриций", text: "Не знаю!" },
  ],
  [
    { speaker: "Веин", text: "Не паникуй." },
    { speaker: "Патриций", text: "Я НЕ ПАНИКУЮ!" },
    { speaker: "Веин", text: "Ты кричишь." },
    { speaker: "Патриций", text: "ИЗВИНИ!" },
  ],
  [
    { speaker: "Веин", text: "Какой у тебя опыт?" },
    { speaker: "Патриций", text: "Небольшой." },
    { speaker: "Веин", text: "Сколько боёв?" },
    { speaker: "Патриций", text: "Ноль." },
  ],
  [
    { speaker: "Веин", text: "Если умираешь — умри с честью." },
    { speaker: "Патриций", text: "Я не хочу умирать!" },
    { speaker: "Веин", text: "Все не хотят." },
    { speaker: "Патриций", text: "Тогда зачем мы здесь?!" },
  ],
  [
    { speaker: "Веин", text: "Стреляй в него." },
    { speaker: "Патриций", text: "А если промахнусь?" },
    { speaker: "Веин", text: "Тогда стреляй снова." },
    { speaker: "Патриций", text: "А если опять?" },
    { speaker: "Веин", text: "Ты меня достал." },
  ],
  [
    { speaker: "Философ", text: "Чего ты боишься?" },
    { speaker: "Патриций", text: "Всего!" },
    { speaker: "Философ", text: "Страх — иллюзия." },
    { speaker: "Патриций", text: "Очень реальная иллюзия!" },
  ],
  [
    { speaker: "Философ", text: "Ты дышишь слишком быстро." },
    { speaker: "Патриций", text: "Я бегу!" },
    { speaker: "Философ", text: "Ты стоишь." },
    { speaker: "Патриций", text: "Мысленно!" },
  ],
  [
    { speaker: "Философ", text: "Смерть — часть жизни." },
    { speaker: "Патриций", text: "Не хочу быть частью!" },
    { speaker: "Философ", text: "Понимаю." },
    { speaker: "Патриций", text: "Наконец-то кто-то понимает!" },
  ],
  [
    { speaker: "Философ", text: "Тишина успокаивает." },
    { speaker: "Патриций", text: "Я не могу молчать!" },
    { speaker: "Философ", text: "Попробуй." },
    { speaker: "Патриций", text: "Попробовал!" },
    { speaker: "Философ", text: "Молодец." },
  ],
  [
    { speaker: "Философ", text: "Если ты упадёшь, я подниму." },
    { speaker: "Патриций", text: "А если не сможешь?" },
    { speaker: "Философ", text: "Тогда упадём вместе." },
  ],
];

export const BOT_MONOLOGUES: Record<string, string[]> = {
  Якарь: [
    "Скучно тут.",
    "А где все?",
    "Надо что-то взорвать.",
    "Он куда-то делся.",
    "Хоть бы кто-то вышел.",
  ],
  Веин: [
    "Позиция удерживается.",
    "Тихо.",
    "Кто-то здесь был.",
    "Продолжаю патруль.",
    "Всё по плану.",
  ],
  Философ: [
    "Тишина.",
    "Зачем мы здесь?",
    "Всё повторяется.",
    "Проходит время.",
    "Ничего не меняется.",
  ],
  Патриций: [
    "Я спокоен. Я спокоен.",
    "Он где-то рядом.",
    "Тут никого нет? Точно никого?",
    "Мамочки.",
    "Всё будет хорошо. Наверное.",
  ],
};

export const BOT_SPOTTED_LINES: Record<string, string[]> = {
  Якарь: ["О, гости!", "Смотрите кто пришёл!", "А ты смелый!"],
  Веин: ["Цель обнаружена.", "В атаку.", "Стоять."],
  Философ: ["Здравствуй.", "Он здесь.", "Интересно."],
  Патриций: ["ОН!", "ВРАГ!", "СПАСАЙТЕСЬ!"],
};

export function pickDialogue(a: string, b: string): Dialogue | null {
  const matches = BOT_DIALOGUES.filter((d) => {
    const speakers = d.map((l) => l.speaker);
    return speakers.includes(a) && speakers.includes(b);
  });
  if (matches.length === 0) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

export function pickMonologue(name: string): string | null {
  const arr = BOT_MONOLOGUES[name];
  if (!arr) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickSpottedLine(name: string): string | null {
  const arr = BOT_SPOTTED_LINES[name];
  if (!arr) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function prewarmBubbles(): void {
  const all = new Set<string>();
  for (const d of BOT_DIALOGUES) {
    for (const line of d) all.add(line.text);
  }
  for (const name of Object.keys(BOT_MONOLOGUES)) {
    for (const t of BOT_MONOLOGUES[name]) all.add(t);
  }
  for (const name of Object.keys(BOT_SPOTTED_LINES)) {
    for (const t of BOT_SPOTTED_LINES[name]) all.add(t);
  }
  for (const t of all) {
    getSpeechBubbleTexture(t);
  }
}
