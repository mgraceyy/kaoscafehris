
// KAOS Cafe HRIS — Admin Shell (Sidebar + Header)
// Shared layout used by all admin screen mockups

const BRAND = "#811c12";
const BLUSH = "#f7ebeb";
const ROSE  = "#a28587";
const CRIMSON = "#811C12";

const NAV_ITEMS = [
  { label: "Dashboard",         icon: "grid-2x2" },
  { label: "Employees",         icon: "users" },
  { label: "Branches",          icon: "building-2" },
  { label: "Schedule",          icon: "calendar-clock" },
  { label: "Attendance",        icon: "clipboard-check" },
  { label: "Leave Management",  icon: "calendar-days" },
  { label: "Overtime",          icon: "clock" },
  { label: "Holiday Management",icon: "party-popper" },
  { label: "Payroll",           icon: "wallet" },
  { label: "Reports",           icon: "bar-chart-3" },
  { label: "Settings",          icon: "settings" },
];

// Simple inline SVG icons
function Icon({ name, size = 18, color = "currentColor" }) {
  const icons = {
    "grid-2x2":        <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    "users":           <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    "building-2":      <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></>,
    "calendar-clock":  <><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><circle cx="17" cy="17" r="5"/><path d="M17 15v2l1.5 1.5"/></>,
    "clipboard-check": <><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></>,
    "calendar-days":   <><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></>,
    "clock":           <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    "party-popper":    <><path d="M3 11l19-9-9 19-2-8-8-2z"/></>,
    "wallet":          <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></>,
    "bar-chart-3":     <><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></>,
    "settings":        <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
    "log-out":         <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
    "chevron-down":    <><path d="m6 9 6 6 6-6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

function AdminShell({ activeItem = "Dashboard", children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:"'Inter','Segoe UI',sans-serif", fontSize:13, background:BLUSH }}>
      {/* Header */}
      <header style={{ height:56, background:BRAND, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", flexShrink:0, zIndex:10 }}>
        {/* Logo text */}
        <img src="assets/kaos-logo.png" alt="KAOS" style={{ height:36, width:"auto", filter:"brightness(0) invert(1)" }} />
        {/* User pill */}
        <div style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:12 }}>MG</div>
          <span style={{ color:"#fff", fontSize:13, fontWeight:500 }}>Maria Grace</span>
          <Icon name="chevron-down" size={14} color="rgba(255,255,255,0.8)" />
        </div>
      </header>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* Sidebar */}
        <aside style={{ width:220, background:"#fff", flexShrink:0, overflowY:"auto", borderRight:"1px solid #EEE4E4", paddingTop:8 }}>
          <nav style={{ padding:"4px 10px" }}>
            {NAV_ITEMS.map(({ label, icon }) => {
              const active = label === activeItem;
              return (
                <div key={label} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"9px 10px", borderRadius:8, marginBottom:2, cursor:"pointer",
                  // FIX: stronger active state — left border + deeper background
                  borderLeft: active ? `3px solid ${BRAND}` : "3px solid transparent",
                  background: active ? "#F3E4E4" : "transparent",
                  color: active ? BRAND : "#5a5a5a",
                  fontWeight: active ? 600 : 400,
                  transition:"all .15s",
                }}>
                  <Icon name={icon} size={16} color={active ? BRAND : "#888"} />
                  <span style={{ fontSize:12.5 }}>{label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex:1, overflowY:"auto", overflowX:"hidden", background:BLUSH, padding:24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { AdminShell, Icon, BRAND, BLUSH, ROSE, CRIMSON });
