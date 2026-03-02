import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

function FlashcardDeck({ collectionPath, deckName, deckTheme, onBack }) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  useEffect(() => {
    const q = query(collection(db, collectionPath), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCards(data);
      if (currentIndex >= data.length) setCurrentIndex(0);
    });
    return () => unsubscribe();
  }, [collectionPath]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!front || !back) return;
    await addDoc(collection(db, collectionPath), {
      front,
      back,
      createdAt: serverTimestamp(),
    });
    setFront("");
    setBack("");
    setIsAdding(false);
  };

  const handleDelete = async () => {
    if (!cards[currentIndex]) return;
    const confirmDelete = window.confirm("Delete this flashcard?");
    if (confirmDelete) {
      await deleteDoc(doc(db, collectionPath, cards[currentIndex].id));
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev === 0 ? cards.length - 1 : prev - 1)), 150);
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-[2rem] shadow-xl border border-purple-50 p-6 flex flex-col h-[450px]">
      
      {/* HEADER WITH BACK BUTTON */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition">
                ←
            </button>
            <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{deckName}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {cards.length} Cards
                </p>
            </div>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-200 transition"
        >
          {isAdding ? "Cancel" : "+ Add Card"}
        </button>
      </div>

      <div className="flex-grow relative perspective-1000">
        
        {isAdding ? (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 h-full justify-center">
            <input
              placeholder="Front (Question)"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              // FIX: Added 'text-slate-900' and 'bg-slate-50'
              className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-purple-400 outline-none text-sm font-medium placeholder:text-slate-400"
            />
            <textarea
              placeholder="Back (Answer)"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              // FIX: Added 'text-slate-900' and 'bg-slate-50'
              className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:border-purple-400 outline-none text-sm font-medium h-24 resize-none placeholder:text-slate-400"
            />
            <button className="bg-indigo-600 text-white py-2 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition">
              Save Card
            </button>
          </form>
        ) : cards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <p className="font-bold">Empty Deck</p>
            <p className="text-xs">Add a card to get started</p>
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
                  {cards[currentIndex]?.front}
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
                  {cards[currentIndex]?.back}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isAdding && cards.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={prevCard} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">←</button>
          <div className="flex gap-2">
            <span className="text-xs font-bold text-slate-400 pt-1">
              {currentIndex + 1} / {cards.length}
            </span>
            <button onClick={handleDelete} className="text-rose-400 hover:text-rose-600 text-xs font-bold">
              Delete
            </button>
          </div>
          <button onClick={nextCard} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">→</button>
        </div>
      )}
    </div>
  );
}

export default FlashcardDeck;