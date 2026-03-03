import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function UniversalLibrary() {
  const { user } = useAuth();
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchUniversalResources = async () => {
      if (!user?.uid) return;
      setLoading(true);

      try {
        // 1. Find all rooms the user is in
        const roomsQuery = query(collection(db, "rooms"), where("members", "array-contains", user.uid));
        const roomsSnap = await getDocs(roomsQuery);
        
        // 2. Fetch resources from each room
        const fetchPromises = roomsSnap.docs.map(async (roomDoc) => {
          const roomData = roomDoc.data();
          const resQuery = query(collection(db, "rooms", roomDoc.id, "resources"));
          const resSnap = await getDocs(resQuery);
          
          return resSnap.docs.map(resDoc => ({
            id: resDoc.id,
            roomName: roomData.name, 
            ...resDoc.data()
          }));
        });

        const results = await Promise.all(fetchPromises);
        const combinedResources = results.flat().sort((a, b) => b.createdAt - a.createdAt);

        setAllResources(combinedResources);
      } catch (error) {
        console.error("Error fetching library:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUniversalResources();
  }, [user]);

  const icons = { pdf: '📄', link: '🔗', youtube: '🎥', note: '📝', image: '🖼️' };

  const filteredResources = filter === "All" 
    ? allResources 
    : allResources.filter(r => r.type === filter.toLowerCase());

  if (loading) return <div className="glass-card p-6 flex justify-center items-center h-40"><p className="text-purple-200 animate-pulse font-bold">Loading Library...</p></div>;

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2.5rem] shadow-xl h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-widest text-[#f0abfc]">UNIVERSAL LIBRARY</h2>
          <p className="text-xs text-purple-200 opacity-80 mt-1 uppercase">Cloudinary • Firestore</p>
        </div>
        
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="bg-black/20 border border-white/20 text-white rounded-lg px-3 py-1 text-xs font-bold outline-none cursor-pointer"
        >
          <option value="All">All Types</option>
          <option value="pdf">PDFs</option>
          <option value="youtube">Videos</option>
          <option value="link">Links</option>
        </select>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {filteredResources.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-purple-200/50">
            <p className="font-bold">Library is empty.</p>
          </div>
        ) : (
          filteredResources.map((res) => (
            <div key={res.id} className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-4 hover:bg-white/10 transition group">
              {/* Thumbnail / Icon */}
              <div className="w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {res.thumbnail ? (
                  <img src={res.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <span className="text-lg">{icons[res.type] || '📎'}</span>
                )}
              </div>

              {/* Info */}
              <div className="overflow-hidden flex-grow">
                <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-[#f0abfc] truncate block transition">
                  {res.name}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded uppercase font-bold">
                    {res.subject}
                  </span>
                  <span className="text-[9px] text-white/40 truncate">
                    in {res.roomName}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default UniversalLibrary;