function RoomSidebar({ roomId,isRunning  }) {
  // Temporary static data (safe for demo & UI)
  const inviteCode = "JfR6yvKbY0R2GtLOffBy";

  const members = [
    { name: "Unknown User", username: "@guest", initial: "U" },
    { name: "lechu", username: "@lechu123", initial: "L" },
  ];

  return (
<div className="glass-card p-6 text-white bg-gradient-to-br from-[#7c3aed]/80 to-[#4c1d95]/80">

      {/* ROOM HEADER */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-wide">Lechu</h2>
        <p className="text-xs text-purple-200 uppercase tracking-widest">
          Study session active
        </p>
      </div>

      {/* INVITE FRIENDS */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20">
        <p className="text-sm tracking-widest mb-3 text-purple-200">
          INVITE FRIENDS
        </p>

        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-4 text-center font-mono text-lg tracking-wider shadow-inner break-all">
          {inviteCode}
        </div>

        <button
          onClick={() => navigator.clipboard.writeText(inviteCode)}
          className="mt-4 w-full bg-white text-purple-700 font-bold py-2 rounded-full hover:bg-purple-100 transition"
        >
          COPY CODE
        </button>
      </div>

      {/* ONLINE MEMBERS */}
      <div>
        <p className="text-sm tracking-widest text-purple-200 mb-3">
          ONLINE MEMBERS ({members.length})
        </p>

        <div className="space-y-3">
          {members.map((member, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-white/10 rounded-xl p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500
                  ${isRunning
                    ? "bg-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.9)]"
                    : "bg-purple-300 text-purple-900"
                  }`}
>

                  {member.initial}
                </div>

                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-purple-200">
                    {member.username}
                  </p>
                </div>
              </div>

              {/* Online indicator */}
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default RoomSidebar;
