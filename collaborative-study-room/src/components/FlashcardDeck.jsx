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
import AdaptiveGraph from "./AdaptiveGraph"; // Import the graph

// SM-2 Algorithm Helper
const calculateSM2 = (card, quality) => {
  // quality: 0 (blackout) to 5 (perfect)
  // We map our buttons: Again=0, Hard=3, Good=4, Easy=5
  
  let { interval = 0, repetition = 0, ef = 2.5 } = card;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1; // Start over
  }

  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  return { interval, repetition, ef };
};

function FlashcardDeck({ collectionPath, deckName, deckTheme, onBack }) {
  const [allCards, setAllCards] = useState([]);
  const [reviewCards, setReviewCards] = useState([]);
  const [activeCards, setActiveCards] = useState([]); // Points to either allCards or reviewCards
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [mode, setMode] = useState("smart"); // 'smart' (Adaptive) or 'cram' (All)
  const [showGraph, setShowGraph] = useState(false);

  // Inputs
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  useEffect(() => {
    const q = query(collection(db, collectionPath), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data(),
        // Default SM-2 values if they don't exist yet
        nextReview: doc.data().nextReview || 0, 
        interval: doc.data().interval || 0,
        repetition: doc.data().repetition || 0,
        ef: doc.data().ef || 2.5
      }));
      
      setAllCards(data);

      // Filter for Smart Review (Cards due today or in past)
      const now = Date.now();
      const due = data.filter(c => c.nextReview <= now);
      setReviewCards(due);
    });
    return () => unsubscribe();
  }, [collectionPath]);

  // Sync active cards when mode changes
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
      // Initial SM-2 State
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

    // 1. Calculate new SM-2 values
    const { interval, repetition, ef } = calculateSM2(currentCard, quality);
    
    // 2. Calculate next date (Interval is in days)
    const nextDate = Date.now() + (interval * 24 * 60 * 60 * 1000);

    // 3. Update Firebase
    const cardRef = doc(db, collectionPath, currentCard.id);
    await updateDoc(cardRef, {
      nextReview: nextDate,
      interval,
      repetition,
      ef
    });

    // 4. Move to next card
    setIsFlipped(false);
    
    // Small delay for UI smoothness
    setTimeout(() => {
        // If in smart mode, removing it from the list locally so it disappears immediately
        if (mode === "smart") {
            const remaining = activeCards.filter(c => c.id !== currentCard.id);
            setReviewCards(remaining); // This triggers the useEffect to update activeCards
            // If we are at the end, index resets automatically via useEffect logic or stays 0
        } else {
            setCurrentIndex((prev) => (prev + 1) % activeCards.length);
        }
    }, 200);
  };

  const handleDelete = async () => {
    if (!activeCards[currentIndex]) return;
    if (window.confirm("Delete this flashcard?")) {
      await deleteDoc(doc(db, collectionPath, activeCards[currentIndex].id));
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % activeCards.length), 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev === 0 ? activeCards.length - 1 : prev - 1)), 150);
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-[2rem] shadow-xl border border-purple-50 p-6 flex flex-col min-h-[500px] transition-all">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition">←</button>
            <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{deckName}</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setMode("smart")}
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition ${mode === "smart" ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        Smart Review ({reviewCards.length})
                    </button>
                    <button 
                         onClick={() => setMode("cram")}
                         className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition ${mode === "cram" ? "bg-purple-100 text-purple-700" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        Cram All ({allCards.length})
                    </button>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setShowGraph(!showGraph)}
              className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg hover:bg-slate-200 transition"
            >
              📊 Stats
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-200 transition"
            >
              {isAdding ? "Cancel" : "+ Add"}
            </button>
        </div>
      </div>

      {showGraph && <AdaptiveGraph />}

      <div className="flex-grow relative perspective-1000 min-h-[300px]">
        
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 h-full justify-center">
            <input
              placeholder="Front (Question)"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-purple-400 outline-none text-sm font-medium"
            />
            <textarea
              placeholder="Back (Answer)"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-purple-400 outline-none text-sm font-medium h-24 resize-none"
            />
            <button className="bg-indigo-600 text-white py-2 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition">
              Save Card
            </button>
          </form>
        ) : activeCards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            {mode === "smart" ? (
                <>
                    <p className="text-4xl mb-2">🎉</p>
                    <p className="font-bold text-slate-600">All caught up!</p>
                    <p className="text-xs">No cards due for review right now.</p>
                    <button onClick={() => setMode("cram")} className="mt-4 text-indigo-500 font-bold text-xs underline">Switch to Cram Mode</button>
                </>
            ) : (
                <>
                    <p className="font-bold">Empty Deck</p>
                    <p className="text-xs">Add a card to get started</p>
                </>
            )}
          </div>
        ) : (
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative w-full h-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]"
            style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            {/* FRONT */}
            <div className={`absolute inset-0 bg-gradient-to-br ${deckTheme || "from-purple-500 to-indigo-600"} rounded-2xl flex items-center justify-center p-6 text-center shadow-lg [backface-visibility:hidden]`}>
              <div>
                <span className="absolute top-4 left-4 text-[10px] text-slate-800 font-black uppercase tracking-widest">Question</span>
                <p className="text-slate-900 text-xl font-bold leading-relaxed">
                  {activeCards[currentIndex]?.front}
                </p>
                <p className="absolute bottom-4 right-4 text-xs text-slate-700 animate-pulse">
                  Click to flip ↻
                </p>
              </div>
            </div>

            {/* BACK */}
            <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center p-6 text-center shadow-lg [transform:rotateY(180deg)] [backface-visibility:hidden] border-2 border-indigo-100">
              <div>
                <span className="absolute top-4 left-4 text-[10px] text-indigo-300 font-black uppercase tracking-widest">Answer</span>
                <p className="text-slate-900 text-lg font-medium leading-relaxed">
                  {activeCards[currentIndex]?.back}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER CONTROLS */}
      {!isAdding && activeCards.length > 0 && (
        <div className="mt-6">
            {/* If Flipped AND in Smart Mode: Show Grading Buttons */}
            {isFlipped && mode === "smart" ? (
                <div className="grid grid-cols-4 gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleGrade(0); }} className="py-3 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs hover:bg-rose-200">Again</button>
                    <button onClick={(e) => { e.stopPropagation(); handleGrade(3); }} className="py-3 rounded-xl bg-orange-100 text-orange-700 font-bold text-xs hover:bg-orange-200">Hard</button>
                    <button onClick={(e) => { e.stopPropagation(); handleGrade(4); }} className="py-3 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs hover:bg-blue-200">Good</button>
                    <button onClick={(e) => { e.stopPropagation(); handleGrade(5); }} className="py-3 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xs hover:bg-emerald-200">Easy</button>
                </div>
            ) : (
                /* Standard Navigation for Cram Mode OR Unflipped Card */
                <div className="flex items-center justify-between">
                    <button onClick={prevCard} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">←</button>
                    <div className="flex gap-2">
                        <span className="text-xs font-bold text-slate-400 pt-1">
                        {currentIndex + 1} / {activeCards.length}
                        </span>
                        <button onClick={handleDelete} className="text-rose-400 hover:text-rose-600 text-xs font-bold">
                        Delete
                        </button>
                    </div>
                    <button onClick={nextCard} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">→</button>
                </div>
            )}
        </div>
      )}
    </div>
  );
}

export default FlashcardDeck;