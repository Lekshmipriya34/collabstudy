import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

function StudyTracker() {
  const { user } = useAuth();
  const [contributionData, setContributionData] = useState({});
  const [totalMinutesYear, setTotalMinutesYear] = useState(0);

  // 1. Helper: Determine Color Intensity (Purple Theme)
  const getColor = (minutes) => {
    if (minutes === 0) return "bg-gray-100";      // No activity
    if (minutes < 30) return "bg-purple-200";     // Light Purple
    if (minutes < 60) return "bg-purple-400";     // Medium Purple
    return "bg-purple-700";                       // Deep Purple (Target)
  };

  // 2. Helper: Generate the last 365 days array
  const generateYearGrid = () => {
    const days = [];
    const today = new Date();
    
    // We want 52 weeks roughly, so loop back 365 days
    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toDateString(); // "Fri Oct 20 2023"
      days.push({
        date: d,
        dateStr: dateStr,
      });
    }
    return days;
  };

  const daysGrid = generateYearGrid();

  useEffect(() => {
    if (!user) return;

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const q = query(
      collection(db, "users", user.uid, "studySessions"),
      where("createdAt", ">", oneYearAgo)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let dataMap = {};
      let total = 0;

      snapshot.docs.forEach((doc) => {
        const session = doc.data();
        if (!session.createdAt) return;

        const dateStr = session.createdAt.toDate().toDateString();
        
        // Aggregate minutes for that day
        if (dataMap[dateStr]) {
          dataMap[dateStr] += session.duration;
        } else {
          dataMap[dateStr] = session.duration;
        }
        total += session.duration;
      });

      setContributionData(dataMap);
      setTotalMinutesYear(total);
    });

    return () => unsub();
  }, [user]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 overflow-hidden border border-purple-100">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Study Tracker</h2>
          <p className="text-sm text-gray-500">
            <span className="font-bold text-purple-700">{totalMinutesYear} minutes</span> studied in the last year
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
          <div className="w-3 h-3 bg-purple-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-purple-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-purple-700 rounded-sm"></div>
          <span>More</span>
        </div>
      </div>

      {/* --- THE CONTRIBUTION GRID --- */}
      <div className="overflow-x-auto pb-2">
        <div 
           className="grid grid-flow-col gap-1 auto-cols-[minmax(10px,_1fr)] grid-rows-7 h-32 w-max"
        >
          {daysGrid.map((dayItem, index) => {
            const minutes = contributionData[dayItem.dateStr] || 0;
            const colorClass = getColor(minutes);

            return (
              <div
                key={index}
                className={`w-3 h-3 rounded-sm ${colorClass} hover:ring-2 hover:ring-purple-400 transition cursor-pointer relative group`}
              >
                {/* TOOLTIP ON HOVER */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded whitespace-nowrap z-50 pointer-events-none">
                  <p className="font-semibold text-purple-200">{minutes} minutes</p>
                  <p className="text-gray-400">{dayItem.dateStr}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StudyTracker;