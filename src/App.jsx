import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

// ─── GITHUB STORAGE ──────────────────────────────────────────────────────────
const GH_OWNER = import.meta.env.VITE_GITHUB_OWNER;
const GH_REPO  = import.meta.env.VITE_GITHUB_REPO;
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GH_PATH  = "sforno-data.json";
const GH_BASE  = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;

async function ghLoad() {
  const res = await fetch(GH_BASE, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub load error: ${res.status}`);
  const json = await res.json();
  // content is base64-encoded
  const text = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ""))));
  return { data: JSON.parse(text), sha: json.sha };
}

async function ghSave(data, sha) {
  const text = JSON.stringify(data, null, 2);
  const content = btoa(unescape(encodeURIComponent(text)));
  const res = await fetch(GH_BASE, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Sforno: aggiornamento dati", content, sha }),
  });
  if (!res.ok) throw new Error(`GitHub save error: ${res.status}`);
  const json = await res.json();
  return json.content.sha;
}

// ─── BRAND & HELPERS ────────────────────────────────────────────────────────
const C = {
  red: "#8B2500", amber: "#D4963A", dark: "#0F0600", ivory: "#FFF8F0",
  mid: "#C03A10", green: "#3D7A4A", yellow: "#C8A830", orange: "#D4600A",
  panel: "#1E0E04", border: "#3A1A08", text: "#E8D5B0",
};
const IVA = 1.1;
const noIva = p => p / IVA;
const eur = v => "€ " + Number(v).toFixed(2).replace(".", ",");
const pct = v => Number(v).toFixed(1) + "%";
const fcColor = v => v <= 22 ? C.green : v <= 28 ? C.yellow : v <= 33 ? C.orange : C.red;
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── DEFAULT CATEGORIES ─────────────────────────────────────────────────────
const DEFAULT_RECIPE_CATS = [
  { id: "pizza", name: "Pizza", emoji: "🍕" },
  { id: "fritto", name: "Fritto", emoji: "🍟" },
  { id: "bibita", name: "Bibita", emoji: "🥤" },
  { id: "dolce", name: "Dolce", emoji: "🍮" },
  { id: "combo", name: "Combo", emoji: "🎁" },
  { id: "altro", name: "Altro", emoji: "📦" },
];
const DEFAULT_ING_CATS = [
  { id: "farine", name: "Farine", emoji: "🌾" },
  { id: "formaggi", name: "Formaggi", emoji: "🧀" },
  { id: "salse", name: "Salse", emoji: "🍅" },
  { id: "olio_condimenti", name: "Olio & Condimenti", emoji: "🫒" },
  { id: "verdure", name: "Verdure", emoji: "🥬" },
  { id: "carni_salumi", name: "Carni & Salumi", emoji: "🥩" },
  { id: "fritti_base", name: "Fritti Base", emoji: "🍗" },
  { id: "packaging", name: "Packaging", emoji: "📦" },
  { id: "altro", name: "Altro", emoji: "🔹" },
];

// ─── INITIAL DATA ───────────────────────────────────────────────────────────
const INIT_INGREDIENTI = [
  { id: "i01", nome: "Cartone Pizza", unit: "pz", costo: 0.18, catId: "packaging" },
  { id: "i02", nome: "Cartone Fritto Piccolo", unit: "pz", costo: 0.12, catId: "packaging" },
  { id: "i03", nome: "Cartone Fritto Grande", unit: "pz", costo: 0.18, catId: "packaging" },
  { id: "i04", nome: "Cartone Fritto Mix", unit: "pz", costo: 0.22, catId: "packaging" },
  { id: "i05", nome: "Panetto Pizza", unit: "pz", costo: 0.70, catId: "farine" },
  { id: "i06", nome: "Mozzarella", unit: "kg", costo: 7.00, catId: "formaggi" },
  { id: "i07", nome: "Salsa di Pomodoro", unit: "kg", costo: 2.50, catId: "salse" },
  { id: "i08", nome: "Origano", unit: "kg", costo: 12.00, catId: "olio_condimenti" },
  { id: "i09", nome: "Olio EVO", unit: "L", costo: 6.00, catId: "olio_condimenti" },
  { id: "i10", nome: "Basilico", unit: "kg", costo: 60.00, catId: "verdure" },
  { id: "i11", nome: "Nuggets", unit: "pz", costo: 0.20, catId: "fritti_base" },
  { id: "i12", nome: "Patatine", unit: "kg", costo: 3.00, catId: "fritti_base" },
  { id: "i13", nome: "Panelle", unit: "kg", costo: 7.00, catId: "fritti_base" },
  { id: "i14", nome: "Crocchette di Patate", unit: "pz", costo: 0.06, catId: "fritti_base" },
  { id: "i15", nome: "Bufala", unit: "pz", costo: 1.20, catId: "formaggi" },
  { id: "i16", nome: "Gorgonzola", unit: "kg", costo: 10.00, catId: "formaggi" },
  { id: "i17", nome: "Brie", unit: "kg", costo: 10.00, catId: "formaggi" },
  { id: "i18", nome: "Grana", unit: "kg", costo: 16.00, catId: "formaggi" },
  { id: "i19", nome: "Burrata", unit: "kg", costo: 10.00, catId: "formaggi" },
  { id: "i20", nome: "Datterini", unit: "kg", costo: 3.50, catId: "verdure" },
  { id: "i21", nome: "Zucchine", unit: "kg", costo: 5.00, catId: "verdure" },
  { id: "i22", nome: "Melanzane", unit: "kg", costo: 5.00, catId: "verdure" },
  { id: "i23", nome: "Rucola", unit: "kg", costo: 16.00, catId: "verdure" },
  { id: "i24", nome: "Spianata", unit: "kg", costo: 10.48, catId: "carni_salumi" },
  { id: "i25", nome: "Cotto", unit: "kg", costo: 10.48, catId: "carni_salumi" },
  { id: "i26", nome: "Crudo", unit: "kg", costo: 17.00, catId: "carni_salumi" },
  { id: "i27", nome: "Bresaola", unit: "kg", costo: 35.00, catId: "carni_salumi" },
  { id: "i28", nome: "Mortadella", unit: "kg", costo: 10.00, catId: "carni_salumi" },
  { id: "i29", nome: "Speck", unit: "kg", costo: 20.00, catId: "carni_salumi" },
  { id: "i30", nome: "Nduja", unit: "kg", costo: 10.00, catId: "carni_salumi" },
  { id: "i31", nome: "Wurstel", unit: "kg", costo: 10.00, catId: "carni_salumi" },
];

const INIT_PRODUCTS = [
  { id: "p01", name: "Margherita", catId: "pizza", emoji: "🍕", priceIva: 5.50,
    ingredienti: [{ nome: "Cartone Pizza", qty: 1, unit: "pz" }, { nome: "Panetto Pizza", qty: 1, unit: "pz" },
      { nome: "Mozzarella", qty: 0.08, unit: "kg" }, { nome: "Salsa di Pomodoro", qty: 0.09, unit: "kg" },
      { nome: "Olio EVO", qty: 0.0012, unit: "L" }, { nome: "Basilico", qty: 0.0005, unit: "kg" }] },
  { id: "p02", name: "Nuggets x6", catId: "fritto", emoji: "🍗", priceIva: 4.50,
    ingredienti: [{ nome: "Cartone Fritto Piccolo", qty: 1, unit: "pz" }, { nome: "Nuggets", qty: 6, unit: "pz" }] },
  { id: "p03", name: "Nuggets x10", catId: "fritto", emoji: "🍗", priceIva: 6.70,
    ingredienti: [{ nome: "Cartone Fritto Grande", qty: 1, unit: "pz" }, { nome: "Nuggets", qty: 10, unit: "pz" }] },
  { id: "p04", name: "Panelle 120g", catId: "fritto", emoji: "🥙", priceIva: 4.00,
    ingredienti: [{ nome: "Cartone Fritto Piccolo", qty: 1, unit: "pz" }, { nome: "Panelle", qty: 0.12, unit: "kg" }] },
  { id: "p05", name: "Gran Mix Sforno", catId: "fritto", emoji: "🎁", priceIva: 7.70,
    ingredienti: [{ nome: "Cartone Fritto Mix", qty: 1, unit: "pz" }, { nome: "Patatine", qty: 0.20, unit: "kg" },
      { nome: "Panelle", qty: 0.052, unit: "kg" }, { nome: "Crocchette di Patate", qty: 5, unit: "pz" }, { nome: "Nuggets", qty: 3, unit: "pz" }] },
  { id: "p06", name: "Patatine 150g", catId: "fritto", emoji: "🍟", priceIva: 2.70,
    ingredienti: [{ nome: "Cartone Fritto Piccolo", qty: 1, unit: "pz" }, { nome: "Patatine", qty: 0.15, unit: "kg" }] },
  { id: "p07", name: "Patatine 300g", catId: "fritto", emoji: "🍟", priceIva: 4.00,
    ingredienti: [{ nome: "Cartone Fritto Grande", qty: 1, unit: "pz" }, { nome: "Patatine", qty: 0.30, unit: "kg" }] },
  { id: "p08", name: "Crocchette x4", catId: "fritto", emoji: "🟡", priceIva: 2.20,
    ingredienti: [{ nome: "Cartone Fritto Piccolo", qty: 1, unit: "pz" }, { nome: "Crocchette di Patate", qty: 4, unit: "pz" }] },
  { id: "p09", name: "Crocchette x10", catId: "fritto", emoji: "🟡", priceIva: 3.70,
    ingredienti: [{ nome: "Cartone Fritto Grande", qty: 1, unit: "pz" }, { nome: "Crocchette di Patate", qty: 10, unit: "pz" }] },
];

// ─── CALCULATION ────────────────────────────────────────────────────────────
function calcProduct(p, ingredienti) {
  const priceNoIva = noIva(p.priceIva || 0);
  const costoTotale = (p.ingredienti || []).reduce((sum, ing) => {
    const f = ingredienti.find(x => x.nome === ing.nome);
    return sum + (f ? f.costo * Number(ing.qty) : 0);
  }, 0);
  const foodCost = priceNoIva > 0 ? (costoTotale / priceNoIva) * 100 : 0;
  return { ...p, priceNoIva, costoTotale, foodCost, ricavoNetto: priceNoIva - costoTotale };
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const INP = {
  background: "#2A1008", border: "1px solid #3A1A08", borderRadius: 8, color: "#E8D5B0",
  fontFamily: "inherit", fontSize: 14, padding: "8px 12px", width: "100%", outline: "none", boxSizing: "border-box",
};
const LBL = { fontSize: 11, color: "#ffffff88", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
const BTN_A = { background: "#D4963A", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, color: "#0F0600" };
const BTN_G = { background: "#ffffff10", border: "none", color: "#E8D5B0", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 };
const BTN_RED = { background: "#8B250022", border: "1px solid #8B250066", color: "#FF7070", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 };
const UNITS = ["pz", "kg", "L", "g", "ml"];
const SLOT_COLORS = ["#D4963A", "#5BA4CF", "#A78BFA", "#F472B6"];
const FC_SEGMENTS = [
  { name: "Ottimo (≤22%)",       color: "#3D7A4A", min: 0,     max: 22  },
  { name: "Buono (23–28%)",      color: "#C8A830", min: 22.01, max: 28  },
  { name: "Attenzione (29–33%)", color: "#D4600A", min: 28.01, max: 33  },
  { name: "Critico (>33%)",      color: "#8B2500", min: 33.01, max: 999 },
];

// ─── SAVE STATUS INDICATOR ───────────────────────────────────────────────────
function SaveStatus({ status }) {
  const cfg = {
    idle:    { color: "#ffffff33", text: "Dati sincronizzati" },
    saving:  { color: C.amber,     text: "Salvataggio…" },
    saved:   { color: C.green,     text: "✓ Salvato" },
    error:   { color: C.red,       text: "⚠ Errore salvataggio" },
    loading: { color: C.amber,     text: "Caricamento…" },
  };
  const { color, text } = cfg[status] || cfg.idle;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color }}>
      {status === "saving" || status === "loading"
        ? <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, animation: "pulse 1s infinite" }} />
        : <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />}
      {text}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </div>
  );
}

// ─── ATOMS ──────────────────────────────────────────────────────────────────
function FcBadge({ value }) {
  const col = fcColor(value);
  return (
    <span style={{ background: col + "22", color: col, border: `1px solid ${col}55`, borderRadius: 6,
      padding: "2px 9px", fontSize: 12, fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap" }}>
      {pct(value)}
    </span>
  );
}
function FcBar({ value, max = 40 }) {
  const col = fcColor(value);
  return (
    <div style={{ background: "#ffffff15", borderRadius: 4, height: 8, width: "100%", overflow: "hidden" }}>
      <div style={{ background: col, width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: 4, transition: "width .4s" }} />
    </div>
  );
}
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#ffffff44", fontSize: 13 }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Cerca…"}
        style={{ ...INP, paddingLeft: 32, fontSize: 13 }} />
    </div>
  );
}

// ─── MODAL ──────────────────────────────────────────────────────────────────
function Modal({ children, onClose, maxWidth = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000e8", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.panel, border: `1px solid ${C.amber}`, borderRadius: 16,
        padding: 28, width: "100%", maxWidth, maxHeight: "92vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
function MHdr({ title, onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: C.amber }}>{title}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff66", fontSize: 22, cursor: "pointer" }}>✕</button>
    </div>
  );
}
function CalcPreview({ costo, priceIva, style }) {
  const px = parseFloat(priceIva);
  if (!px || px <= 0 || costo <= 0) return null;
  const pxNI = noIva(px), fc = (costo / pxNI) * 100, ricavo = pxNI - costo;
  return (
    <div style={{ background: "#ffffff08", border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "12px 16px", display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 10, ...style }}>
      {[["Costo", eur(costo), C.mid], ["Food Cost", pct(fc), fcColor(fc)], ["Ricavo Netto", eur(ricavo), C.amber]].map(([l, v, col]) => (
        <div key={l} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#ffffff55", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{l}</div>
          <div style={{ fontSize: l === "Food Cost" ? 20 : 16, fontWeight: 700, color: col, fontFamily: "monospace" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ─── INGR RIGHE ─────────────────────────────────────────────────────────────
function IngrRighe({ righe, ingredientiBase, onChange }) {
  const add = () => onChange([...righe, { nome: "", qty: "" }]);
  const rem = i => onChange(righe.filter((_, j) => j !== i));
  const upd = (i, f, v) => onChange(righe.map((r, j) => j === i ? { ...r, [f]: v } : r));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ ...LBL, margin: 0 }}>Ingredienti</label>
        <button onClick={add} style={{ ...BTN_G, fontSize: 12, padding: "5px 14px", border: `1px solid ${C.amber}44`, color: C.amber }}>+ Aggiungi</button>
      </div>
      {righe.map((r, i) => {
        const f = ingredientiBase.find(x => x.nome === r.nome);
        const cr = f && r.qty ? f.costo * parseFloat(r.qty) : 0;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 56px 28px", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <select value={r.nome} onChange={e => upd(i, "nome", e.target.value)} style={{ ...INP, cursor: "pointer" }}>
              <option value="">scegli ingrediente</option>
              {ingredientiBase.map(ing => <option key={ing.id} value={ing.nome}>{ing.nome} ({ing.unit}) — {eur(ing.costo)}</option>)}
            </select>
            <input style={{ ...INP, textAlign: "right" }} type="number" step="0.001" min="0"
              placeholder={f?.unit ?? "qty"} value={r.qty} onChange={e => upd(i, "qty", e.target.value)} />
            <span style={{ fontSize: 11, color: C.amber, fontFamily: "monospace", textAlign: "right" }}>{cr > 0 ? eur(cr) : ""}</span>
            <button onClick={() => rem(i)} style={{ background: "none", border: "none", color: "#ffffff44", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── MODAL CATEGORIES ───────────────────────────────────────────────────────
function ModalCategories({ type, categories, onSave, onClose }) {
  const [cats, setCats] = useState(categories.map(c => ({ ...c })));
  const [newName, setNewName] = useState(""), [newEmoji, setNewEmoji] = useState(""), [err, setErr] = useState("");
  const isRecipe = type === "recipe";
  const addCat = () => {
    if (!newName.trim()) return setErr("Nome obbligatorio.");
    setCats(p => [...p, { id: newName.toLowerCase().replace(/\s+/g, "_") + uid(), name: newName.trim(), emoji: newEmoji.trim() || "🏷️" }]);
    setNewName(""); setNewEmoji(""); setErr("");
  };
  const remCat = id => {
    if (isRecipe && id === "combo") return setErr("'combo' non può essere rimossa.");
    setCats(p => p.filter(c => c.id !== id));
  };
  return (
    <Modal onClose={onClose} maxWidth={480}>
      <MHdr title={`Categorie ${isRecipe ? "ricette" : "ingredienti"}`} onClose={onClose} />
      {cats.map(c => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#ffffff08", borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.border}`, marginBottom: 8 }}>
          <span style={{ fontSize: 18, width: 28 }}>{c.emoji}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</span>
          <button onClick={() => remCat(c.id)} style={BTN_RED}>Rimuovi</button>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Nuova categoria</div>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={LBL}>Emoji</label><input style={INP} value={newEmoji} onChange={e => setNewEmoji(e.target.value)} placeholder="🏷️" /></div>
          <div><label style={LBL}>Nome</label><input style={INP} value={newName} onChange={e => setNewName(e.target.value)} placeholder="es. Antipasti" onKeyDown={e => e.key === "Enter" && addCat()} /></div>
        </div>
        <button onClick={addCat} style={{ ...BTN_G, border: `1px solid ${C.amber}44`, color: C.amber, fontSize: 12 }}>+ Aggiungi</button>
        {err && <div style={{ color: "#FF7070", fontSize: 12, marginTop: 8 }}>⚠ {err}</div>}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={BTN_G}>Annulla</button>
        <button onClick={() => onSave(cats)} style={BTN_A}>Salva</button>
      </div>
    </Modal>
  );
}

