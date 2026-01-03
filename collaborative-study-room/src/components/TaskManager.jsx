import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function TaskManager({ roomId }) {
  const { user } = useAuth();
  const [taskTitle, setTaskTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [tasks, setTasks] = useState([]);

  // --- LOGIC (Unchanged) ---
  useEffect(() => {
    if (!roomId) return;
    const taskRef = collection(db, "rooms", roomId, "tasks");
    const q = query(taskRef, orderBy("deadline", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskData);
    });
    return () => unsubscribe();
  }, [roomId]);

  const addTask = async () => {
    if (!taskTitle || !deadline) return alert("Fill all fields");
    if (!roomId) return;
    try {
      await addDoc(collection(db, "rooms", roomId, "tasks"), {
        title: taskTitle,
        deadline,
        createdBy: user.uid,
        completed: false,
        createdAt: serverTimestamp(),
      });
      setTaskTitle("");
      setDeadline("");
    } catch (err) {
      console.error(err);
      alert("Failed to add task");
    }
  };

  const toggleTask = async (taskId, currentStatus) => {
    const taskRef = doc(db, "rooms", roomId, "tasks", taskId);
    await updateDoc(taskRef, {
      completed: !currentStatus,
    });
  };

  // --- UI RENDER (Redesigned) ---
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-[2rem] shadow-xl border border-purple-50 p-8 h-full flex flex-col transition-all duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Room Tasks</h2>
          <p className="text-slate-400 text-sm font-medium">Keep track of group goals</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
             <span className="text-indigo-600 font-bold text-sm">{tasks.length}</span>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-3 mb-8 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-3">
          <input
            placeholder="What needs to be done?"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="flex-grow p-4 rounded-2xl border-2 border-transparent focus:border-purple-400 focus:bg-white outline-none transition-all font-semibold text-slate-700 placeholder:text-slate-300"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="p-4 rounded-2xl border-2 border-transparent focus:border-purple-400 focus:bg-white outline-none transition-all font-bold text-slate-600 text-sm cursor-pointer"
          />
          <button
            onClick={addTask}
            className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id, task.completed)}
            className={`group flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
              task.completed 
                ? "bg-slate-50 border-transparent" 
                : "bg-white border-slate-50 hover:border-purple-100 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Custom Animated Checkbox */}
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                task.completed 
                  ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-100" 
                  : "border-slate-200 group-hover:border-purple-400"
              }`}>
                {task.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div>
                <p className={`font-bold transition-all duration-300 ${
                  task.completed ? "line-through text-slate-400" : "text-slate-700"
                }`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Due</span>
                    <p className={`text-[11px] font-bold ${task.completed ? "text-slate-300" : "text-purple-500"}`}>
                        {task.deadline}
                    </p>
                </div>
              </div>
            </div>
            
            <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                task.completed 
                ? "bg-emerald-100 text-emerald-600" 
                : "bg-amber-100 text-amber-600"
            }`}>
               {task.completed ? "Done" : "Pending"}
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-12 rounded-[2rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-bold italic">No tasks active. Enjoy your free time!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskManager;