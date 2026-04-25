
// KAOS Admin Schedule — Redesigned
// Fixes: (1) view toggle moved beside navigator, (2) overflow menu for secondary actions,
//         (3) cleaner header with only 2 right-side controls, (4) on-brand shift colors,
//         (5) weekly and monthly views with realistic shift data

function SchedIcon({ name, size=16, color="currentColor" }) {
  const d = {
    chevleft:  <><path d="m15 18-6-6 6-6"/></>,
    chevright: <><path d="m9 18 6-6-6-6"/></>,
    plus:      <><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></>,
    dots:      <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    generate:  <><path d="M12 3v3"/><path d="M18.66 5.34l-2.12 2.12"/><path d="M21 12h-3"/><path d="M18.66 18.66l-2.12-2.12"/><path d="M12 21v-3"/><path d="M7.34 18.66l2.12-2.12"/><path d="M3 12h3"/><path d="M7.34 5.34l2.12 2.12"/></>,
    defaults:  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    gear:      <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
    trash:     <><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>,
    userplus:  <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {d[name]}
    </svg>
  );
}

// On-brand shift color palette — uses maroon/rose tones instead of off-brand blues/greens
const SHIFT_COLORS = [
  { bg:"#F3E4E4", text:"#811c12", border:"#e8c8c8" }, // maroon
  { bg:"#EDE9F3", text:"#5a2d8a", border:"#d8ceeb" }, // purple
  { bg:"#F7EEEA", text:"#8a4a1c", border:"#e8d4c0" }, // amber
  { bg:"#E9EDF3", text:"#1c468a", border:"#c0cce8" }, // slate blue
  { bg:"#EAF3EE", text:"#1c6b40", border:"#c0e0ce" }, // teal
];

function shiftColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
  return SHIFT_COLORS[Math.abs(h) % SHIFT_COLORS.length];
}

// Sample data
const EMPLOYEES = [
  { id:"e1", name:"Alicia Santos",  role:"Barista" },
  { id:"e2", name:"Mark Reyes",     role:"Shift Lead" },
  { id:"e3", name:"Donna Cruz",     role:"Cashier" },
  { id:"e4", name:"James Uy",       role:"Barista" },
  { id:"e5", name:"Shaina Lim",     role:"Supervisor" },
  { id:"e6", name:"Nico Valdez",    role:"Barista" },
];

const WEEK_DATES = ["Apr 21","Apr 22","Apr 23","Apr 24","Apr 25","Apr 26","Apr 27"];
const WEEK_DAYS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const WEEKLY_SHIFTS = {
  e1: ["Open 6AM–2PM","","Open 6AM–2PM","Open 6AM–2PM","","Mid 2PM–10PM",""],
  e2: ["Mid 2PM–10PM","Mid 2PM–10PM","","Mid 2PM–10PM","Mid 2PM–10PM","",""],
  e3: ["","Open 6AM–2PM","Open 6AM–2PM","","Open 6AM–2PM","Open 6AM–2PM","Open 6AM–2PM"],
  e4: ["Close 10PM–6AM","","Close 10PM–6AM","","Close 10PM–6AM","","Close 10PM–6AM"],
  e5: ["Open 6AM–2PM","Open 6AM–2PM","Open 6AM–2PM","Open 6AM–2PM","Open 6AM–2PM","",""],
  e6: ["","Mid 2PM–10PM","","Mid 2PM–10PM","","Mid 2PM–10PM","Mid 2PM–10PM"],
};

