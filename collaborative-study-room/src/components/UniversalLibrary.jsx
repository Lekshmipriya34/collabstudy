import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot, getDocs,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const TYPE_ICONS  = { pdf: "📄", link: "🔗", youtube: "▶", note: "📝", image: "🖼️" };
const TYPE_LABELS = { pdf: "PDF", link: "Link", youtube: "Video", note: "Note", image: "Image" };

function UniversalLibrary() {
  const { user } = useAuth();

  const [resources,  setResources]  = useState([]);
  const [roomNames,  setRoomNames]  = useState({}); // { roomId: roomName }
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [expanded,   setExpanded]   = useState(null);

  // ── 1. Get all room IDs the user belongs to, then map roomId → name ──────
  useEffect(() => {
    if (!user?.uid) return;

    const roomsQ = query(
      collection(db, "rooms"),
      where("members", "array-contains", user.uid)
    );

    // Real-time so if user joins/leaves a room the library updates
    const unsub = onSnapshot(roomsQ, (snap) => {
      const names = {};
      snap.docs.forEach((d) => { names[d.id] = d.data().name || "Study Room"; });
      setRoomNames(names);
    });

    return () => unsub();
  }, [user]);

  // ── 2. Listen to top-level "resources" collection filtered by roomId ─────
  // Resources are stored at /resources/{id} with a roomId field —
  // matching the schema in RoomResources.jsx
  useEffect(() => {
    if (!user?.uid) return;

    const roomIds = Object.keys(roomNames);
    if (roomIds.length === 0) {
      setResources([]);
      setLoading(false);
      return;
    }

    // Firestore "in" query supports up to 30 values
    // Chunk into groups of 30 if needed
    const chunks = [];
    for (let i = 0; i < roomIds.length; i += 30) {
      chunks.push(roomIds.slice(i, i + 30));
    }

    const unsubscribers = [];
    const resourceMap   = {}; // keyed by doc id to dedupe across chunks

    const flush = () => {
      const sorted = Object.values(resourceMap).sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setResources(sorted);
      setLoading(false);
    };

    chunks.forEach((chunk) => {
      const q = query(
        collection(db, "resources"),
        where("roomId", "in", chunk)
      );
      const unsub = onSnapshot(q, (snap) => {
        snap.docs.forEach((d) => { resourceMap[d.id] = { id: d.id, ...d.data() }; });
        // Remove docs no longer in this snapshot (deleted)
        const currentIds = new Set(snap.docs.map((d) => d.id));
        Object.keys(resourceMap).forEach((id) => {
          // Only remove if it belongs to this chunk's rooms
          if (chunk.includes(resourceMap[id]?.roomId) && !currentIds.has(id)) {
            delete resourceMap[id];
          }
        });
        flush();
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [roomNames, user]);

  // ── filtered + searched list ─────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = resources;
    if (filter !== "all") list = list.filter((r) => r.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.name?.toLowerCase().includes(q) ||
        r.subject?.toLowerCase().includes(q) ||
        r.channel?.toLowerCase().includes(q) ||
        roomNames[r.roomId]?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [resources, filter, search, roomNames]);

  // ── counts per type for tab badges ──────────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: resources.length };
    resources.forEach((r) => { c[r.type] = (c[r.type] || 0) + 1; });
    return c;
  }, [resources]);

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2.5rem] shadow-xl flex flex-col overflow-hidden"
      style={{ height: 420 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
        <div>
          <h2 className="text-base font-bold tracking-widest text-[#f0abfc] uppercase">
            Universal Library
          </h2>
          <p className="text-[10px] text-purple-200/60 mt-0.5 uppercase tracking-widest">
            {loading ? "Loading…" : `${resources.length} resources across ${Object.keys(roomNames).length} rooms`}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-black/20 border border-white/15 text-white placeholder-white/30 rounded-xl pl-7 pr-3 py-1.5 text-xs outline-none focus:border-purple-400 w-36 transition-all"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-6 pb-3 flex-shrink-0 overflow-x-auto">
        {["all", "youtube", "pdf", "link", "note"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full transition ${
              filter === f
                ? "bg-purple-500 text-white"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            {f === "all" ? "All" : TYPE_ICONS[f]}
            {f === "all" ? ` (${counts.all || 0})` : ` ${TYPE_LABELS[f] || f} ${counts[f] ? `(${counts[f]})` : ""}`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-purple-200 text-xs animate-pulse font-bold tracking-widest uppercase">
              Loading library…
            </p>
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-purple-200/40">
            <span className="text-3xl">📭</span>
            <p className="text-xs font-bold uppercase tracking-widest">
              {search ? "No results found" : "Library is empty"}
            </p>
            {!search && (
              <p className="text-[10px] text-center opacity-70 max-w-[200px]">
                Add resources inside any study room and they'll appear here
              </p>
            )}
          </div>
        )}

        {!loading && displayed.map((res) => (
          <LibraryRow
            key={res.id}
            resource={res}
            roomName={roomNames[res.roomId] || "Unknown Room"}
            expanded={expanded === res.id}
            onToggle={() => setExpanded(expanded === res.id ? null : res.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LIBRARY ROW
// ─────────────────────────────────────────────────────────────
function LibraryRow({ resource: r, roomName, expanded, onToggle }) {
  const hasSummary = r.type === "youtube" && r.summary;

  return (
    <div className={`rounded-xl border transition-all ${
      expanded
        ? "bg-white/10 border-purple-400/30"
        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
    }`}>
      <div className="flex items-center gap-3 p-2.5">
        {/* Thumbnail / Icon */}
        <div className="w-11 h-11 rounded-lg bg-black/20 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/5">
          {r.thumbnail
            ? <img src={r.thumbnail} alt="" className="w-full h-full object-cover opacity-85" />
            : <span className="text-lg">{TYPE_ICONS[r.type] || "📎"}</span>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <a
            href={r.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-white hover:text-[#f0abfc] truncate block transition"
          >
            {r.name}
          </a>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {r.subject && (
              <span className="text-[9px] bg-purple-500/25 text-purple-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                {r.subject}
              </span>
            )}
            <span className="text-[9px] text-white/35">in {roomName}</span>
            {r.channel && (
              <span className="text-[9px] text-white/35 truncate">{r.channel}</span>
            )}
          </div>

          {/* Summary badges */}
          {hasSummary && r.summary.estimatedLevel && (
            <div className="flex gap-2 mt-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                background: { Beginner:"#22c55e22", Intermediate:"#f59e0b22", Advanced:"#ef444422" }[r.summary.estimatedLevel],
                color:      { Beginner:"#22c55e",   Intermediate:"#f59e0b",   Advanced:"#ef4444"   }[r.summary.estimatedLevel],
              }}>
                {r.summary.estimatedLevel}
              </span>
              {r.summary.studyRelevance && (
                <span className="text-[9px] text-white/35">Relevance: {r.summary.studyRelevance}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasSummary && (
            <button
              onClick={onToggle}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition ${
                expanded
                  ? "bg-purple-500 text-white"
                  : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
              }`}
            >
              {expanded ? "Hide" : "✨"}
            </button>
          )}
          {r.url && (
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="text-white/30 hover:text-white transition text-xs px-1"
              title="Open link"
            >
              ↗
            </a>
          )}
        </div>
      </div>

      {/* Inline summary */}
      {expanded && hasSummary && (
        <div className="mx-3 mb-3 bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">✨</span>
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wide">AI Study Summary</span>
            <span className="text-[9px] text-white/25 ml-auto">by Claude</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed mb-2">{r.summary.overview}</p>
          {r.summary.keyPoints?.length > 0 && (
            <ul className="space-y-1 mb-2">
              {r.summary.keyPoints.map((pt, i) => (
                <li key={i} className="text-xs text-white/65 flex gap-2">
                  <span className="text-purple-400 font-bold flex-shrink-0">{i + 1}.</span>
                  {pt}
                </li>
              ))}
            </ul>
          )}
          {r.summary.noteTip && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2 flex gap-2">
              <span className="text-xs flex-shrink-0">💡</span>
              <p className="text-xs text-amber-200/80">{r.summary.noteTip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UniversalLibrary;