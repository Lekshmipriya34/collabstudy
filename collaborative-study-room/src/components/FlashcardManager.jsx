import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";
import FlashcardDeck from "./FlashcardDeck";

function FlashcardManager({ basePath, title }) {
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [selectedColor, setSelectedColor] = useState("from-purple-500 to-indigo-600");

  // Pre-defined themes for customization
  const themes = [
    { name: "Purple", class: "from-purple-500 to-indigo-600", bg: "bg-purple-100 text-purple-800" },
    { name: "Emerald", class: "from-emerald-400 to-teal-600", bg: "bg-emerald-100 text-emerald-800" },
    { name: "Rose", class: "from-rose-400 to-red-600", bg: "bg-rose-100 text-rose-800" },
    { name: "Amber", class: "from-amber-400 to-orange-600", bg: "bg-amber-100 text-amber-800" },
    { name: "Blue", class: "from-blue-400 to-cyan-600", bg: "bg-blue-100 text-blue-800" },
  ];

  // Fetch Decks (Folders)
  useEffect(() => {
    const q = query(collection(db, `${basePath}/decks`), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDecks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [basePath]);

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckName) return;
    
    await addDoc(collection(db, `${basePath}/decks`), {
      name: newDeckName,
      theme: selectedColor,
      createdAt: serverTimestamp(),
      cardCount: 0 
    });
    
    setNewDeckName("");
    setIsCreating(false);
  };

  // If a deck is selected, show the FlashcardDeck component (Inside the folder)
  if (selectedDeck) {
    return (
      <FlashcardDeck 
        // We construct the path to look INSIDE the chosen deck
        collectionPath={`${basePath}/decks/${selectedDeck.id}/cards`}
        deckName={selectedDeck.name}
        deckTheme={selectedDeck.theme}
        onBack={() => setSelectedDeck(null)}
      />
    );
  }

  // Otherwise, show the Folder List
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-[2rem] shadow-xl border border-purple-50 p-6 h-[450px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
             {decks.length} Decks
           </p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:scale-105 transition"
        >
          {isCreating ? "Cancel" : "+ New Folder"}
        </button>
      </div>

      {isCreating && (
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in-down">
          <input 
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="Folder Name (e.g. Biology, React Info)"
            className="w-full p-3 rounded-xl border border-slate-200 mb-3 text-sm font-bold outline-none focus:border-purple-400"
          />
          <div className="flex gap-2 mb-4">
            {themes.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedColor(t.class)}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.class} transition-transform hover:scale-110 ${selectedColor === t.class ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
              />
            ))}
          </div>
          <button onClick={handleCreateDeck} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-xs">
            Create Folder
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 overflow-y-auto custom-scrollbar content-start">
        {decks.map((deck) => (
          <div 
            key={deck.id}
            onClick={() => setSelectedDeck(deck)}
            className="group cursor-pointer p-4 rounded-2xl border border-slate-100 hover:border-purple-200 hover:shadow-lg transition-all bg-white relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${deck.theme || themes[0].class}`} />
            
            <div className="flex justify-between items-start mb-2">
               <svg className="w-8 h-8 text-slate-300 group-hover:text-purple-400 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" /></svg>
            </div>
            
            <h3 className="font-bold text-slate-700 truncate">{deck.name}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Open Deck →</p>
          </div>
        ))}
        
        {decks.length === 0 && !isCreating && (
          <div className="col-span-2 text-center py-10 text-slate-400 text-sm italic">
            No folders yet. Create one!
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardManager;