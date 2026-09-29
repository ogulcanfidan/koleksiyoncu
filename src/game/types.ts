// Ekspertiz oyun modeli. Bu klasördeki dosyalar saf TypeScript'tir (React yok),
// böylece üretici/doğrulayıcı Node ile test edilebilir.

export type Category = "watch" | "coin" | "painting";
export type ToolId = "loupe" | "scale" | "caliper" | "touchstone" | "uv" | "pigment";
export type Material = "gold" | "silver" | "nickel" | "brass" | "steel";
export type Hallmark = "shield" | "anchor" | "star" | "gear" | "lily" | "crown" | "key" | "sun";
export type Edge = "reeded" | "plain" | "lettered";
export type Canvas = "linen" | "jute" | "synthetic";
export type Corner = "bl" | "br";
export type PigmentId =
  | "leadWhite" | "vermilion" | "ochre" | "prussian" | "cobalt" | "zincWhite"
  | "ultramarine" | "viridian" | "cadmiumYellow" | "titaniumWhite" | "phthalo";

export type Personality = "normal" | "greedy" | "desperate" | "clueless";

/** Sahteliği ele veren kural ihlali türleri. */
export type TellId =
  // saat
  | "w.year" | "w.hallmark" | "w.serial" | "w.jewels" | "w.material" | "w.plated" | "w.steelEra" | "w.lumeEra"
  // sikke
  | "c.year" | "c.mint" | "c.edge" | "c.diameter" | "c.weight" | "c.metal"
  // tablo
  | "p.year" | "p.corner" | "p.canvas" | "p.pigment" | "p.uvSignature";

export type WatchItem = {
  cat: "watch";
  makerId: string;          // kadranda yazan usta
  year: number;             // kasanın arkasına kazınmış yıl
  hallmark: Hallmark;
  serial: string;
  jewels: number;
  material: Material;       // gerçek malzeme
  looksLike: Material;      // görünen renk (kaplama olabilir)
  lume: boolean;            // rakamlar UV'de parlıyor mu
  weight: number;           // gram
  numerals: "roman" | "arabic";
  dialHue: number;          // görsel çeşitlilik
};

export type CoinItem = {
  cat: "coin";
  rulerId: string;
  year: number;
  mint: string;
  edge: Edge;
  diameter: number;         // mm
  weight: number;           // gram
  metal: Material;
  looksLike: Material;
};

export type PaintingItem = {
  cat: "painting";
  artistId: string;
  year: number;             // arkadaki etikette yazan yıl
  corner: Corner;           // imza köşesi
  canvas: Canvas;
  pigments: PigmentId[];
  uvSignature: boolean;     // UV altında imza sonradan eklenmiş gibi parlıyor
  scene: number;            // manzara tohumu
  palette: number;
};

export type Item = WatchItem | CoinItem | PaintingItem;

export type Customer = {
  id: string;
  name: string;
  avatarSeed: number;
  age: "young" | "adult" | "old";
  gender: "f" | "m";
  personality: Personality;
  item: Item;
  /** Satıcının iddiası: hangi usta/hükümdar/ressam. clueless ise iddia yok. */
  claimsUnknown: boolean;
  ask: number;              // istenen fiyat
  minAccept: number;        // gizli: kabul edeceği en düşük fiyat
  patience: number;         // pazarlık turu
  /** Gerçek durum */
  genuine: boolean;
  trueValue: number;        // gerçekse piyasa değeri, sahteyse hurda değeri
  tells: TellId[];          // sahteyse ihlal edilen kurallar
  lineKey: string;          // açılış repliği anahtarı
};

export type DayPlan = {
  seed: number;
  dayNo: number;
  customers: Customer[];
};
