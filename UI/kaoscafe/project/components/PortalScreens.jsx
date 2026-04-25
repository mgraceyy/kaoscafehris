
// KAOS Employee Portal — Redesigned mobile screens
// Fixes: Quick Access copy errors, Leave Request duplicate data

function PortalDashboard() {
  const quickAccess = [
    { icon:"calendar-clock", label:"View Schedule",      desc:"Check your upcoming shifts" },
    { icon:"clipboard-check",label:"Attendance History", desc:"View your time logs" },
    // FIX: was "Check your upcoming shifts" — corrected to match card purpose
    { icon:"receipt",        label:"Payslips",           desc:"View your payslips" },
    { icon:"user",           label:"Profile",            desc:"Manage your information" },
  ];

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", background:BLUSH, height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ background:BRAND, padding:"22px 20px 24px", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.75)", fontSize:13 }}>Good morning,</div>
            <div style={{ color:"#fff", fontSize:22, fontWeight:800, marginTop:1 }}>Emma</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11.5, marginTop:2 }}>Welcome back to your portal</div>
          </div>
          <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>EM</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px" }}>
        {/* Today's shift card */}
        <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", marginBottom:16, boxShadow:"0 2px 8px rgba(140,21,21,0.07)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:13.5, fontWeight:700, color:"#110200" }}>Today's Shift</span>
            <span style={{ fontSize:10.5, fontWeight:600, background:"#edf6ea", color:"#4e8a40", borderRadius:20, padding:"3px 10px" }}>Ongoing</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <Icon name="clock" size={14} color={ROSE} />
            <span style={{ fontSize:13, color:"#333", fontWeight:600 }}>10:00 PM – 6:00 AM</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <Icon name="building-2" size={14} color={ROSE} />
            <span style={{ fontSize:12.5, color:"#666" }}>Marfori Branch</span>
          </div>
          <div style={{ borderTop:"1px solid #EEE4E4", paddingTop:10, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:11.5, color:"#aaa" }}>Last clock-in: Today at 10:02 PM</span>
            <button style={{ fontSize:11.5, fontWeight:600, color:BRAND, background:"transparent", border:"none", cursor:"pointer", padding:0 }}>Clock Out →</button>
          </div>
        </div>

        {/* Quick Access */}
        <div style={{ fontSize:13.5, fontWeight:700, color:"#110200", marginBottom:10 }}>Quick Access</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {quickAccess.map(({ icon, label, desc }) => (
            <div key={label} style={{ background:"#fff", borderRadius:14, padding:"16px 14px", boxShadow:"0 1px 6px rgba(140,21,21,0.06)", cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background="#fdf8f8"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              <div style={{ width:34, height:34, borderRadius:10, background:"#F3E4E4", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <Icon name={icon} size={16} color={BRAND} />
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:11, color:"#aaa", lineHeight:1.4, marginBottom:10 }}>{desc}</div>
              <div style={{ fontSize:12, color:BRAND, fontWeight:600 }}>→</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <PortalBottomNav active="Home" />
    </div>
  );
}

function PortalLeaveRequest() {
  // FIX: Each card now has distinct, realistic leave requests instead of identical placeholder data
  const requests = [
    {
      type:"Sick Leave",
      reason:"Fever and flu — unable to report to work",
      from:"Apr 24, 2026", to:"Apr 25, 2026",
      filed:"Apr 22, 2026",
      status:"Pending",
      statusColor:{ bg:"#fce9e9", color:"#811c12" }
    },
    {
      type:"Vacation Leave",
      reason:"Family reunion in Cebu",
      from:"May 1, 2026", to:"May 3, 2026",
      filed:"Apr 18, 2026",
      status:"Approved",
      statusColor:{ bg:"#edf6ea", color:"#4e8a40" }
    },
    {
      type:"Emergency Leave",
      reason:"Family emergency — immediate travel required",
      from:"Mar 10, 2026", to:"Mar 11, 2026",
      filed:"Mar 10, 2026",
      status:"Approved",
      statusColor:{ bg:"#edf6ea", color:"#4e8a40" }
    },
  ];

  const typeColors = {
    "Sick Leave":      "#a28587",
    "Vacation Leave":  "#811c12",
    "Emergency Leave": "#C4843A",
  };

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", background:BLUSH, height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ background:BRAND, padding:"22px 20px 24px", flexShrink:0 }}>
        <div style={{ fontSize:22, fontWeight:800, color:"#fff" }}>Leave Requests</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", marginTop:3 }}>Track and file your leaves</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
        {/* File new leave button */}
        <button style={{
          width:"100%", padding:"13px", borderRadius:12, marginBottom:16,
          background:BRAND, color:"#fff", fontSize:13.5, fontWeight:700,
          border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8
        }}>
          <Icon name="calendar-days" size={16} color="#fff" />
          File a New Leave Request
        </button>

        {/* Leave balance strip */}
        <div style={{ background:"#fff", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", justifyContent:"space-around", boxShadow:"0 1px 6px rgba(140,21,21,0.06)" }}>
          {[["Sick","5 days"],["Vacation","8 days"],["Emergency","2 days"]].map(([t,v]) => (
            <div key={t} style={{ textAlign:"center" }}>
              <div style={{ fontSize:16, fontWeight:800, color:BRAND }}>{v.split(" ")[0]}</div>
              <div style={{ fontSize:10, color:"#aaa" }}>{t} days left</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize:12, fontWeight:600, color:"#888", marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>Your Requests</div>

        {/* Request cards — FIX: each card has unique content */}
        {requests.map((r,i) => (
          <div key={i} style={{ background:"#fff", borderRadius:14, padding:"16px", marginBottom:12, boxShadow:"0 1px 6px rgba(140,21,21,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <span style={{ fontSize:13.5, fontWeight:700, color: typeColors[r.type] || "#333" }}>{r.type}</span>
              <span style={{ fontSize:10.5, fontWeight:600, background:r.statusColor.bg, color:r.statusColor.color, borderRadius:20, padding:"3px 10px" }}>{r.status}</span>
            </div>
            <div style={{ fontSize:12, color:"#666", marginBottom:10, lineHeight:1.5 }}>{r.reason}</div>
            <div style={{ display:"flex", gap:14, marginBottom:8 }}>
              <div>
                <div style={{ fontSize:10, color:"#aaa", marginBottom:2 }}>FROM</div>
                <div style={{ fontSize:12, fontWeight:600, color:"#333" }}>{r.from}</div>
              </div>
              <div style={{ alignSelf:"center", color:"#ccc", fontSize:14 }}>→</div>
              <div>
                <div style={{ fontSize:10, color:"#aaa", marginBottom:2 }}>TO</div>
                <div style={{ fontSize:12, fontWeight:600, color:"#333" }}>{r.to}</div>
              </div>
            </div>
            <div style={{ borderTop:"1px solid #F5EDED", paddingTop:8, fontSize:11, color:"#bbb" }}>Filed on {r.filed}</div>
          </div>
        ))}
      </div>

      <PortalBottomNav active="Leave" />
    </div>
  );
}

function PortalBottomNav({ active }) {
  const items = [
    { label:"Home",       icon:"grid-2x2" },
    { label:"Schedule",   icon:"calendar-clock" },
    { label:"Attendance", icon:"clipboard-check" },
    { label:"Leave",      icon:"calendar-days" },
    { label:"Payslips",   icon:"wallet" },
    { label:"Profile",    icon:"user" },
  ];
  return (
    <div style={{ borderTop:"1px solid #EEE4E4", background:"#fff", display:"flex", padding:"8px 4px 4px", flexShrink:0 }}>
      {items.map(({ label, icon }) => {
        const isActive = label === active;
        return (
          <div key={label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", padding:"4px 0" }}>
            <Icon name={icon} size={18} color={isActive ? BRAND : "#bbb"} />
            <span style={{ fontSize:9, color: isActive ? BRAND : "#bbb", fontWeight: isActive ? 700 : 400 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Icon — needs to be redefined here since portal components run in same scope
function Icon({ name, size = 18, color = "currentColor" }) {
  const icons = {
    "grid-2x2":        <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    "clock":           <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    "building-2":      <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></>,
    "calendar-clock":  <><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><circle cx="17" cy="17" r="5"/><path d="M17 15v2l1.5 1.5"/></>,
    "clipboard-check": <><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></>,
    "calendar-days":   <><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></>,
    "wallet":          <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></>,
    "receipt":         <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></>,
    "user":            <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    "bar-chart-3":     <><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

Object.assign(window, { PortalDashboard, PortalLeaveRequest, PortalBottomNav });