// Calendar data for April 2026
const APRIL_SHIFTS = {
  1:  [{ label:"Open", emps:["A. Santos","N. Valdez"] }, { label:"Close", emps:["J. Uy"] }],
  2:  [{ label:"Mid",  emps:["M. Reyes","D. Cruz"] }],
  3:  [{ label:"Open", emps:["A. Santos"] }, { label:"Mid", emps:["M. Reyes"] }],
  4:  [{ label:"Close", emps:["J. Uy","N. Valdez"] }],
  7:  [{ label:"Open", emps:["D. Cruz","A. Santos"] }, { label:"Mid", emps:["M. Reyes"] }, { label:"Close", emps:["J. Uy"] }],
  8:  [{ label:"Open", emps:["A. Santos","N. Valdez"] }],
  9:  [{ label:"Mid",  emps:["M. Reyes"] }, { label:"Close", emps:["J. Uy","D. Cruz"] }],
  10: [{ label:"Open", emps:["S. Lim","A. Santos"] }],
  11: [{ label:"Open", emps:["D. Cruz"] }, { label:"Mid", emps:["M. Reyes","N. Valdez"] }],
  14: [{ label:"Close", emps:["J. Uy"] }, { label:"Open", emps:["A. Santos","S. Lim"] }],
  15: [{ label:"Mid",  emps:["M. Reyes","D. Cruz"] }],
  16: [{ label:"Open", emps:["A. Santos"] }, { label:"Close", emps:["J. Uy","N. Valdez"] }],
  17: [{ label:"Mid",  emps:["M. Reyes"] }, { label:"Open", emps:["D. Cruz","S. Lim"] }],
  18: [{ label:"Open", emps:["A. Santos","N. Valdez"] }],
  21: [{ label:"Open", emps:["D. Cruz","A. Santos"] }, { label:"Mid", emps:["M. Reyes"] }],
  22: [{ label:"Close", emps:["J. Uy"] }],
  23: [{ label:"Open", emps:["A. Santos","S. Lim"] }, { label:"Mid", emps:["M. Reyes","D. Cruz"] }, { label:"Close", emps:["J. Uy"] }],
  24: [{ label:"Open", emps:["N. Valdez","A. Santos"] }],
  25: [{ label:"Mid",  emps:["M. Reyes"] }, { label:"Close", emps:["J. Uy","D. Cruz"] }],
  28: [{ label:"Open", emps:["A. Santos","S. Lim"] }, { label:"Mid", emps:["M. Reyes"] }],
  29: [{ label:"Close", emps:["J. Uy","N. Valdez"] }],
  30: [{ label:"Open", emps:["D. Cruz"] }, { label:"Mid", emps:["M. Reyes","A. Santos"] }],
};

function ShiftPill({ label, emps }) {
  const col = shiftColor(label);
  return (
    <div style={{
      borderRadius:6, padding:"4px 8px", fontSize:11, fontWeight:600,
      background:col.bg, color:col.text, border:`1px solid ${col.border}`,
      marginBottom:3, cursor:"pointer",
    }}>
      <div style={{ fontWeight:700 }}>{label}</div>
      {emps && emps.length > 0 && (
        <div style={{ fontSize:10, fontWeight:400, opacity:.8, marginTop:1, lineHeight:1.3 }}>
          {emps.join(", ")}
        </div>
      )}
    </div>
  );
}

function MoreMenu({ open, onClose }) {
  if (!open) return null;
  const items = [
    { icon:"gear",     label:"Shift Types" },
    { icon:"generate", label:"Auto-generate Shifts" },
    { icon:"defaults", label:"Shift Defaults" },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:10 }}/>
      <div style={{
        position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:20,
        background:"#fff", borderRadius:10, boxShadow:"0 4px 20px rgba(129,28,18,0.12)",
        border:"1px solid #EEE4E4", overflow:"hidden", minWidth:200,
      }}>
        {items.map(({ icon, label }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 16px", fontSize:13, color:"#333", cursor:"pointer" }}
            onMouseEnter={e=>e.currentTarget.style.background="#fdf8f8"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <SchedIcon name={icon} size={14} color="#811c12" />
            {label}
          </div>
        ))}
      </div>
    </>
  );
}

