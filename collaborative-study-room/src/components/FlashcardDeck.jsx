import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

// SM-2 Algorithm Helper
const calculateSM2 = (card, quality) => {
  let { interval = 0, repetition = 0, ef = 2.5 } = card;
  if (quality >= 3) {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * ef);
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1; 
  }
  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;
  return { interval, repetition, ef };
};

function FlashcardDeck({ collectionPath, deckName, deckTheme, onBack }) {
  const [allCards, setAllCards] = useState([]);
  const [reviewCards, setReviewCards] = useState([]);
  const [activeCards, setActiveCards] = useState([]); 
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [mode, setMode] = useState("smart"); 

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  useEffect(() => {
    const q = query(collection(db, collectionPath), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data(),
        nextReview: doc.data().nextReview || 0, 
      }));
      setAllCards(data);
      const now = Date.now();
      const due = data.filter(c => c.nextReview <= now);
      setReviewCards(due);
    });
    return () => unsubscribe();
  }, [collectionPath]);

  useEffect(() => {
    if (mode === "smart") {
      setActiveCards(reviewCards);
    } else {
      setActiveCards(allCards);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [mode, allCards, reviewCards]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!front || !back) return;
    await addDoc(collection(db, collectionPath), {
      front,
      back,
      createdAt: serverTimestamp(),
      nextReview: Date.now(), 
      interval: 0,
      repetition: 0,
      ef: 2.5
    });
    setFront("");
    setBack("");
    setIsAdding(false);
  };

  const handleGrade = async (quality) => {
    const currentCard = activeCards[currentIndex];
    if (!currentCard) return;
    const { interval, repetition, ef } = calculateSM2(currentCard, quality);
    const nextDate = Date.now() + (interval * 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, collectionPath, currentCard.id), {
      nextReview: nextDate,
      interval, repetition, ef
    });
    setIsFlipped(false);
    setTimeout(() => {
        if (mode === "smart") {
            const remaining = activeCards.filter(c => c.id !== currentCard.id);
            setReviewCards(remaining);
        } else {
            setCurrentIndex((prev) => (prev + 1) % activeCards.length);
        }
    }, 200);
  };

  const handleDelete = async () => {
    const currentCard = activeCards[currentIndex];
    if (!currentCard || !window.confirm("Delete this card?")) return;
    await deleteDoc(doc(db, collectionPath, currentCard.id));
    setIsFlipped(false);
    setCurrentIndex(0);
  };

  return (
    <div className="bg-white/95 backdrop-blur-3xl rounded-[2rem] shadow-xl border border-white/40 p-6 flex flex-col transition-all relative">
      
      {/* HEADER - Compacted */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase truncate max-w-[120px]">{deckName}</h2>
        </div>
        
        <div className="flex gap-2">
            <button onClick={() => setIsAdding(!isAdding)} className="text-[9px] font-black bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 transition uppercase tracking-widest">
                {isAdding ? "✕" : "+ Card"}
            </button>
            <button 
                onClick={() => setMode(mode === "smart" ? "cram" : "smart")}
                className="text-[9px] font-black border border-slate-200 text-slate-400 px-3 py-2 rounded-xl uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 transition"
            >
                {mode === "smart" ? "Cram" : "Smart"}
            </button>
        </div>
      </div>

      {/* CARD STAGE - Height reduced to 200px */}
      <div className="relative h-[200px]">
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex flex-col gap-2 h-full justify-center">
            <input
              placeholder="Question..."
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-900 focus:border-indigo-400 outline-none text-[11px] font-bold shadow-inner"
            />
            <textarea
              placeholder="Answer..."
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-900 focus:border-indigo-400 outline-none text-[11px] font-bold h-20 resize-none shadow-inner"
            />
            <button className="bg-emerald-500 text-white py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-600">
              Save
            </button>
          </form>
        ) : activeCards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
            <p className="text-3xl mb-1">✨</p>
            <p className="font-black text-slate-800 uppercase tracking-tight text-[10px]">Empty Queue</p>
          </div>
        ) : (
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative w-full h-full cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] select-none"
            style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            {/* FRONT */}
            <div className="absolute inset-0 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center p-6 text-center shadow-lg [backface-visibility:hidden]">
                <p className="text-slate-800 text-lg font-black tracking-tight leading-tight">{activeCards[currentIndex]?.front}</p>
                <div className="absolute bottom-4 text-[8px] font-black text-indigo-300 uppercase tracking-widest">Flip Card</div>
            </div>

            {/* BACK */}
            <div className="absolute inset-0 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center p-6 text-center shadow-2xl [transform:rotateY(180deg)] [backface-visibility:hidden] border-4 border-white/10">
                <p className="text-white text-sm font-bold leading-relaxed">{activeCards[currentIndex]?.back}</p>
            </div>
          </div>
        )}
      </div>

      {/* CONTROLS - Positioned closely below */}
      {!isAdding && activeCards.length > 0 && (
        <div className="mt-6">
            {isFlipped && mode === "smart" ? (
                <div className="grid grid-cols-4 gap-1.5">
                    {[{l:"Again",q:0,c:"bg-rose-50 text-rose-600"}, {l:"Hard",q:3,c:"bg-orange-50 text-orange-600"}, {l:"Good",q:4,c:"bg-blue-50 text-blue-600"}, {l:"Easy",q:5,c:"bg-emerald-50 text-emerald-700"}].map(b => (
                        <button key={b.l} onClick={(e)=>{e.stopPropagation(); handleGrade(b.q)}} className={`${b.c} py-3 rounded-xl font-black text-[8px] uppercase tracking-tighter hover:scale-105 transition-all`}>{b.l}</button>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-between px-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev === 0 ? activeCards.length - 1 : prev - 1)); setIsFlipped(false); }} 
                        className="p-3 bg-slate-100 hover:bg-indigo-100 rounded-xl text-slate-400 hover:text-indigo-600 transition"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{currentIndex + 1} / {activeCards.length}</span>
                        <button onClick={(e)=>{e.stopPropagation(); handleDelete()}} className="text-rose-400 hover:text-rose-600 text-[8px] font-black uppercase tracking-widest mt-1 opacity-50">Delete</button>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % activeCards.length); setIsFlipped(false); }} 
                        className="p-3 bg-slate-100 hover:bg-indigo-100 rounded-xl text-slate-400 hover:text-indigo-600 transition"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

export default FlashcardDeck;