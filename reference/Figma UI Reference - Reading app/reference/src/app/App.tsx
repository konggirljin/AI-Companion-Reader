import { useState, useEffect } from "react";
import {
  Menu, Search, SlidersHorizontal, MoreVertical,
  Heart, Bookmark, Check, BookMarked, Compass, Fingerprint, CircleUser,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterId = "all" | "favorites" | "toread" | "finished";
type NavId = "journey" | "persona" | "bookshelf" | "profile";
type MotifType =
  | "leaf" | "arch-branch" | "arch-tree" | "large-leaf"
  | "waves" | "abstract" | "forest" | "sunset" | "moon" | "botanical-circle";

interface Book {
  id: number;
  title: string;
  tag: string;
  bg: string;
  textColor: string;
  accentColor: string;
  motif: MotifType;
  filters: FilterId[];
}

// ─── Books ────────────────────────────────────────────────────────────────────

const BOOKS: Book[] = [
  { id: 1,  title: "The Secret Garden",     tag: "Vol. 1",     bg: "#C4875A", textColor: "#FAEBD7", accentColor: "rgba(250,235,215,0.55)", motif: "leaf",              filters: ["all","favorites"] },
  { id: 2,  title: "Dune",                  tag: "Vol. 1",     bg: "#E0C898", textColor: "#4A3218", accentColor: "rgba(74,50,24,0.45)",    motif: "arch-branch",       filters: ["all","toread"] },
  { id: 3,  title: "Middlemarch",           tag: "Vol. 1",     bg: "#44260E", textColor: "#D8B88A", accentColor: "rgba(210,165,85,0.55)",  motif: "arch-tree",         filters: ["all","finished"] },
  { id: 4,  title: "Beloved",               tag: "Author Name",bg: "#CC8A62", textColor: "#FAEBD7", accentColor: "rgba(250,235,215,0.5)",  motif: "large-leaf",        filters: ["all","favorites","finished"] },
  { id: 5,  title: "The Master & Margarita",tag: "Author Name",bg: "#26180A", textColor: "#B88A52", accentColor: "rgba(185,140,82,0.6)",   motif: "waves",             filters: ["all","finished"] },
  { id: 6,  title: "The Alchemist",         tag: "Author Name",bg: "#8A4820", textColor: "#F5D090", accentColor: "rgba(245,208,144,0.55)", motif: "abstract",          filters: ["all","favorites"] },
  { id: 7,  title: "Stoner",                tag: "Author Name",bg: "#1C1C2E", textColor: "#8AAAD0", accentColor: "rgba(138,170,208,0.65)", motif: "forest",            filters: ["all","toread"] },
  { id: 8,  title: "The Dispossessed",      tag: "Genre",      bg: "#783818", textColor: "#F5C060", accentColor: "rgba(245,192,96,0.65)",  motif: "sunset",            filters: ["all","toread"] },
  { id: 9,  title: "Pachinko",              tag: "Genre",      bg: "#1A2E50", textColor: "#98B8D8", accentColor: "rgba(152,184,216,0.65)", motif: "moon",              filters: ["all","finished"] },
  { id: 10, title: "Gilead",                tag: "Genre",      bg: "#284832", textColor: "#B0C8A0", accentColor: "rgba(176,200,160,0.6)",  motif: "botanical-circle",  filters: ["all","favorites"] },
];

// ─── SVG Motifs ───────────────────────────────────────────────────────────────

function MotifSVG({ type, color }: { type: MotifType; color: string }) {
  const c = color;

  const motifs: Record<MotifType, React.ReactNode> = {
    "leaf": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <path d="M40,116 L40,28" strokeWidth="0.9" fillOpacity="0" strokeOpacity="0.65" />
        <path d="M40,28 Q17,55 17,78 Q17,106 40,116 Q63,106 63,78 Q63,55 40,28Z" fillOpacity="0.18" strokeWidth="0.9" strokeOpacity="0.5" />
        <path d="M40,70 Q27,57 21,44" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.45" />
        <path d="M40,84 Q53,71 59,58" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.45" />
        <path d="M40,97 Q29,89 24,79" strokeWidth="0.55" fillOpacity="0" strokeOpacity="0.38" />
      </g>
    ),
    "arch-branch": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20,120 L20,52 Q20,20 40,20 Q60,20 60,52 L60,120" fillOpacity="0" strokeWidth="1" strokeOpacity="0.45" />
        <line x1="40" y1="96" x2="40" y2="58" strokeWidth="0.9" strokeOpacity="0.5" />
        <path d="M40,74 Q27,60 18,47" strokeWidth="0.75" fillOpacity="0" strokeOpacity="0.5" />
        <path d="M40,74 Q53,60 62,47" strokeWidth="0.75" fillOpacity="0" strokeOpacity="0.5" />
        <path d="M26,65 Q19,55 14,43" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.35" />
        <path d="M54,65 Q61,55 66,43" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.35" />
        <circle cx="20" cy="48" r="1.8" fillOpacity="0.45" strokeOpacity="0" />
        <circle cx="60" cy="48" r="1.8" fillOpacity="0.45" strokeOpacity="0" />
      </g>
    ),
    "arch-tree": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14,120 L14,56 Q14,22 40,22 Q66,22 66,56 L66,120" fillOpacity="0" strokeWidth="0.9" strokeOpacity="0.42" />
        <line x1="40" y1="120" x2="40" y2="70" strokeWidth="1.2" strokeOpacity="0.48" />
        <path d="M40,70 Q24,55 16,36 L28,44 Q33,60 40,70Z" fillOpacity="0.28" strokeOpacity="0" />
        <path d="M40,70 Q56,55 64,36 L52,44 Q47,60 40,70Z" fillOpacity="0.28" strokeOpacity="0" />
        <path d="M40,58 Q26,43 20,26 L32,34 Q36,50 40,58Z" fillOpacity="0.22" strokeOpacity="0" />
        <path d="M40,58 Q54,43 60,26 L48,34 Q44,50 40,58Z" fillOpacity="0.22" strokeOpacity="0" />
      </g>
    ),
    "large-leaf": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <path d="M40,118 Q7,86 11,50 Q17,20 40,16 Q63,20 69,50 Q73,86 40,118Z" fillOpacity="0.18" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="40" y1="16" x2="40" y2="118" strokeWidth="0.9" strokeOpacity="0.6" />
        <path d="M40,50 Q23,36 16,22" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.42" />
        <path d="M40,64 Q57,50 64,36" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.42" />
        <path d="M40,78 Q24,67 19,55" strokeWidth="0.6" fillOpacity="0" strokeOpacity="0.38" />
        <path d="M40,90 Q56,80 61,68" strokeWidth="0.55" fillOpacity="0" strokeOpacity="0.36" />
        <path d="M40,101 Q27,93 23,83" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.3" />
      </g>
    ),
    "waves": (
      <g stroke={c} fill="none" strokeLinecap="round">
        <path d="M4,46 Q22,34 40,46 Q58,58 76,46" strokeWidth="0.8" strokeOpacity="0.55" />
        <path d="M4,58 Q22,46 40,58 Q58,70 76,58" strokeWidth="0.8" strokeOpacity="0.55" />
        <path d="M4,70 Q22,58 40,70 Q58,82 76,70" strokeWidth="0.8" strokeOpacity="0.5" />
        <path d="M4,82 Q22,70 40,82 Q58,94 76,82" strokeWidth="0.75" strokeOpacity="0.45" />
        <path d="M4,94 Q22,82 40,94 Q58,106 76,94" strokeWidth="0.7" strokeOpacity="0.4" />
        <path d="M4,106 Q22,94 40,106 Q58,118 76,106" strokeWidth="0.6" strokeOpacity="0.3" />
      </g>
    ),
    "abstract": (
      <g stroke={c} fill={c} strokeLinecap="round">
        <path d="M8,96 Q8,46 40,46 Q72,46 72,96" fillOpacity="0" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d="M18,96 Q18,60 40,60 Q62,60 62,96" fillOpacity="0.14" strokeWidth="0.75" strokeOpacity="0.4" />
        <path d="M8,96 Q40,82 72,96" fillOpacity="0" strokeWidth="0.6" strokeOpacity="0.4" />
        <path d="M11,82 Q40,70 69,82" fillOpacity="0" strokeWidth="0.5" strokeOpacity="0.35" />
        <path d="M16,68 Q40,58 64,68" fillOpacity="0" strokeWidth="0.5" strokeOpacity="0.3" />
        <path d="M22,56 Q40,46 58,56" fillOpacity="0" strokeWidth="0.45" strokeOpacity="0.25" />
      </g>
    ),
    "forest": (
      <g fill={c} stroke={c} strokeLinecap="round">
        <path d="M0,120 L14,74 L22,90 L40,50 L58,90 L66,74 L80,120Z" fillOpacity="0.24" strokeOpacity="0" />
        <path d="M40,50 L30,66 L50,66Z" fillOpacity="0.16" strokeOpacity="0" />
        <circle cx="15" cy="36" r="1.3" fillOpacity="0.65" strokeOpacity="0" />
        <circle cx="62" cy="26" r="1.0" fillOpacity="0.55" strokeOpacity="0" />
        <circle cx="70" cy="44" r="0.9" fillOpacity="0.45" strokeOpacity="0" />
        <circle cx="8" cy="55" r="0.8" fillOpacity="0.4" strokeOpacity="0" />
        <circle cx="72" cy="32" r="0.7" fillOpacity="0.35" strokeOpacity="0" />
      </g>
    ),
    "sunset": (
      <g stroke={c} fill={c} strokeLinecap="round">
        <line x1="0" y1="80" x2="80" y2="80" strokeWidth="0.6" strokeOpacity="0.5" />
        <path d="M22,80 Q22,50 40,50 Q58,50 58,80" fillOpacity="0.24" strokeWidth="0.9" strokeOpacity="0.5" />
        <path d="M0,120 L18,80 L34,100 L50,76 L66,94 L80,80 L80,120Z" fillOpacity="0.2" strokeOpacity="0" />
        <path d="M37,80 C35,92 33,104 32,120" strokeWidth="1.5" fillOpacity="0" strokeOpacity="0.48" />
        <path d="M43,80 C45,92 47,104 48,120" strokeWidth="1.5" fillOpacity="0" strokeOpacity="0.48" />
        <path d="M40,50 L24,36" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.3" />
        <path d="M40,50 L56,36" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.3" />
        <path d="M40,50 L40,32" strokeWidth="0.5" fillOpacity="0" strokeOpacity="0.3" />
      </g>
    ),
    "moon": (
      <g fill={c} stroke={c} strokeLinecap="round">
        <path
          d="M42,38 Q64,54 60,78 Q56,102 40,102 Q20,102 16,78 Q12,54 34,38 Q27,50 29,68 Q31,90 44,91 Q57,91 61,72 Q65,50 42,38Z"
          fillOpacity="0.42" strokeOpacity="0"
        />
        <path
          d="M42,38 Q64,54 60,78 Q56,102 40,102 Q20,102 16,78 Q12,54 34,38 Q27,50 29,68 Q31,90 44,91 Q57,91 61,72 Q65,50 42,38Z"
          fillOpacity="0" strokeWidth="0.8" strokeOpacity="0.5"
        />
        <circle cx="18" cy="54" r="1.6" fillOpacity="0.72" strokeOpacity="0" />
        <circle cx="64" cy="46" r="1.2" fillOpacity="0.62" strokeOpacity="0" />
        <circle cx="70" cy="72" r="1.0" fillOpacity="0.52" strokeOpacity="0" />
        <circle cx="13" cy="80" r="0.9" fillOpacity="0.48" strokeOpacity="0" />
        <circle cx="24" cy="34" r="0.8" fillOpacity="0.4" strokeOpacity="0" />
      </g>
    ),
    "botanical-circle": (
      <g stroke={c} fill={c} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="40" cy="68" r="32" fillOpacity="0" strokeWidth="0.9" strokeOpacity="0.42" />
        <line x1="40" y1="100" x2="40" y2="118" strokeWidth="1.1" strokeOpacity="0.48" />
        <path d="M40,100 Q24,86 22,73 Q33,78 40,100Z" fillOpacity="0.32" strokeOpacity="0" />
        <path d="M40,100 Q56,86 58,73 Q47,78 40,100Z" fillOpacity="0.32" strokeOpacity="0" />
        <path d="M40,36 Q28,28 26,18 Q35,22 40,36Z" fillOpacity="0.28" strokeOpacity="0" />
        <path d="M40,36 Q52,28 54,18 Q45,22 40,36Z" fillOpacity="0.28" strokeOpacity="0" />
        <line x1="40" y1="18" x2="40" y2="36" strokeWidth="0.85" strokeOpacity="0.42" />
      </g>
    ),
  };

  return (
    <svg
      viewBox="0 0 80 120"
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {motifs[type]}
    </svg>
  );
}