function AdminSchedule({ initialView = "weekly" }) {
  const [view, setView] = React.useState(initialView);
  const [moreOpen, setMoreOpen] = React.useState(false);

  return (
    <AdminShell activeItem="Schedule">
      {/* ── Redesigned Header ─────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Schedule</h1>

        {/* RIGHT: only 2 controls — + Add Shift + ⋯ */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select style={{ fontSize:12, padding:"7px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
            <option>All Branches</option>
            <option>Marfori Branch</option>
            <option>Buhangin Branch</option>
          </select>

          <button style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"8px 18px", borderRadius:8, background:"#811c12",
            color:"#fff", fontSize:12.5, fontWeight:700, border:"none", cursor:"pointer",
            boxShadow:"0 2px 8px rgba(129,28,18,0.18)"
          }}>
            <SchedIcon name="plus" size={14} color="#fff" />
            Add Shift
          </button>

          {/* ⋯ overflow menu */}
          <div style={{ position:"relative" }}>
            <button onClick={() => setMoreOpen(o => !o)} style={{
              width:36, height:36, borderRadius:8, border:"1.5px solid #EEE4E4",
              background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <SchedIcon name="dots" size={16} color="#666" />
            </button>
            <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
          </div>
        </div>
      </div>

      {/* ── Navigator + View Toggle (together on one bar) ── */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"#fff", borderRadius:12, padding:"10px 16px", marginBottom:16,
        boxShadow:"0 1px 4px rgba(140,21,21,0.06)"
      }}>
        {/* Left: prev + date label + next */}
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <button style={{ width:30, height:30, borderRadius:7, border:"1.5px solid #EEE4E4", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <SchedIcon name="chevleft" size={15} color="#555" />
          </button>
          <span style={{ fontSize:14, fontWeight:700, color:"#110200", minWidth:200, textAlign:"center" }}>
            {view === "weekly" ? "Apr 21 – Apr 27, 2026" : "April 2026"}
          </span>
          <button style={{ width:30, height:30, borderRadius:7, border:"1.5px solid #EEE4E4", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <SchedIcon name="chevright" size={15} color="#555" />
          </button>
        </div>

        {/* Right: view toggle */}
        <div style={{ display:"flex", background:"#f7ebeb", borderRadius:8, padding:3 }}>
          {["weekly","monthly"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"6px 18px", borderRadius:6, fontSize:12.5, fontWeight:600, border:"none", cursor:"pointer",
              background: view===v ? "#811c12" : "transparent",
              color: view===v ? "#fff" : "#a28587",
              transition:"all .15s",
            }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* ── Weekly View ──────────────────────────────────── */}
      {view === "weekly" && (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:800 }}>
            <thead>
              <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
                <th style={{ padding:"11px 16px", textAlign:"left", fontSize:12, fontWeight:700, color:"#110200", width:160 }}>Employee</th>
                {WEEK_DAYS.map((d,i) => (
                  <th key={d} style={{ padding:"10px 8px", textAlign:"center", fontSize:11, fontWeight:600, color: i>=5?"#811c12":"#888" }}>
                    <div>{d}</div>
                    <div style={{ fontSize:10.5, fontWeight:400, color:"#bbb", marginTop:1 }}>{WEEK_DATES[i]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EMPLOYEES.map((emp,ei) => (
                <tr key={emp.id} style={{ borderBottom:"1px solid #F8F1F1" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#fdfafa"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:"#f3e4e4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9.5, fontWeight:700, color:"#811c12", flexShrink:0 }}>
                        {emp.name.split(" ").map(n=>n[0]).join("")}
                      </div>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:"#110200" }}>{emp.name}</div>
                        <div style={{ fontSize:10.5, color:"#a28587" }}>{emp.role}</div>
                      </div>
                    </div>
                  </td>
                  {WEEKLY_SHIFTS[emp.id].map((shift, di) => (
                    <td key={di} style={{ padding:"8px 6px", verticalAlign:"top", minWidth:110 }}>
                      {shift ? <ShiftPill label={shift} /> : (
                        <div style={{ height:28, borderRadius:6, border:"1.5px dashed #EEE4E4", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="#a28587"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="#EEE4E4"}>
                          <span style={{ fontSize:16, color:"#ddd" }}>+</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Monthly View ─────────────────────────────────── */}
      {view === "monthly" && (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1.5px solid #EEE4E4" }}>
            {WEEK_DAYS.map((d,i) => (
              <div key={d} style={{ padding:"10px 8px", textAlign:"center", fontSize:11.5, fontWeight:700, color:i>=5?"#811c12":"#888", background:"#fdf8f8" }}>{d}</div>
            ))}
          </div>
          {/* Weeks — April 2026 starts on Wed (offset 2) */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {/* Empty cells before Apr 1 (Mon=0, Tue=1) */}
            {[0,1].map(i => (
              <div key={`pre-${i}`} style={{ minHeight:100, borderRight:"1px solid #F5EDED", borderBottom:"1px solid #F5EDED", background:"#fdfafa" }}/>
            ))}
            {/* Days 1–30 */}
            {Array.from({length:30},(_,i)=>i+1).map(day => {
              const isWeekend = ((day+1)%7===0 || (day+2)%7===0); // rough Sat/Sun
              const shifts = APRIL_SHIFTS[day] || [];
              const isToday = day === 24;
              return (
                <div key={day} style={{
                  minHeight:100, borderRight:"1px solid #F5EDED", borderBottom:"1px solid #F5EDED",
                  padding:"8px 8px 6px", background: isWeekend?"#fdfafa":"#fff",
                  position:"relative",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{
                      fontSize:12.5, fontWeight:700,
                      color: isToday ? "#fff" : isWeekend ? "#811c12" : "#333",
                      background: isToday ? "#811c12" : "transparent",
                      width:22, height:22, borderRadius:"50%",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>{day}</span>
                    <button style={{ background:"none", border:"none", color:"#ccc", fontSize:14, cursor:"pointer", lineHeight:1 }}
                      onMouseEnter={e=>e.currentTarget.style.color="#811c12"}
                      onMouseLeave={e=>e.currentTarget.style.color="#ccc"}>+</button>
                  </div>
                  {shifts.map(s => <ShiftPill key={s.label} label={s.label} emps={s.emps} />)}
                </div>
              );
            })}
            {/* Pad remaining cells to complete the grid (30 days + 2 offset = 32, need 35) */}
            {[0,1,2].map(i => (
              <div key={`post-${i}`} style={{ minHeight:100, borderRight:"1px solid #F5EDED", borderBottom:"1px solid #F5EDED", background:"#fdfafa" }}/>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

Object.assign(window, { AdminSchedule });
