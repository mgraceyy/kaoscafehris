
// KAOS Admin Attendance — Redesigned
// Fixes: table density (more rows, better empty states, pagination)

function AdminAttendance() {
  const rows = [
    { name:"Alicia Santos",   role:"Barista",    date:"Apr 23",  in:"7:02 AM",  out:"3:05 PM",  hours:"8h 03m", status:"On Time" },
    { name:"Mark Reyes",      role:"Shift Lead",  date:"Apr 23",  in:"8:47 AM",  out:"5:00 PM",  hours:"8h 13m", status:"Late" },
    { name:"Donna Cruz",      role:"Cashier",     date:"Apr 23",  in:"6:58 AM",  out:"3:01 PM",  hours:"8h 03m", status:"On Time" },
    { name:"James Uy",        role:"Barista",     date:"Apr 23",  in:"7:00 AM",  out:"—",        hours:"—",      status:"Ongoing" },
    { name:"Shaina Lim",      role:"Supervisor",  date:"Apr 23",  in:"—",        out:"—",        hours:"—",      status:"Absent" },
    { name:"Nico Valdez",     role:"Barista",     date:"Apr 23",  in:"6:55 AM",  out:"3:00 PM",  hours:"8h 05m", status:"On Time" },
    { name:"Trisha Reyes",    role:"Cashier",     date:"Apr 23",  in:"9:10 AM",  out:"5:12 PM",  hours:"8h 02m", status:"Late" },
    { name:"Carlo Mendoza",   role:"Barista",     date:"Apr 23",  in:"7:01 AM",  out:"3:04 PM",  hours:"8h 03m", status:"On Time" },
    { name:"Bea Tan",         role:"Shift Lead",  date:"Apr 23",  in:"—",        out:"—",        hours:"—",      status:"On Leave" },
    { name:"Luis Santos",     role:"Barista",     date:"Apr 23",  in:"6:59 AM",  out:"3:02 PM",  hours:"8h 03m", status:"On Time" },
  ];

  const badgeColor = {
    "On Time":  { bg:"#edf6ea", color:"#4e8a40" },
    "Late":     { bg:"#fdf0e0", color:"#b07020" },
    "Absent":   { bg:"#fce9e9", color:"#811c12" },
    "Ongoing":  { bg:"#e8f0fd", color:"#2a5db0" },
    "On Leave": { bg:"#f3e9fd", color:"#7a3db0" },
  };

  const summary = [
    { label:"Present", value:7, color:"#811c12" },
    { label:"Late",    value:2, color:"#C4843A" },
    { label:"Absent",  value:1, color:"#a28587" },
    { label:"On Leave",value:1, color:"#7a3db0" },
  ];

  return (
    <AdminShell activeItem="Attendance">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Attendance</h1>
          <p style={{ fontSize:12, color:"#a28587", margin:"2px 0 0" }}>Wednesday, April 23, 2026 · Marfori Branch</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <select style={{ fontSize:12, padding:"7px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
            <option>All Branches</option>
            <option>Marfori Branch</option>
            <option>Buhangin Branch</option>
          </select>
          <input type="text" placeholder="Search employee…" style={{ fontSize:12, padding:"7px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", width:180, outline:"none" }} />
          <button style={{ padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:600, border:`1.5px solid ${BRAND}`, color:BRAND, background:"transparent", cursor:"pointer" }}>
            Export
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display:"flex", gap:10, marginBottom:18 }}>
        {summary.map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"10px 18px", display:"flex", gap:10, alignItems:"center", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }} />
            <span style={{ fontSize:12, color:"#666" }}>{s.label}</span>
            <span style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
              {["Employee","Role","Date","Time In","Time Out","Hours","Status"].map(h => (
                <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => {
              const bs = badgeColor[r.status] || { bg:"#eee", color:"#555" };
              return (
                <tr key={i} style={{ borderBottom:"1px solid #F8F1F1", transition:"background .1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#fdf8f8"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:"#F3E4E4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:BRAND, flexShrink:0 }}>
                        {r.name.split(" ").map(n=>n[0]).join("")}
                      </div>
                      <span style={{ fontWeight:600, color:"#110200" }}>{r.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"11px 14px", color:"#888" }}>{r.role}</td>
                  <td style={{ padding:"11px 14px", color:"#666" }}>{r.date}</td>
                  <td style={{ padding:"11px 14px", color:"#444", fontVariantNumeric:"tabular-nums" }}>{r.in}</td>
                  <td style={{ padding:"11px 14px", color:"#444", fontVariantNumeric:"tabular-nums" }}>{r.out}</td>
                  <td style={{ padding:"11px 14px", color:"#444", fontVariantNumeric:"tabular-nums" }}>{r.hours}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ background:bs.bg, color:bs.color, fontSize:10.5, fontWeight:600, borderRadius:20, padding:"3px 10px" }}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Pagination */}
        <div style={{ padding:"12px 14px", borderTop:"1px solid #F5EDED", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11.5, color:"#aaa" }}>Showing 10 of 48 employees</span>
          <div style={{ display:"flex", gap:4 }}>
            {[1,2,3,"…",5].map((p,i) => (
              <button key={i} style={{ width:28, height:28, borderRadius:6, border: p===1 ? "none":"1px solid #eee", background: p===1 ? BRAND:"#fff", color: p===1?"#fff":"#666", fontSize:12, cursor:"pointer", fontWeight: p===1?700:400 }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── Admin Leave Management ─────────────────────────────────────────────────
function AdminLeave() {
  const requests = [
    { name:"Donna Cruz",    role:"Cashier",     type:"Sick Leave",      from:"Apr 24",  to:"Apr 25",  days:2, filed:"Apr 22", status:"Pending",  reason:"Fever and flu" },
    { name:"Mark Reyes",    role:"Shift Lead",  type:"Vacation Leave",  from:"May 1",   to:"May 3",   days:3, filed:"Apr 20", status:"Approved", reason:"Family vacation" },
    { name:"Shaina Lim",    role:"Supervisor",  type:"Emergency Leave", from:"Apr 23",  to:"Apr 23",  days:1, filed:"Apr 23", status:"Approved", reason:"Family emergency" },
    { name:"Carlo Mendoza", role:"Barista",     type:"Vacation Leave",  from:"May 5",   to:"May 9",   days:5, filed:"Apr 18", status:"Pending",  reason:"Out-of-town trip" },
    { name:"Trisha Reyes",  role:"Cashier",     type:"Sick Leave",      from:"Apr 21",  to:"Apr 22",  days:2, filed:"Apr 21", status:"Approved", reason:"Medical check-up" },
    { name:"Nico Valdez",   role:"Barista",     type:"Bereavement",     from:"Apr 19",  to:"Apr 21",  days:3, filed:"Apr 19", status:"Approved", reason:"Loss of family member" },
    { name:"Bea Tan",       role:"Shift Lead",  type:"Vacation Leave",  from:"Apr 23",  to:"Apr 24",  days:2, filed:"Apr 17", status:"Approved", reason:"Personal trip" },
    { name:"Luis Santos",   role:"Barista",     type:"Sick Leave",      from:"Apr 15",  to:"Apr 16",  days:2, filed:"Apr 15", status:"Rejected", reason:"Headache and fatigue" },
  ];

  const statusStyle = {
    "Pending":  { bg:"#fce9e9", color:"#811c12" },
    "Approved": { bg:"#edf6ea", color:"#4e8a40" },
    "Rejected": { bg:"#f3f3f3", color:"#888" },
  };

  const typeColors = {
    "Sick Leave":      "#a28587",
    "Vacation Leave":  "#811c12",
    "Emergency Leave": "#C4843A",
    "Bereavement":     "#7a3db0",
  };

  const summaryCards = [
    { label:"Pending",  count: requests.filter(r=>r.status==="Pending").length,  color:"#811c12" },
    { label:"Approved", count: requests.filter(r=>r.status==="Approved").length, color:"#4e8a40" },
    { label:"Rejected", count: requests.filter(r=>r.status==="Rejected").length, color:"#888" },
    { label:"Total",    count: requests.length,                                   color:"#444" },
  ];

  return (
    <AdminShell activeItem="Leave Management">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Leave Management</h1>
          <p style={{ fontSize:12, color:"#a28587", margin:"2px 0 0" }}>April 2026 · All Branches</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <select style={{ fontSize:12, padding:"7px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
            <option>All Types</option>
            <option>Sick Leave</option>
            <option>Vacation Leave</option>
          </select>
          <select style={{ fontSize:12, padding:"7px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
            <option>All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
          <button style={{ padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:600, border:`1.5px solid ${BRAND}`, color:BRAND, background:"transparent", cursor:"pointer" }}>
            Export
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:"flex", gap:10, marginBottom:18 }}>
        {summaryCards.map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"12px 20px", flex:1, boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
            <div style={{ fontSize:10.5, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color, marginTop:2 }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
              {["Employee","Leave Type","From","To","Days","Filed On","Reason","Status","Action"].map(h => (
                <th key={h} style={{ padding:"11px 12px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((r,i) => {
              const ss = statusStyle[r.status];
              const tc = typeColors[r.type] || "#666";
              return (
                <tr key={i} style={{ borderBottom:"1px solid #F8F1F1" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#fdf8f8"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:26, height:26, borderRadius:"50%", background:"#F3E4E4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:BRAND, flexShrink:0 }}>
                        {r.name.split(" ").map(n=>n[0]).join("")}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, color:"#110200", fontSize:12 }}>{r.name}</div>
                        <div style={{ fontSize:10.5, color:"#aaa" }}>{r.role}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ fontSize:11, fontWeight:600, color:tc }}>{r.type}</span>
                  </td>
                  <td style={{ padding:"10px 12px", color:"#555", fontSize:12 }}>{r.from}</td>
                  <td style={{ padding:"10px 12px", color:"#555", fontSize:12 }}>{r.to}</td>
                  <td style={{ padding:"10px 12px", color:"#666", fontWeight:600 }}>{r.days}d</td>
                  <td style={{ padding:"10px 12px", color:"#aaa", fontSize:11.5 }}>{r.filed}</td>
                  <td style={{ padding:"10px 12px", color:"#666", fontSize:11.5, maxWidth:140 }}>
                    <span style={{ display:"block", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", maxWidth:130 }}>{r.reason}</span>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ background:ss.bg, color:ss.color, fontSize:10.5, fontWeight:600, borderRadius:20, padding:"3px 10px" }}>{r.status}</span>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    {r.status === "Pending" ? (
                      <div style={{ display:"flex", gap:5 }}>
                        <button style={{ fontSize:10.5, padding:"3px 9px", borderRadius:6, border:"none", background:"#edf6ea", color:"#4e8a40", fontWeight:600, cursor:"pointer" }}>Approve</button>
                        <button style={{ fontSize:10.5, padding:"3px 9px", borderRadius:6, border:"none", background:"#fce9e9", color:"#811c12", fontWeight:600, cursor:"pointer" }}>Reject</button>
                      </div>
                    ) : (
                      <span style={{ color:"#ccc", fontSize:11 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"12px 14px", borderTop:"1px solid #F5EDED", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11.5, color:"#aaa" }}>Showing 8 of 24 requests</span>
          <div style={{ display:"flex", gap:4 }}>
            {[1,2,3].map(p => (
              <button key={p} style={{ width:28, height:28, borderRadius:6, border: p===1?"none":"1px solid #eee", background: p===1?BRAND:"#fff", color: p===1?"#fff":"#666", fontSize:12, cursor:"pointer", fontWeight: p===1?700:400 }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

Object.assign(window, { AdminAttendance, AdminLeave });
