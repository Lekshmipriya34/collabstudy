import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// Use Vite environment variables
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; 
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 

function RoomResources({ roomId }) {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState("file"); 
  const [filter, setFilter] = useState("All");

  // Form State
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [noteContent, setNoteContent] = useState("");
  
  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "resources"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [roomId]);

  const extractYoutubeId = (url) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!subject) return alert("Please enter a Subject/Topic (e.g., Physics)");
    
    setLoading(true);
    try {
      let finalUrl = null;
      let finalType = activeTab;
      let finalThumbnail = null;
      let finalName = name;

      // 1. CLOUDINARY FILE UPLOAD
      if (activeTab === "file") {
        const fileInput = document.getElementById("file-upload");
        const file = fileInput?.files[0];
        if (!file) return alert("Please select a file");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("folder", `studyhive/${roomId}`);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) throw new Error("Cloudinary upload failed");
        const data = await res.json();
        
        finalUrl = data.secure_url;
        finalName = name || file.name.replace(/\.[^.]+$/, ''); // Remove extension for display
        finalType = file.type.includes("pdf") ? "pdf" : "image";
      } 
      
      // 2. LINK
      else if (activeTab === "link") {
        if (!linkUrl) return alert("Enter a URL");
        finalUrl = linkUrl;
        finalName = name || linkUrl;
      }

      // 3. YOUTUBE
      else if (activeTab === "youtube") {
        if (!linkUrl) return alert("Enter YouTube URL");
        const yId = extractYoutubeId(linkUrl);
        if (!yId) return alert("Invalid YouTube URL");
        
        finalUrl = linkUrl;
        finalThumbnail = `https://img.youtube.com/vi/${yId}/mqdefault.jpg`;
        finalName = name || "YouTube Video";
      }

      // 4. NOTE
      else if (activeTab === "note") {
        if (!noteContent) return alert("Write something!");
        finalName = name || noteContent.slice(0, 30) + "...";
      }

      // SAVE FIRESTORE METADATA
      await addDoc(collection(db, "rooms", roomId, "resources"), {
        roomId,
        type: finalType,
        name: finalName,
        url: finalUrl,
        content: activeTab === "note" ? noteContent : null,
        thumbnail: finalThumbnail,
        subject: subject.toUpperCase(),
        uploadedBy: { uid: user.uid, name: user.displayName || "Member" },
        createdAt: serverTimestamp(),
      });

      // Reset
      setName("");
      setLinkUrl("");
      setNoteContent("");
      setIsAdding(false);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resId) => {
    if (!window.confirm("Delete this resource?")) return;
    await deleteDoc(doc(db, "rooms", roomId, "resources", resId));
  };

  const icons = { pdf: '📄', link: '🔗', youtube: '🎥', note: '📝', image: '🖼️' };
  
  const subjects = ['All', ...new Set(resources.map(r => r.subject))];
  const filteredResources = filter === 'All' ? resources : resources.filter(r => r.subject === filter);

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-purple-50 p-6 flex flex-col h-full min-h-[500px]">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Room Resources</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cloud Library</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition"
        >
          {isAdding ? "Cancel" : "+ Add New"}
        </button>
      </div>

      {/* UPLOAD FORM */}
      {isAdding && (
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex gap-2 mb-4">
            {['file', 'link', 'youtube', 'note'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition ${
                  activeTab === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {icons[t]} {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleUpload} className="space-y-3">
             <input 
                value={subject} onChange={(e) => setSubject(e.target.value)} 
                placeholder="Topic / Subject (e.g. BIOLOGY)" 
                className="w-full p-2 rounded-lg border border-slate-200 text-xs font-bold uppercase tracking-wide outline-none focus:border-indigo-400" 
             />

             {activeTab === 'file' && (
               <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-100 transition relative">
                 <input id="file-upload" type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.png,.jpg,.jpeg" />
                 <p className="text-slate-500 text-xs font-bold">{loading ? '⏳ Uploading...' : '📂 Click to upload PDF or Image'}</p>
                 <input 
                   value={name} onChange={(e) => setName(e.target.value)} 
                   placeholder="File Name (Optional)" 
                   className="mt-4 w-full p-2 rounded border border-slate-200 text-sm z-10 relative" 
                 />
               </div>
             )}

             {(activeTab === 'link' || activeTab === 'youtube') && (
               <>
                 <input 
                    value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} 
                    placeholder={activeTab === 'youtube' ? "Paste YouTube Link..." : "https://..."} 
                    className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none" 
                 />
                 <input 
                    value={name} onChange={(e) => setName(e.target.value)} 
                    placeholder="Title (Optional)" 
                    className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none" 
                 />
               </>
             )}

             {activeTab === 'note' && (
               <>
                  <input 
                    value={name} onChange={(e) => setName(e.target.value)} 
                    placeholder="Note Title" 
                    className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none font-bold" 
                 />
                 <textarea 
                    value={noteContent} onChange={(e) => setNoteContent(e.target.value)} 
                    placeholder="Type your note here..." 
                    rows={3}
                    className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none resize-none" 
                 />
               </>
             )}

             <button disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
               {loading ? "Saving..." : "Save Resource"}
             </button>
          </form>
        </div>
      )}

      {/* FILTER PILLS */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
        {subjects.map(sub => (
           <button
             key={sub}
             onClick={() => setFilter(sub)}
             className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition ${
               filter === sub ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
             }`}
           >
             {sub}
           </button>
        ))}
      </div>

      {/* RESOURCE GRID */}
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredResources.map(res => (
               <div key={res.id} className="group relative bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                  <a href={res.url || '#'} target="_blank" rel="noopener noreferrer" className="block">
                     <div className={`h-24 flex items-center justify-center relative ${res.type === 'youtube' ? 'bg-black' : 'bg-slate-50'}`}>
                        {res.thumbnail ? (
                           <img src={res.thumbnail} alt="thumb" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                        ) : (
                           <span className="text-3xl filter grayscale group-hover:grayscale-0 transition">{icons[res.type]}</span>
                        )}
                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                           {res.type.toUpperCase()}
                        </div>
                     </div>
                     <div className="p-3">
                        <div className="text-xs font-bold text-slate-800 truncate mb-1" title={res.name}>{res.name}</div>
                        <div className="flex justify-between items-center">
                           <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{res.subject}</span>
                           <span className="text-[9px] text-slate-400">by {res.uploadedBy?.name?.split(' ')[0]}</span>
                        </div>
                     </div>
                  </a>
                  <button 
                     onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(res.id); }}
                     className="absolute top-2 left-2 bg-rose-500 text-white w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md font-bold text-xs"
                  >
                     ✕
                  </button>
               </div>
            ))}
         </div>
         {filteredResources.length === 0 && !loading && (
            <div className="text-center py-10 text-slate-400">
               <p className="text-2xl mb-2">📂</p>
               <p className="text-xs font-bold">No resources found.</p>
            </div>
         )}
      </div>
    </div>
  );
}

export default RoomResources;