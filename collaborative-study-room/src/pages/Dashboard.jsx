import { useState } from "react";
import JoinRoom from "../components/JoinRoom";
import CreateRoom from "../components/CreateRoom";
import RoomList from "../components/RoomList";
import TaskManager from "../components/TaskManager"; // Import the TaskManager

function Dashboard() {
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {selectedRoomId && (
          <button 
            onClick={() => setSelectedRoomId(null)}
            className="text-sm text-blue-600 underline"
          >
            ← Back to Room List
          </button>
        )}
      </div>

      {/* CONDITIONAL RENDERING */}
      {selectedRoomId ? (
        // IF ROOM SELECTED: Show Task Manager
        <TaskManager roomId={selectedRoomId} />
      ) : (
        // IF NO ROOM SELECTED: Show Dashboard Widgets
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CreateRoom />
            <JoinRoom />
          </div>
          <div>
            {/* Pass the function to set the selected room */}
            <RoomList onSelectRoom={setSelectedRoomId} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;