// ─── Book card ────────────────────────────────────────────────────────────────

function BookCard({ book }: { book: Book }) {
  return (
    <div className="flex-1 relative" style={{ aspectRatio: "2/3", minWidth: 0 }}>
      <div
        className="absolute inset-0 overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-2 active:translate-y-0"
        style={{
          background: book.bg,
          borderRadius: "2px 5px 5px 2px",
          boxShadow: "3px 0 6px rgba(0,0,0,0.45), inset -2px 0 4px rgba(0,0,0,0.25)",
        }}
      >
        <MotifSVG type={book.motif} color={book.accentColor} />

        {/* Cover text — upper third */}
        <div className="absolute top-0 left-0 right-0 pt-3 px-2 text-center z-10">
          <p
            className="uppercase font-bold leading-tight break-words"
            style={{
              fontSize: "clamp(5px, 1.5vw, 7.5px)",
              color: book.textColor,
              letterSpacing: "0.07em",
              textShadow: "0 1px 3px rgba(0,0,0,0.45)",
              wordBreak: "break-word",
              hyphens: "auto",
            }}
          >
            {book.title}
          </p>
          <p
            className="mt-1 opacity-65"
            style={{
              fontSize: "clamp(4px, 1.1vw, 6px)",
              color: book.textColor,
            }}
          >
            {book.tag}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Decorative vase ──────────────────────────────────────────────────────────

function VaseDecoration() {
  return (
    <div className="flex-1 relative flex items-end justify-center" style={{ aspectRatio: "2/3" }}>
      <svg viewBox="0 0 60 120" className="w-4/5 h-4/5" xmlns="http://www.w3.org/2000/svg">
        {/* vase body */}
        <path d="M18,118 L15,72 Q13,54 18,44 Q24,34 30,32 Q36,34 42,44 Q47,54 45,72 L42,118Z"
          fill="#8B6030" fillOpacity="0.65" stroke="rgba(180,130,70,0.4)" strokeWidth="0.8" />
        {/* vase ribbing */}
        <path d="M16,80 Q30,77 44,80" fill="none" stroke="rgba(200,155,80,0.28)" strokeWidth="0.6" />
        <path d="M15,92 Q30,89 45,92" fill="none" stroke="rgba(200,155,80,0.22)" strokeWidth="0.6" />
        {/* vase neck detail */}
        <path d="M22,44 Q30,38 38,44" fill="none" stroke="rgba(200,155,80,0.3)" strokeWidth="0.7" />
        {/* branches */}
        <path d="M30,32 Q20,22 14,8" fill="none" stroke="rgba(155,100,48,0.9)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M30,32 Q40,18 44,4" fill="none" stroke="rgba(155,100,48,0.9)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M20,20 Q13,14 10,18" fill="none" stroke="rgba(155,100,48,0.75)" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M40,16 Q47,11 50,15" fill="none" stroke="rgba(155,100,48,0.75)" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M17,12 Q12,8 10,12" fill="none" stroke="rgba(155,100,48,0.6)" strokeWidth="0.7" strokeLinecap="round" />
        {/* leaves */}
        <path d="M14,8 Q9,3 7,7 Q10,11 14,8Z" fill="rgba(130,90,40,0.75)" />
        <path d="M44,4 Q49,0 51,4 Q48,7 44,4Z" fill="rgba(130,90,40,0.75)" />
        <path d="M10,18 Q5,15 6,12 Q9,14 10,18Z" fill="rgba(130,90,40,0.65)" />
        <path d="M50,15 Q55,12 54,16 Q51,17 50,15Z" fill="rgba(130,90,40,0.65)" />
      </svg>
    </div>
  );
}

// ─── Shelf row ────────────────────────────────────────────────────────────────

const WALL_BG =
  "repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,190,80,0.012) 60px,rgba(255,190,80,0.012) 61px)," +
  "#1C0F07";

const PLANK_BG =
  "linear-gradient(90deg,rgba(255,200,100,0.06) 0%,rgba(255,200,100,0) 25%,rgba(255,200,100,0.04) 50%,rgba(255,200,100,0) 75%,rgba(255,200,100,0.05) 100%)," +
  "linear-gradient(to bottom,#9A5A28 0%,#7A4020 35%,#8C5028 65%,#642E14 100%)";

function ShelfRow({ books, booksPerRow }: { books: Book[]; booksPerRow: number }) {
  const empties = booksPerRow - books.length;
  return (
    <div style={{ background: WALL_BG }}>
      <div className="flex gap-2.5 px-3 pt-4 pb-0 items-end">
        {books.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
        {empties > 0 && (
          <>
            {Array(empties - 1).fill(null).map((_, i) => (
              <div key={i} className="flex-1" style={{ aspectRatio: "2/3" }} />
            ))}
            <VaseDecoration />
          </>
        )}
      </div>
      {/* Shelf plank */}
      <div
        style={{
          height: "20px",
          background: PLANK_BG,
          boxShadow: "0 7px 20px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,195,100,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)",
          marginTop: "2px",
        }}
      />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function useBooksPerRow() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const update = () => setN(window.innerWidth >= 700 ? 4 : 3);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return n;
}

// ─── Filter + Nav config ──────────────────────────────────────────────────────

const FILTERS: { id: FilterId; label: string; icon: React.ReactNode }[] = [
  { id: "all",       label: "All Books", icon: <BookMarked size={13} /> },
  { id: "favorites", label: "Favorites", icon: <Heart size={13} /> },
  { id: "toread",    label: "To Read",   icon: <Bookmark size={13} /> },
  { id: "finished",  label: "Finished",  icon: <Check size={13} strokeWidth={3} /> },
];

const NAV: { id: NavId; label: string; icon: React.ReactNode }[] = [
  { id: "journey",   label: "Journey",   icon: <Compass size={20} /> },
  { id: "persona",   label: "Persona",   icon: <Fingerprint size={20} /> },
  { id: "bookshelf", label: "Bookshelf", icon: <BookMarked size={20} /> },
  { id: "profile",   label: "Profile",   icon: <CircleUser size={20} /> },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [nav, setNav] = useState<NavId>("bookshelf");
  const booksPerRow = useBooksPerRow();

  const visible = BOOKS.filter((b) => b.filters.includes(filter));
  const rows = chunk(visible, booksPerRow);

  const F = "'Nunito', system-ui, sans-serif";

  return (
    /* Outer canvas — dark charred wood outside the app on desktop */
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0A0603" }}
    >
      {/* App shell */}
      <div
        className="relative flex flex-col overflow-hidden w-full"
        style={{
          fontFamily: F,
          background: "#1C0F07",
          maxWidth: "min(100vw, 560px)",
          height: "100dvh",
          boxShadow: "0 0 120px rgba(0,0,0,0.95)",
        }}
      >
        {/* ── Header ── */}
        <header
          className="flex items-center px-4 flex-shrink-0"
          style={{
            paddingTop: "max(2.75rem, env(safe-area-inset-top, 2.75rem))",
            paddingBottom: "0.75rem",
            background: "#1C0F07",
          }}
        >
          <button className="p-1.5 -ml-1.5 mr-1" style={{ color: "#C89060" }}>
            <Menu size={22} />
          </button>

          <div className="flex-1 px-1">
            <h1
              className="font-extrabold leading-none"
              style={{ fontSize: 22, color: "#F0DCC0", letterSpacing: "-0.01em" }}
            >
              My Bookshelf
            </h1>
            <p className="text-xs mt-0.5 font-medium" style={{ color: "#8A6038" }}>
              Your journey begins here
            </p>
          </div>

          <div className="flex items-center gap-0.5">
            {[<Search size={17} />, <SlidersHorizontal size={17} />, <MoreVertical size={17} />].map((ic, i) => (
              <button
                key={i}
                className="p-2 transition-opacity hover:opacity-80"
                style={{ color: "#C89060" }}
              >
                {ic}
              </button>
            ))}
          </div>
        </header>

        {/* ── Filter tabs ── */}
        <div
          className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0"
          style={{ background: "#1C0F07", scrollbarWidth: "none" }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 font-semibold transition-all duration-200"
                style={{
                  fontSize: 13,
                  fontFamily: F,
                  padding: "6px 14px",
                  borderRadius: 99,
                  background: active ? "#9A6535" : "rgba(255,255,255,0.065)",
                  color: active ? "#F5ECD8" : "#9A7048",
                  border: active ? "none" : "1px solid rgba(200,150,75,0.18)",
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{f.icon}</span>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ── Bookshelf area ── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ background: WALL_BG, scrollbarWidth: "none" }}
        >
          {rows.length > 0
            ? rows.map((row, ri) => (
                <ShelfRow key={ri} books={row} booksPerRow={booksPerRow} />
              ))
            : (
              <div className="flex items-center justify-center h-40">
                <p style={{ color: "#7A6040", fontSize: 14 }}>No books on this shelf</p>
              </div>
            )}
          <div className="h-2" />
        </div>

        {/* ── Bottom navigation ── */}
        <nav
          className="flex-shrink-0 flex items-end justify-around"
          style={{
            paddingTop: 10,
            paddingBottom: "max(1.4rem, env(safe-area-inset-bottom, 1.4rem))",
            background:
              "linear-gradient(to bottom, rgba(28,15,7,0) 0%, #1C0F07 22%, #160C05 100%)",
          }}
        >
          {NAV.map((item) => {
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id)}
                className="flex flex-col items-center gap-1 transition-all duration-200"
                style={{ minWidth: 64 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: active ? "7px 20px" : "8px",
                    borderRadius: 22,
                    background: active ? "#3D2010" : "transparent",
                    color: active ? "#E8B870" : "#6A5030",
                    transition: "all 0.2s",
                  }}
                >
                  {item.icon}
                </div>
                <span
                  className="font-semibold"
                  style={{
                    fontSize: 11,
                    fontFamily: F,
                    color: active ? "#E8B870" : "#6A5030",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