// ─── MODAL RICETTA ──────────────────────────────────────────────────────────
function ModalRicetta({ ingredientiBase, recipeCats, onSave, onClose }) {
  const [name, setName] = useState(""), [catId, setCatId] = useState(recipeCats.filter(c => c.id !== "combo")[0]?.id || "pizza");
  const [priceIva, setPriceIva] = useState(""), [righe, setRighe] = useState([{ nome: "", qty: "" }]), [err, setErr] = useState("");
  const nonComboCats = recipeCats.filter(c => c.id !== "combo");
  const totCosto = righe.reduce((s, r) => { const f = ingredientiBase.find(x => x.nome === r.nome); return s + (f && r.qty ? f.costo * parseFloat(r.qty) : 0); }, 0);
  const save = () => {
    if (!name.trim()) return setErr("Inserisci il nome.");
    const px = parseFloat(priceIva); if (!px || px <= 0) return setErr("Prezzo non valido.");
    const validi = righe.filter(r => r.nome && r.qty && parseFloat(r.qty) > 0);
    if (!validi.length) return setErr("Aggiungi almeno un ingrediente.");
    const cat = recipeCats.find(c => c.id === catId);
    onSave({ id: uid(), name: name.trim(), catId, emoji: cat?.emoji ?? "📦", priceIva: px,
      ingredienti: validi.map(r => ({ nome: r.nome, qty: parseFloat(r.qty), unit: ingredientiBase.find(x => x.nome === r.nome)?.unit ?? "pz" })) });
  };
  return (
    <Modal onClose={onClose}>
      <MHdr title="+ Nuova Ricetta" onClose={onClose} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div><label style={LBL}>Nome</label><input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="es. Bufala" /></div>
        <div><label style={LBL}>Prezzo IVA incl.</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#ffffff66" }}>€</span>
            <input style={{ ...INP, flex: 1 }} type="number" step="0.10" min="0" value={priceIva} onChange={e => setPriceIva(e.target.value)} placeholder="0.00" />
          </div></div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={LBL}>Categoria</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {nonComboCats.map(c => (
            <button key={c.id} onClick={() => setCatId(c.id)} style={{ background: catId === c.id ? C.amber : "#ffffff10", color: catId === c.id ? C.dark : C.text, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: catId === c.id ? 700 : 400 }}>{c.emoji} {c.name}</button>
          ))}
        </div>
      </div>
      <IngrRighe righe={righe} ingredientiBase={ingredientiBase} onChange={setRighe} />
      <CalcPreview costo={totCosto} priceIva={priceIva} style={{ marginTop: 14 }} />
      {err && <div style={{ color: "#FF7070", fontSize: 12, marginTop: 10, padding: "8px 12px", background: "#FF000015", borderRadius: 6 }}>⚠ {err}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 22, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={BTN_G}>Annulla</button>
        <button onClick={save} style={BTN_A}>Salva Ricetta</button>
      </div>
    </Modal>
  );
}

// ─── MODAL COMBO ────────────────────────────────────────────────────────────
function ModalCombo({ allProducts, ingredientiBase, onSave, onClose }) {
  const [name, setName] = useState(""), [priceIva, setPriceIva] = useState("");
  const [selProds, setSelProds] = useState([]), [search, setSearch] = useState(""), [err, setErr] = useState("");
  const setQty = (pid, qty) => {
    if (qty <= 0) { setSelProds(p => p.filter(x => x.productId !== pid)); return; }
    setSelProds(p => { const ex = p.find(x => x.productId === pid); if (ex) return p.map(x => x.productId === pid ? { ...x, qty } : x); return [...p, { productId: pid, qty }]; });
  };
  const getQty = pid => selProds.find(x => x.productId === pid)?.qty || 0;
  const mergedIngr = useMemo(() => {
    const m = {};
    selProds.forEach(({ productId, qty }) => {
      const p = allProducts.find(x => x.id === productId); if (!p) return;
      (p.ingredienti || []).forEach(ing => { const k = ing.nome + "|" + ing.unit; m[k] = { nome: ing.nome, unit: ing.unit, qty: (m[k]?.qty || 0) + Number(ing.qty) * qty }; });
    });
    return Object.values(m);
  }, [selProds, allProducts]);
  const totCosto = mergedIngr.reduce((s, ing) => { const f = ingredientiBase.find(x => x.nome === ing.nome); return s + (f ? f.costo * ing.qty : 0); }, 0);
  const suggestedPrice = useMemo(() => {
    const sum = selProds.reduce((s, { productId, qty }) => { const p = allProducts.find(x => x.id === productId); return s + (p ? p.priceIva * qty : 0); }, 0);
    return sum > 0 ? (sum * 0.9).toFixed(2) : "";
  }, [selProds, allProducts]);
  const prodCosts = useMemo(() => selProds.map(({ productId, qty }) => {
    const p = allProducts.find(x => x.id === productId); if (!p) return null;
    const calc = calcProduct(p, ingredientiBase);
    return { p, calc, qty, costoLinea: calc.costoTotale * qty };
  }).filter(Boolean), [selProds, allProducts, ingredientiBase]);
  const filteredProducts = allProducts.filter(p => p.catId !== "combo" && p.name.toLowerCase().includes(search.toLowerCase()));
  const save = () => {
    if (!name.trim()) return setErr("Inserisci il nome.");
    const px = parseFloat(priceIva); if (!px || px <= 0) return setErr("Prezzo non valido.");
    if (selProds.length < 1) return setErr("Aggiungi almeno un prodotto.");
    onSave({ id: uid(), name: name.trim(), catId: "combo", emoji: "🎁", priceIva: px, ingredienti: mergedIngr });
  };
  return (
    <Modal onClose={onClose} maxWidth={680}>
      <MHdr title="🎁 Nuova Combo" onClose={onClose} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={LBL}>Nome combo</label><input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="es. Pizza + Patatine" /></div>
        <div>
          <label style={LBL}>Prezzo combo (IVA incl.)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#ffffff66" }}>€</span>
            <input style={{ ...INP, flex: 1 }} type="number" step="0.10" min="0" value={priceIva} onChange={e => setPriceIva(e.target.value)} placeholder="0.00" /></div>
          {suggestedPrice && <div style={{ marginTop: 5, fontSize: 11, color: "#ffffff55" }}>Suggerito –10%: <button onClick={() => setPriceIva(suggestedPrice)} style={{ background: "none", border: "none", color: C.amber, cursor: "pointer", fontSize: 11, textDecoration: "underline", padding: 0 }}>{eur(parseFloat(suggestedPrice))}</button></div>}
        </div>
      </div>
      <CalcPreview costo={totCosto} priceIva={priceIva} style={{ marginBottom: 14 }} />
      {prodCosts.length > 0 && (
        <div style={{ background: "#ffffff06", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Prodotti in combo</div>
          {prodCosts.map(({ p, calc, qty, costoLinea }) => {
            const incidenza = totCosto > 0 ? (costoLinea / totCosto) * 100 : 0;
            return (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 10, alignItems: "center", marginBottom: 6, padding: "6px 10px", background: "#ffffff06", borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.emoji} {p.name}</span>
                <span style={{ fontSize: 12, color: "#ffffff55" }}>×{qty}</span>
                <span style={{ fontSize: 11, color: "#ffffff44" }}>sing.: <strong style={{ color: C.mid }}>{eur(calc.costoTotale)}</strong></span>
                <span style={{ fontSize: 11, color: "#ffffff44" }}>tot: <strong style={{ color: C.mid }}>{eur(costoLinea)}</strong></span>
                <span style={{ fontSize: 11, color: C.amber, fontFamily: "monospace", fontWeight: 700 }}>{pct(incidenza)}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4, fontSize: 12 }}>
            <span style={{ color: "#ffffff55" }}>Totale costo</span>
            <span style={{ color: C.mid, fontWeight: 700, fontFamily: "monospace" }}>{eur(totCosto)}</span>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={LBL}>Aggiungi prodotti</label>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca prodotto…" style={{ ...INP, marginBottom: 10 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
          {filteredProducts.map(p => {
            const calc = calcProduct(p, ingredientiBase), qty = getQty(p.id);
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#ffffff06", border: `1px solid ${qty > 0 ? C.amber : C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ flex: 1, fontSize: 13 }}>{p.emoji} {p.name}<span style={{ fontSize: 11, color: "#ffffff44", marginLeft: 8 }}>costo: {eur(calc.costoTotale)} · <FcBadge value={calc.foodCost} /></span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setQty(p.id, qty - 1)} style={{ width: 26, height: 26, background: "#ffffff15", border: "none", color: C.text, borderRadius: 6, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>−</button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: qty > 0 ? C.amber : C.text, width: 24, textAlign: "center", fontFamily: "monospace" }}>{qty}</span>
                  <button onClick={() => setQty(p.id, qty + 1)} style={{ width: 26, height: 26, background: C.amber + "33", border: `1px solid ${C.amber}55`, color: C.amber, borderRadius: 6, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {err && <div style={{ color: "#FF7070", fontSize: 12, marginTop: 8 }}>⚠ {err}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={BTN_G}>Annulla</button>
        <button onClick={save} style={BTN_A}>Salva Combo</button>
      </div>
    </Modal>
  );
}

// ─── MODAL INGREDIENTE ──────────────────────────────────────────────────────
function ModalIngrediente({ ingCats, onSave, onClose }) {
  const [nome, setNome] = useState(""), [unit, setUnit] = useState("kg"), [costo, setCosto] = useState(""), [catId, setCatId] = useState(ingCats[0]?.id || "altro"), [err, setErr] = useState("");
  const save = () => {
    if (!nome.trim()) return setErr("Inserisci il nome.");
    const c = parseFloat(costo); if (isNaN(c) || c < 0) return setErr("Costo non valido.");
    onSave({ id: uid(), nome: nome.trim(), unit, costo: c, catId });
  };
  return (
    <Modal onClose={onClose} maxWidth={400}>
      <MHdr title="+ Nuovo Ingrediente" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={LBL}>Nome</label><input style={INP} value={nome} onChange={e => setNome(e.target.value)} placeholder="es. Stracciatella" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={LBL}>Unità</label>
            <select style={{ ...INP, cursor: "pointer" }} value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select></div>
          <div><label style={LBL}>Costo per {unit}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "#ffffff66" }}>€</span>
              <input style={{ ...INP, flex: 1 }} type="number" step="0.01" min="0" value={costo} onChange={e => setCosto(e.target.value)} placeholder="0.00" /></div></div>
        </div>
        <div><label style={LBL}>Categoria</label>
          <select style={{ ...INP, cursor: "pointer" }} value={catId} onChange={e => setCatId(e.target.value)}>
            {ingCats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select></div>
      </div>
      {err && <div style={{ color: "#FF7070", fontSize: 12, marginTop: 10 }}>⚠ {err}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 22, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={BTN_G}>Annulla</button>
        <button onClick={save} style={BTN_A}>Salva</button>
      </div>
    </Modal>
  );
}

// ─── MODAL DETTAGLIO INGREDIENTE ────────────────────────────────────────────
function ModalIngredientDetail({ detailData, recipeCats, ingCats, onClose }) {
  const { ingredient, recipes } = detailData;
  const [catFilter, setCatFilter] = useState("tutti");
  const allCats = ["tutti", ...new Set(recipes.map(r => r.catId))];
  const filtered = catFilter === "tutti" ? recipes : recipes.filter(r => r.catId === catFilter);
  const ingCat = ingCats.find(c => c.id === ingredient.catId);
  return (
    <Modal onClose={onClose} maxWidth={640}>
      <MHdr title={`Ricette che usano: ${ingredient.nome}`} onClose={onClose} />
      <div style={{ background: "#ffffff08", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[["Categoria", `${ingCat?.emoji} ${ingCat?.name ?? "—"}`, C.amber], ["Costo unitario", `${eur(ingredient.costo)} / ${ingredient.unit}`, C.ivory], ["Usato in", `${recipes.length} ricett${recipes.length === 1 ? "a" : "e"}`, recipes.length === 1 ? C.red : C.green]].map(([l, v, col]) => (
          <div key={l}><div style={{ fontSize: 10, color: "#ffffff44", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "monospace" }}>{v}</div></div>
        ))}
      </div>
      {allCats.length > 2 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {allCats.map(c => { const cat = recipeCats.find(x => x.id === c); return <button key={c} onClick={() => setCatFilter(c)} style={{ background: catFilter === c ? C.amber : "#ffffff10", color: catFilter === c ? C.dark : C.text, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: catFilter === c ? 700 : 400 }}>{c === "tutti" ? "Tutte" : `${cat?.emoji ?? ""} ${cat?.name ?? c}`}</button>; })}
      </div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(p => {
          const ingUsed = (p.ingredienti || []).find(i => i.nome === ingredient.nome);
          const costoIng = ingUsed ? ingredient.costo * Number(ingUsed.qty) : 0;
          const incidenza = p.costoTotale > 0 ? (costoIng / p.costoTotale) * 100 : 0;
          return (
            <div key={p.id} style={{ background: "#ffffff08", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 22 }}>{p.emoji}</span><div><div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div><div style={{ fontSize: 11, color: "#ffffff44" }}>{p.catId}</div></div></div>
                <FcBadge value={p.foodCost} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {[["Quantità", ingUsed ? `${ingUsed.qty} ${ingUsed.unit}` : "—", C.ivory], ["Costo in ricetta", eur(costoIng), C.mid], ["% sul costo", pct(incidenza), C.amber]].map(([l, v, col]) => (
                  <div key={l} style={{ textAlign: "center", background: "#ffffff06", padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "#ffffff44", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: col, fontFamily: "monospace" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── MODAL SEGMENTO FC ───────────────────────────────────────────────────────
function ModalSegmentDetail({ segment, products, recipeCats, onClose }) {
  const [filter, setFilter] = useState("tutti");
  const cats = ["tutti", ...new Set(products.map(p => p.catId))];
  const filtered = filter === "tutti" ? products : products.filter(p => p.catId === filter);
  return (
    <Modal onClose={onClose} maxWidth={640}>
      <MHdr title={`Dettaglio: ${segment.name}`} onClose={onClose} />
      <div style={{ background: segment.color + "22", border: `1px solid ${segment.color}55`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: segment.color }} />
        <span style={{ fontSize: 13, color: C.text }}>{products.length} prodott{products.length === 1 ? "o" : "i"} in questa fascia</span>
      </div>
      {cats.length > 2 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {cats.map(c => { const cat = recipeCats.find(x => x.id === c); return <button key={c} onClick={() => setFilter(c)} style={{ background: filter === c ? C.amber : "#ffffff10", color: filter === c ? C.dark : C.text, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: filter === c ? 700 : 400 }}>{c === "tutti" ? "Tutti" : `${cat?.emoji ?? ""} ${cat?.name ?? c}`}</button>; })}
      </div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff08", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 20 }}>{p.emoji}</span><div><div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div><div style={{ fontSize: 11, color: "#ffffff44" }}>{p.catId}</div></div></div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "#ffffff44", textTransform: "uppercase" }}>Costo</div><div style={{ fontSize: 13, fontWeight: 700, color: C.mid, fontFamily: "monospace" }}>{eur(p.costoTotale)}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "#ffffff44", textTransform: "uppercase" }}>Ricavo</div><div style={{ fontSize: 13, fontWeight: 700, color: C.amber, fontFamily: "monospace" }}>{eur(p.ricavoNetto)}</div></div>
              <FcBadge value={p.foodCost} />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── SLOT CONFRONTO ──────────────────────────────────────────────────────────
function ConfrSlot({ idx, productId, allProducts, ingredientiBase, onSetProduct, onRemove, canRemove }) {
  const [mode, setMode] = useState(productId ? "existing" : "custom");
  const [cName, setCName] = useState(""), [cPrice, setCPrice] = useState(""), [cRighe, setCRighe] = useState([{ nome: "", qty: "" }]);
  const col = SLOT_COLORS[idx % 4];
  const existCalc = useMemo(() => { if (mode !== "existing" || !productId) return null; return allProducts.find(x => x.id === productId) || null; }, [mode, productId, allProducts]);
  const cc = cRighe.reduce((s, r) => { const f = ingredientiBase.find(x => x.nome === r.nome); return s + (f && r.qty ? f.costo * parseFloat(r.qty) : 0); }, 0);
  const cpNI = noIva(parseFloat(cPrice) || 0), cFC = cpNI > 0 ? (cc / cpNI) * 100 : 0;
  const displayCalc = mode === "existing" ? existCalc : (parseFloat(cPrice) > 0 ? { name: cName || `Ipotetica ${idx + 1}`, emoji: "✏️", priceIva: parseFloat(cPrice), priceNoIva: cpNI, costoTotale: cc, foodCost: cFC, ricavoNetto: cpNI - cc } : null);
  return (
    <div style={{ flex: "1 1 260px", minWidth: 0, background: C.panel, border: `2px solid ${col}44`, borderRadius: 12, padding: 20, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: col, textTransform: "uppercase", letterSpacing: 2 }}>Ricetta {idx + 1}</span>
        {canRemove && <button onClick={() => onRemove(idx)} style={{ background: "none", border: "none", color: "#ffffff33", fontSize: 16, cursor: "pointer" }}>✕</button>}
      </div>
      <div style={{ display: "flex", marginBottom: 14, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
        {[["existing", "Esistente"], ["custom", "Personalizzata"]].map(([m, l]) => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, background: mode === m ? col + "33" : "transparent", color: mode === m ? col : "#ffffff44", border: "none", padding: "7px 0", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: mode === m ? 700 : 400, borderRight: m === "existing" ? `1px solid ${C.border}` : "none" }}>{l}</button>
        ))}
      </div>
      {mode === "existing" ? (
        <div><label style={LBL}>Seleziona ricetta</label>
          <select value={productId || ""} onChange={e => onSetProduct(e.target.value || null)} style={{ ...INP, cursor: "pointer" }}>
            <option value="">-- scegli --</option>
            {allProducts.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name} ({eur(p.priceIva)})</option>)}
          </select></div>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div><label style={LBL}>Nome</label><input style={INP} value={cName} onChange={e => setCName(e.target.value)} placeholder="Ipotetica" /></div>
            <div><label style={LBL}>Prezzo IVA</label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#ffffff66", fontSize: 12 }}>€</span>
                <input style={{ ...INP, flex: 1 }} type="number" step="0.10" min="0" value={cPrice} onChange={e => setCPrice(e.target.value)} placeholder="0.00" /></div></div>
          </div>
          <IngrRighe righe={cRighe} ingredientiBase={ingredientiBase} onChange={setCRighe} />
        </div>
      )}
      {displayCalc && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: fcColor(displayCalc.foodCost), marginBottom: 6 }}>{pct(displayCalc.foodCost)}</div>
          <FcBar value={displayCalc.foodCost} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {[["Prezzo", eur(displayCalc.priceIva || 0)], ["No IVA", eur(displayCalc.priceNoIva || 0)], ["Costo", eur(displayCalc.costoTotale || 0)], ["Margine", eur(displayCalc.ricavoNetto || 0)]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 10, color: "#ffffff44", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: C.panel, border: `1px solid ${d.payload.color}`, borderRadius: 8, padding: "8px 14px", fontSize: 12 }}>
      <div style={{ color: C.text, fontWeight: 700 }}>{d.payload.name}</div>
      <div style={{ color: d.payload.color, fontFamily: "monospace", fontSize: 14, fontWeight: 700, marginTop: 2 }}>{d.value} prodott{d.value === 1 ? "o" : "i"}</div>
      <div style={{ color: "#ffffff44", fontSize: 11, marginTop: 2 }}>Clicca per dettaglio</div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
const TABS = ["Dashboard", "Ricette", "Confronto", "Ingredienti"];

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [rawProducts, setRawProducts] = useState(INIT_PRODUCTS);
  const [ingredienti, setIngredienti] = useState(INIT_INGREDIENTI);
  const [recipeCats, setRecipeCats] = useState(DEFAULT_RECIPE_CATS);
  const [ingCats, setIngCats] = useState(DEFAULT_ING_CATS);
  const [selected, setSelected] = useState(null);
  const [catFilter, setCatFilter] = useState("tutti");
  const [sortBy, setSortBy] = useState("foodCost");
  const [activeCats, setActiveCats] = useState(() => new Set(INIT_PRODUCTS.map(p => p.catId)));
  const [searchRicette, setSearchRicette] = useState("");
  const [searchIngredienti, setSearchIngredienti] = useState("");
  const [ingCatFilter, setIngCatFilter] = useState("tutti");
  const [revCatFilter, setRevCatFilter] = useState("tutti");
  const [showR, setShowR] = useState(false), [showC, setShowC] = useState(false), [showI, setShowI] = useState(false);
  const [showCatR, setShowCatR] = useState(false), [showCatI, setShowCatI] = useState(false);
  const [showDetail, setShowDetail] = useState(false), [detailIng, setDetailIng] = useState(null);
  const [showSeg, setShowSeg] = useState(false), [segData, setSegData] = useState(null);
  const [slots, setSlots] = useState([{ productId: "p01" }, { productId: "p06" }]);

  // ── GITHUB PERSISTENCE ─────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState("loading");
  const shaRef = useRef(null);
  const saveTimerRef = useRef(null);
  const isFirstLoad = useRef(true);

  // Load on mount
  useEffect(() => {
    ghLoad()
      .then(({ data, sha }) => {
        shaRef.current = sha;
        // Only override defaults if GitHub has real data
        if (data.products?.length)    setRawProducts(data.products);
        if (data.ingredienti?.length) setIngredienti(data.ingredienti);
        if (data.recipeCats?.length)  setRecipeCats(data.recipeCats);
        if (data.ingCats?.length)     setIngCats(data.ingCats);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      })
      .catch(err => {
        console.warn("GitHub load failed, using defaults:", err.message);
        setSaveStatus("idle");
      })
      .finally(() => { isFirstLoad.current = false; });
  }, []);

  // Auto-save with 3s debounce after any data change
  const scheduleAutosave = useCallback((products, ingredienti, recipeCats, ingCats) => {
    if (isFirstLoad.current) return;
    clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        const newSha = await ghSave({ products, ingredienti, recipeCats, ingCats }, shaRef.current);
        shaRef.current = newSha;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch (err) {
        console.error("GitHub save failed:", err.message);
        setSaveStatus("error");
      }
    }, 3000);
  }, []);

  useEffect(() => { if (!isFirstLoad.current) scheduleAutosave(rawProducts, ingredienti, recipeCats, ingCats); }, [rawProducts, ingredienti, recipeCats, ingCats]);

  // ── CALCOLI ────────────────────────────────────────────────────────────────
  const products = useMemo(() => rawProducts.map(p => calcProduct(p, ingredienti)), [rawProducts, ingredienti]);
  const ingredientUsage = useMemo(() => { const map = new Map(); rawProducts.forEach(p => (p.ingredienti || []).forEach(ing => map.set(ing.nome, (map.get(ing.nome) || 0) + 1))); return map; }, [rawProducts]);
  const singleUseIngs = useMemo(() => ingredienti.filter(ing => (ingredientUsage.get(ing.nome) || 0) === 1).map(ing => ({ ...ing, usedIn: rawProducts.find(p => (p.ingredienti || []).some(i => i.nome === ing.nome))?.name || "?" })), [ingredienti, ingredientUsage, rawProducts]);
  const filteredForAvg = products.filter(p => activeCats.has(p.catId));
  const avgFC = filteredForAvg.length ? filteredForAvg.reduce((s, p) => s + p.foodCost, 0) / filteredForAvg.length : 0;
  const allExistingCats = [...new Set(rawProducts.map(p => p.catId))];
  const filtered = products.filter(p => (catFilter === "tutti" || p.catId === catFilter) && p.name.toLowerCase().includes(searchRicette.toLowerCase())).sort((a, b) => sortBy === "foodCost" ? a.foodCost - b.foodCost : sortBy === "ricavo" ? b.ricavoNetto - a.ricavoNetto : sortBy === "prezzo" ? b.priceIva - a.priceIva : a.name.localeCompare(b.name));
  const filteredIng = ingredienti.filter(i => (ingCatFilter === "tutti" || i.catId === ingCatFilter) && i.nome.toLowerCase().includes(searchIngredienti.toLowerCase()));
  const ingCatCounts = useMemo(() => { const m = {}; ingredienti.forEach(i => { const c = i.catId || "altro"; m[c] = (m[c] || 0) + 1; }); return m; }, [ingredienti]);
  const pieData = FC_SEGMENTS.map(seg => ({ ...seg, value: products.filter(p => p.foodCost >= seg.min && p.foodCost <= seg.max).length, prods: products.filter(p => p.foodCost >= seg.min && p.foodCost <= seg.max) })).filter(d => d.value > 0);
  const revProducts = revCatFilter === "tutti" ? products : products.filter(p => p.catId === revCatFilter);
  const getCat = id => recipeCats.find(c => c.id === id);
  const getIngCat = id => ingCats.find(c => c.id === id);
  const toggleCat = cat => setActiveCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  const showIngredientDetail = ing => { const recipes = rawProducts.filter(p => (p.ingredienti || []).some(i => i.nome === ing.nome)).map(p => calcProduct(p, ingredienti)); setDetailIng({ ingredient: ing, recipes }); setShowDetail(true); };
  const addSlot = () => { if (slots.length < 4) setSlots(s => [...s, { productId: null }]); };
  const removeSlot = i => setSlots(s => s.filter((_, j) => j !== i));
  const setSlotProduct = (i, pid) => setSlots(s => s.map((sl, j) => j === i ? { ...sl, productId: pid } : sl));
  const readyCalcs = slots.map(sl => sl.productId ? products.find(x => x.id === sl.productId) : null).filter(Boolean).filter(c => c.priceIva > 0);

  return (
    <div style={{ minHeight: "100vh", background: C.dark, fontFamily: "'Georgia', serif", color: C.text }}>
      {showR && <ModalRicetta ingredientiBase={ingredienti} recipeCats={recipeCats} onSave={d => { setRawProducts(p => [...p, d]); setShowR(false); }} onClose={() => setShowR(false)} />}
      {showC && <ModalCombo allProducts={products} ingredientiBase={ingredienti} onSave={d => { setRawProducts(p => [...p, d]); setShowC(false); }} onClose={() => setShowC(false)} />}
      {showI && <ModalIngrediente ingCats={ingCats} onSave={d => { setIngredienti(p => [...p, d]); setShowI(false); }} onClose={() => setShowI(false)} />}
      {showCatR && <ModalCategories type="recipe" categories={recipeCats} onSave={c => { setRecipeCats(c); setShowCatR(false); }} onClose={() => setShowCatR(false)} />}
      {showCatI && <ModalCategories type="ingredient" categories={ingCats} onSave={c => { setIngCats(c); setShowCatI(false); }} onClose={() => setShowCatI(false)} />}
      {showDetail && detailIng && <ModalIngredientDetail detailData={detailIng} recipeCats={recipeCats} ingCats={ingCats} onClose={() => setShowDetail(false)} />}
      {showSeg && segData && <ModalSegmentDetail segment={segData} products={segData.prods} recipeCats={recipeCats} onClose={() => setShowSeg(false)} />}

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg,${C.red} 0%,#4A1000 100%)`, padding: "24px 32px 0", borderBottom: `3px solid ${C.amber}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, background: C.amber, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔥</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2 }}><span style={{ color: C.amber }}>S</span><span style={{ color: C.ivory }}>forno</span></div>
            <div style={{ fontSize: 11, color: "#ffffff88", letterSpacing: 3, textTransform: "uppercase" }}>Food Cost Dashboard</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <SaveStatus status={saveStatus} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#ffffff66", textTransform: "uppercase", letterSpacing: 2 }}>FC Medio {filteredForAvg.length < products.length ? "(filtrato)" : ""}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: fcColor(avgFC) }}>{pct(avgFC)}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? C.ivory : "transparent", color: tab === t ? C.dark : "#ffffff99", border: "none", padding: "10px 22px", borderRadius: "8px 8px 0 0", cursor: "pointer", fontFamily: "inherit", fontWeight: tab === t ? 700 : 400, fontSize: 13 }}>{t}</button>)}
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {tab === "Dashboard" && (
          <div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Categorie nel FC Medio</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {allExistingCats.map(catId => {
                  const on = activeCats.has(catId), cat = getCat(catId);
                  const cp = products.filter(p => p.catId === catId), avg = cp.length ? cp.reduce((s, p) => s + p.foodCost, 0) / cp.length : 0;
                  return <button key={catId} onClick={() => toggleCat(catId)} style={{ background: on ? fcColor(avg) + "30" : "#ffffff08", color: on ? fcColor(avg) : "#ffffff44", border: `2px solid ${on ? fcColor(avg) : "#ffffff15"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>{cat?.emoji} {cat?.name ?? catId}<span style={{ fontFamily: "monospace", fontSize: 10, opacity: 0.75 }}>({pct(avg)})</span></button>;
                })}
                <button onClick={() => setActiveCats(new Set(allExistingCats))} style={{ ...BTN_G, fontSize: 11, padding: "7px 14px", border: `1px solid ${C.border}` }}>Tutti</button>
                <button onClick={() => setActiveCats(new Set())} style={{ ...BTN_G, fontSize: 11, padding: "7px 14px", border: `1px solid ${C.border}` }}>Nessuno</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Food Cost Medio", value: pct(avgFC), color: fcColor(avgFC), sub: `${filteredForAvg.length}/${products.length} prodotti` },
                { label: "Miglior Margine", value: [...products].sort((a, b) => a.foodCost - b.foodCost)[0]?.name ?? "—", color: C.green, sub: `FC ${pct([...products].sort((a, b) => a.foodCost - b.foodCost)[0]?.foodCost ?? 0)}` },
                { label: "Da Monitorare", value: [...products].sort((a, b) => b.foodCost - a.foodCost)[0]?.name ?? "—", color: C.red, sub: `FC ${pct([...products].sort((a, b) => b.foodCost - a.foodCost)[0]?.foodCost ?? 0)}` },
              ].map(k => <div key={k.label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}><div style={{ fontSize: 11, color: "#ffffff55", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{k.label}</div><div style={{ fontSize: 22, fontWeight: 900, color: k.color, marginBottom: 4 }}>{k.value}</div><div style={{ fontSize: 11, color: "#ffffff44" }}>{k.sub}</div></div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20, marginBottom: 28 }}>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, color: C.amber, marginBottom: 16, fontWeight: 700, letterSpacing: 1 }}>FOOD COST PER PRODOTTO</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[...products].sort((a, b) => a.foodCost - b.foodCost)} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="name" tick={{ fill: "#ffffff66", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#ffffff55", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 45]} />
                    <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.amber}`, borderRadius: 8, color: C.text }} formatter={v => [pct(v), "Food Cost"]} />
                    <Bar dataKey="foodCost" radius={[4, 4, 0, 0]}>{[...products].sort((a, b) => a.foodCost - b.foodCost).map(p => <Cell key={p.id} fill={fcColor(p.foodCost)} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, color: C.amber, marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>DISTRIBUZIONE FC</div>
                <div style={{ fontSize: 11, color: "#ffffff55", marginBottom: 12 }}>Clicca un segmento per il dettaglio</div>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3} onClick={d => { if (d?.prods?.length) { setSegData(d); setShowSeg(true); } }} style={{ cursor: "pointer" }}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {pieData.map(d => <div key={d.name} onClick={() => { setSegData(d); setShowSeg(true); }} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "5px 8px", borderRadius: 6, background: "#ffffff05", border: `1px solid ${C.border}` }}><div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} /><span style={{ fontSize: 12, color: C.text, flex: 1 }}>{d.name}</span><span style={{ fontSize: 13, fontWeight: 700, color: d.color, fontFamily: "monospace" }}>{d.value}</span></div>)}
                </div>
              </div>
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: C.amber, fontWeight: 700, letterSpacing: 1 }}>RICAVI NETTI (€ no IVA)</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["tutti", ...allExistingCats].map(c => { const cat = getCat(c); return <button key={c} onClick={() => setRevCatFilter(c)} style={{ background: revCatFilter === c ? C.amber : "#ffffff10", color: revCatFilter === c ? C.dark : C.text, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: revCatFilter === c ? 700 : 400 }}>{c === "tutti" ? "Tutti" : `${cat?.emoji ?? ""} ${cat?.name ?? c}`}</button>; })}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[...revProducts].sort((a, b) => b.ricavoNetto - a.ricavoNetto)} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="name" tick={{ fill: "#ffffff66", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#ffffff55", fontSize: 10 }} axisLine={false} tickLine={false} unit="€" />
                  <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.amber}`, borderRadius: 8, color: C.text }} formatter={v => [eur(v), "Ricavo Netto"]} />
                  <Bar dataKey="ricavoNetto" radius={[4, 4, 0, 0]}>{[...revProducts].sort((a, b) => b.ricavoNetto - a.ricavoNetto).map(p => <Cell key={p.id} fill={fcColor(p.foodCost)} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* RICETTE */}
        {tab === "Ricette" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <SearchBar value={searchRicette} onChange={setSearchRicette} placeholder="Cerca ricetta…" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["tutti", ...allExistingCats].map(c => { const cat = getCat(c); return <button key={c} onClick={() => setCatFilter(c)} style={{ background: catFilter === c ? C.amber : "#ffffff10", color: catFilter === c ? C.dark : C.text, border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: catFilter === c ? 700 : 400 }}>{c === "tutti" ? "Tutti" : `${cat?.emoji ?? ""} ${cat?.name ?? c}`}</button>; })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#ffffff44" }}>Ordina:</span>
              {[["foodCost", "FC"], ["ricavo", "Ricavo"], ["prezzo", "Prezzo"], ["name", "Nome"]].map(([k, l]) => <button key={k} onClick={() => setSortBy(k)} style={{ background: sortBy === k ? "#ffffff15" : "transparent", color: sortBy === k ? C.text : "#ffffff44", border: `1px solid ${sortBy === k ? "#ffffff25" : C.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>{l}</button>)}
              <button onClick={() => setShowCatR(true)} style={{ ...BTN_G, border: `1px solid ${C.border}`, fontSize: 11, padding: "6px 12px" }}>⚙ Categorie</button>
              <button onClick={() => setShowR(true)} style={{ ...BTN_G, border: `1px solid ${C.border}`, fontSize: 12 }}>+ Ricetta</button>
              <button onClick={() => setShowC(true)} style={BTN_A}>🎁 + Combo</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(285px,1fr))", gap: 16 }}>
              {filtered.map(p => {
                const cat = getCat(p.catId);
                return (
                  <div key={p.id} onClick={() => setSelected(selected?.id === p.id ? null : p)} style={{ background: selected?.id === p.id ? "#2A1008" : C.panel, border: `1px solid ${selected?.id === p.id ? C.amber : C.border}`, borderRadius: 12, padding: 20, cursor: "pointer", position: "relative" }}>
                    <button onClick={e => { e.stopPropagation(); setRawProducts(prev => prev.filter(x => x.id !== p.id)); if (selected?.id === p.id) setSelected(null); }} style={{ position: "absolute", top: 10, right: 10, background: "#ffffff10", border: "none", color: "#ffffff55", borderRadius: 6, width: 22, height: 22, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 26 }}>{p.emoji}</span><div><div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div><div style={{ fontSize: 11, color: "#ffffff44", textTransform: "uppercase", letterSpacing: 1 }}>{cat?.emoji} {cat?.name ?? p.catId}</div></div></div>
                      <FcBadge value={p.foodCost} />
                    </div>
                    <FcBar value={p.foodCost} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                      {[["Prezzo", eur(p.priceIva)], ["Costo", eur(p.costoTotale)], ["Margine", eur(p.ricavoNetto)]].map(([l, v]) => <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "#ffffff44", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div><div style={{ fontSize: 14, fontWeight: 700, color: C.amber, marginTop: 2 }}>{v}</div></div>)}
                    </div>
                    {selected?.id === p.id && (
                      <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                        <div style={{ fontSize: 11, color: C.amber, marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>INGREDIENTI & INCIDENZA</div>
                        {(p.ingredienti || []).map((ing, i) => { const f = ingredienti.find(x => x.nome === ing.nome); const cIng = f ? f.costo * Number(ing.qty) : 0; const inc = p.costoTotale > 0 ? (cIng / p.costoTotale) * 100 : 0; return <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, alignItems: "center" }}><span style={{ color: "#ffffff88", flex: 1 }}>{ing.nome}</span><span style={{ display: "flex", gap: 10 }}><span style={{ color: "#ffffff44", fontFamily: "monospace" }}>{ing.qty} {ing.unit}</span><span style={{ color: C.mid, fontFamily: "monospace" }}>{eur(cIng)}</span><span style={{ color: "#ffffff55", fontFamily: "monospace", fontSize: 10 }}>{pct(inc)}</span></span></div>; })}
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 8, fontWeight: 700 }}>
                          <span style={{ color: C.amber }}>Totale</span>
                          <div style={{ display: "flex", gap: 12 }}><span style={{ color: C.amber, fontFamily: "monospace" }}>{eur(p.costoTotale)}</span><span style={{ color: C.amber, fontFamily: "monospace" }}>FC: {pct(p.foodCost)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONFRONTO */}
        {tab === "Confronto" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Confronto Ricette</div><div style={{ fontSize: 12, color: "#ffffff55" }}>Fino a 4 ricette — esistenti o create al volo.</div></div>
              {slots.length < 4 && <button onClick={addSlot} style={BTN_A}>+ Aggiungi slot</button>}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
              {slots.map((sl, idx) => <ConfrSlot key={idx} idx={idx} productId={sl.productId} allProducts={products} ingredientiBase={ingredienti} onSetProduct={pid => setSlotProduct(idx, pid)} onRemove={removeSlot} canRemove={slots.length > 2} />)}
            </div>
            {readyCalcs.length >= 2 ? (
              <div>
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: C.amber, marginBottom: 20, fontWeight: 700, letterSpacing: 1 }}>CONFRONTO FOOD COST %</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {slots.map((sl, idx) => { const c = sl.productId ? products.find(x => x.id === sl.productId) : null; if (!c || !c.priceIva) return null; const col = SLOT_COLORS[idx % 4]; return <div key={idx}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: col }} /><span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.emoji} {c.name}</span></div><div style={{ display: "flex", gap: 16, fontSize: 12 }}><span style={{ color: "#ffffff55" }}>Prezzo: <strong style={{ color: C.text }}>{eur(c.priceIva)}</strong></span><span style={{ color: "#ffffff55" }}>Costo: <strong style={{ color: C.mid }}>{eur(c.costoTotale)}</strong></span><span style={{ color: "#ffffff55" }}>Margine: <strong style={{ color: C.amber }}>{eur(c.ricavoNetto)}</strong></span><FcBadge value={c.foodCost} /></div></div><div style={{ background: "#ffffff10", borderRadius: 6, height: 28, overflow: "hidden", position: "relative" }}><div style={{ background: fcColor(c.foodCost), width: `${(c.foodCost / 45) * 100}%`, height: "100%", borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 10, minWidth: 40, transition: "width .5s" }}><span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{pct(c.foodCost)}</span></div><div style={{ position: "absolute", top: 0, bottom: 0, left: `${(28 / 45) * 100}%`, width: 2, background: "#ffffff40" }} /></div></div>; })}
                    <div style={{ fontSize: 11, color: "#ffffff33" }}>Linea bianca = soglia 28%</div>
                  </div>
                </div>
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.amber, fontWeight: 700, letterSpacing: 1 }}>TABELLA COMPARATIVA</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr style={{ background: "#ffffff06" }}><th style={{ padding: "10px 16px", textAlign: "left", color: "#ffffff55", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Metrica</th>{slots.map((sl, idx) => { const c = sl.productId ? products.find(x => x.id === sl.productId) : null; return <th key={idx} style={{ padding: "10px 16px", textAlign: "right", color: SLOT_COLORS[idx % 4], fontWeight: 700, fontSize: 12 }}>{c ? `${c.emoji} ${c.name}` : `Slot ${idx + 1}`}</th>; })}</tr></thead>
                      <tbody>
                        {[{ label: "Prezzo IVA", fn: c => eur(c.priceIva) }, { label: "No IVA", fn: c => eur(c.priceNoIva) }, { label: "Costo ingr.", fn: c => eur(c.costoTotale) }, { label: "Food Cost", fn: c => <FcBadge value={c.foodCost} /> }, { label: "Ricavo netto", fn: c => <span style={{ color: C.amber, fontWeight: 700, fontFamily: "monospace" }}>{eur(c.ricavoNetto)}</span> }, { label: "Margine %", fn: c => pct(100 - c.foodCost) }].map((row, ri) => <tr key={ri} style={{ borderTop: "1px solid #ffffff08", background: ri % 2 === 0 ? "transparent" : "#ffffff04" }}><td style={{ padding: "11px 16px", color: "#ffffff88", fontWeight: 600 }}>{row.label}</td>{slots.map((sl, idx) => { const c = sl.productId ? products.find(x => x.id === sl.productId) : null; return <td key={idx} style={{ padding: "11px 16px", textAlign: "right" }}>{c && c.priceIva > 0 ? row.fn(c) : <span style={{ color: "#ffffff22" }}>—</span>}</td>; })}</tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: "#ffffff44", fontSize: 14 }}>Seleziona almeno 2 ricette per vedere il confronto.</div>}
          </div>
        )}

        {/* INGREDIENTI */}
        {tab === "Ingredienti" && (
          <div>
            {singleUseIngs.length > 0 && (
              <div style={{ background: "#4A0A0A", border: "1px solid #8B2500", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#FF7070", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>⚠ {singleUseIngs.length} ingrediente{singleUseIngs.length > 1 ? "i" : ""} usato{singleUseIngs.length > 1 ? "i" : ""} in una sola ricetta</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {singleUseIngs.map(ing => <div key={ing.nome} style={{ background: "#FF000015", border: "1px solid #FF000033", borderRadius: 8, padding: "6px 12px", fontSize: 12 }}><span style={{ color: "#FFA0A0", fontWeight: 600 }}>{ing.nome}</span><span style={{ color: "#ffffff44", marginLeft: 6 }}>→ {ing.usedIn}</span></div>)}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <SearchBar value={searchIngredienti} onChange={setSearchIngredienti} placeholder="Cerca ingrediente…" />
              <button onClick={() => setShowCatI(true)} style={{ ...BTN_G, border: `1px solid ${C.border}`, fontSize: 11, padding: "8px 14px" }}>⚙ Categorie</button>
              <button onClick={() => setShowI(true)} style={BTN_A}>+ Nuovo Ingrediente</button>
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setIngCatFilter("tutti")} style={{ background: ingCatFilter === "tutti" ? C.amber : "#ffffff08", color: ingCatFilter === "tutti" ? C.dark : C.text, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: ingCatFilter === "tutti" ? 700 : 400 }}>Tutti ({ingredienti.length})</button>
                {ingCats.filter(c => ingCatCounts[c.id] > 0).map(c => <button key={c.id} onClick={() => setIngCatFilter(ingCatFilter === c.id ? "tutti" : c.id)} style={{ background: ingCatFilter === c.id ? C.amber + "33" : "#ffffff08", color: ingCatFilter === c.id ? C.amber : C.text, border: `1px solid ${ingCatFilter === c.id ? C.amber : C.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: ingCatFilter === c.id ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>{c.emoji} {c.name}<span style={{ background: "#ffffff15", borderRadius: 4, padding: "1px 6px", fontSize: 11, fontFamily: "monospace", color: "#ffffff88" }}>{ingCatCounts[c.id] || 0}</span></button>)}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px,1fr))", gap: 12 }}>
              {filteredIng.map(ing => {
                const realIdx = ingredienti.findIndex(x => x.id === ing.id), usage = ingredientUsage.get(ing.nome) || 0, isSingle = usage === 1, ingCat = getIngCat(ing.catId || "altro");
                return (
                  <div key={ing.id} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ing.nome}</span>
                        {isSingle && <span style={{ background: "#8B2500", color: "#FFA0A0", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "2px 6px", borderRadius: 4, border: "1px solid #C03A10", whiteSpace: "nowrap" }}>SOLO 1 RICETTA</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#ffffff44" }}>/{ing.unit}</span>
                        {ingCat && <span style={{ fontSize: 10, color: "#ffffff33", background: "#ffffff08", borderRadius: 4, padding: "1px 6px" }}>{ingCat.emoji} {ingCat.name}</span>}
                        <span style={{ fontSize: 11, color: usage === 0 ? "#ffffff22" : isSingle ? "#FFA0A0" : "#ffffff55" }}>{usage === 0 ? "non usato" : `${usage} ricett${usage === 1 ? "a" : "e"}`}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ color: "#ffffff44", fontSize: 12 }}>€</span>
                      <input type="number" step="0.01" min="0" value={ing.costo} onChange={e => setIngredienti(prev => prev.map((x, i) => i === realIdx ? { ...x, costo: parseFloat(e.target.value) || 0 } : x))} style={{ background: "#2A1008", border: `1px solid ${C.border}`, borderRadius: 6, color: C.amber, fontFamily: "monospace", fontSize: 14, fontWeight: 700, width: 72, padding: "6px 8px", textAlign: "right", outline: "none" }} />
                      {usage > 0 && <button onClick={() => showIngredientDetail(ing)} style={{ background: C.amber + "22", border: `1px solid ${C.amber}44`, color: C.amber, borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>→</button>}
                      <button onClick={() => setIngredienti(prev => prev.filter((_, i) => i !== realIdx))} style={{ background: "none", border: "none", color: "#ffffff33", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 24, background: `${C.amber}12`, border: `1px solid ${C.amber}35`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: C.amber, fontWeight: 700, marginBottom: 10 }}>FC attuale per prodotto</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 8 }}>
                {products.map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, alignItems: "center" }}><span style={{ color: "#ffffff88" }}>{p.emoji} {p.name}</span><FcBadge value={p.foodCost} /></div>)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "20px", color: "#ffffff22", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
        Sforno · Food Cost Dashboard v5.0
      </div>
    </div>
  );
}
