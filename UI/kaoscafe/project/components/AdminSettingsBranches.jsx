
// KAOS Admin — Settings & Branches screens

// ── Shared icon component ────────────────────────────────────────────────────
function SBIcon({ name, size=16, color="currentColor" }) {
  const d = {
    shield:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    building: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></>,
    payroll:  <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></>,
    clock:    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    phone:    <><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></>,
    pencil:   <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></>,
    trash:    <><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>,
    plus:     <><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></>,
    x:        <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    save:     <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    mappin:   <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
    users:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    gear:     <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
    chevron:  <><path d="m9 18 6-6-6-6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {d[name]}
    </svg>
  );
}

function SLabel({ children }) {
  return <div style={{ fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>{children}</div>;
}

function SInput({ placeholder, value, type="text" }) {
  return (
    <input readOnly type={type} defaultValue={value} placeholder={placeholder} style={{
      width:"100%", padding:"9px 12px", borderRadius:8,
      border:"1.5px solid #EEE4E4", background:"#fff", fontSize:13,
      color:"#333", outline:"none",
    }}/>
  );
}

function SSelect({ value, options }) {
  return (
    <select defaultValue={value} style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", fontSize:13, color:"#333", outline:"none", cursor:"pointer" }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

function SettingCard({ icon, iconBg, title, desc, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)", marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        {/* FIX: icon backgrounds now use brand palette tones */}
        <div style={{ width:38, height:38, borderRadius:10, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <SBIcon name={icon} size={18} color="#811c12" />
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"#110200" }}>{title}</div>
          <div style={{ fontSize:11.5, color:"#a28587" }}>{desc}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Role Configure Slide-over Panel ─────────────────────────────────────────
// Matches client reference: grouped modules, VIEW/CREATE/EDIT/DELETE columns,
// checkboxes for allowed, lock icons for Admin-only locked permissions

const MODULE_GROUPS = [
  {
    group: "PEOPLE & BRANCHES",
    modules: [
      { name:"Employees", desc:"Own branch only", note:"Cannot add, transfer, or remove employees",
        perms: { view:true,  create:"lock", edit:"lock", delete:"lock" } },
      { name:"Branches",  desc:"Own branch profile only", note:"Cannot create or delete branches",
        perms: { view:true,  create:"lock", edit:true,   delete:"lock" } },
    ],
  },
  {
    group: "OPERATIONS",
    modules: [
      { name:"Schedule",   desc:"Can create and manage shifts for their branch", note:"",
        perms: { view:true, create:true, edit:true, delete:true } },
      { name:"Attendance", desc:"Can correct attendance entries, cannot delete", note:"",
        perms: { view:true, create:true, edit:true, delete:"lock" } },
      { name:"Leave",      desc:"Can approve or reject leave requests", note:"",
        perms: { view:true, create:true, edit:true, delete:"lock" } },
    ],
  },
  {
    group: "FINANCE & REPORTING",
    modules: [
      { name:"Payroll", desc:"View only — cannot run or edit payroll", note:"",
        perms: { view:true, create:"lock", edit:"lock", delete:"lock" } },
      { name:"Reports", desc:"Attendance, schedule, and leave reports only", note:"",
        perms: { view:true, create:"lock", edit:"lock", delete:"lock" } },
    ],
  },
  {
    group: "SYSTEM",
    modules: [
      { name:"Settings", desc:"Admin / Owner only", note:"",
        perms: { view:"lock", create:"lock", edit:"lock", delete:"lock" } },
    ],
  },
];

const ADMIN_MODULE_GROUPS = [
  {
    group: "PEOPLE & BRANCHES",
    modules: [
      { name:"Employees", desc:"All branches", note:"",
        perms: { view:true, create:true, edit:true, delete:true } },
      { name:"Branches",  desc:"All branches", note:"",
        perms: { view:true, create:true, edit:true, delete:true } },
    ],
  },
  {
    group: "OPERATIONS",
    modules: [
      { name:"Schedule",   desc:"All branches", note:"", perms: { view:true, create:true, edit:true, delete:true } },
      { name:"Attendance", desc:"All branches", note:"", perms: { view:true, create:true, edit:true, delete:true } },
      { name:"Leave",      desc:"All branches", note:"", perms: { view:true, create:true, edit:true, delete:true } },
    ],
  },
  {
    group: "FINANCE & REPORTING",
    modules: [
      { name:"Payroll", desc:"Full access", note:"", perms: { view:true, create:true, edit:true, delete:true } },
      { name:"Reports", desc:"Full access", note:"", perms: { view:true, create:true, edit:true, delete:true } },
    ],
  },
  {
    group: "SYSTEM",
    modules: [
      { name:"Settings", desc:"Full access", note:"", perms: { view:true, create:true, edit:true, delete:true } },
    ],
  },
];

const EMPLOYEE_MODULE_GROUPS = [
  {
    group: "PEOPLE & BRANCHES",
    modules: [
      { name:"Employees", desc:"No access", note:"", perms: { view:"lock", create:"lock", edit:"lock", delete:"lock" } },
      { name:"Branches",  desc:"No access", note:"", perms: { view:"lock", create:"lock", edit:"lock", delete:"lock" } },
    ],
  },
  {
    group: "OPERATIONS",
    modules: [
      { name:"Schedule",   desc:"View own schedule only", note:"", perms: { view:true, create:"lock", edit:"lock", delete:"lock" } },
      { name:"Attendance", desc:"View own attendance only", note:"", perms: { view:true, create:"lock", edit:"lock", delete:"lock" } },
      { name:"Leave",      desc:"Can file own leave requests", note:"", perms: { view:true, create:true, edit:"lock", delete:"lock" } },
    ],
  },
  {
    group: "FINANCE & REPORTING",
    modules: [
      { name:"Payroll", desc:"View own payslips only", note:"", perms: { view:true, create:"lock", edit:"lock", delete:"lock" } },
      { name:"Reports", desc:"No access", note:"", perms: { view:"lock", create:"lock", edit:"lock", delete:"lock" } },
    ],
  },
  {
    group: "SYSTEM",
    modules: [
      { name:"Settings", desc:"No access", note:"", perms: { view:"lock", create:"lock", edit:"lock", delete:"lock" } },
    ],
  },
];

const ROLE_GROUP_MAP = {
  "Admin": ADMIN_MODULE_GROUPS,
  "Branch Manager": MODULE_GROUPS,
  "Employee": EMPLOYEE_MODULE_GROUPS,
};

const ROLE_META = {
  "Admin":          { sub:"Full system access — all branches and modules", note:"Can access and manage everything in the system." },
  "Branch Manager": { sub:"Branch-level access — own branch only", note:"Cannot access other branches, payroll computation, or system settings." },
  "Employee":       { sub:"Self-service access — portal only", note:"Can view own records and file requests through the portal." },
};

// Lock icon
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

// Checkbox
function Checkbox({ checked, locked, onChange }) {
  if (locked) return (
    <div style={{ width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <LockIcon />
    </div>
  );
  return (
    <div onClick={onChange} style={{
      width:18, height:18, borderRadius:4, cursor:"pointer",
      border: checked ? "none" : "2px solid #ccc",
      background: checked ? "#811c12" : "#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      flexShrink:0, transition:"all .15s",
    }}>
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </div>
  );
}

function RoleSlideOver({ role, onClose }) {
  const groups = ROLE_GROUP_MAP[role] || MODULE_GROUPS;
  const meta = ROLE_META[role] || ROLE_META["Branch Manager"];

  // State: { "Employees.view": true, "Employees.create": false, ... }
  const initPerms = {};
  groups.forEach(g => g.modules.forEach(m =>
    ["view","create","edit","delete"].forEach(a => {
      initPerms[`${m.name}.${a}`] = m.perms[a] === true;
    })
  ));
  const [perms, setPerms] = React.useState(initPerms);

  function toggle(key) {
    setPerms(p => ({ ...p, [key]: !p[key] }));
  }

  function isLocked(m, action) {
    return m.perms[action] === "lock";
  }

  return (
    <div style={{ position:"absolute", inset:0, zIndex:50, display:"flex" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex:1, background:"rgba(17,2,0,0.3)", backdropFilter:"blur(2px)" }}/>

      {/* Panel */}
      <div style={{
        width:560, height:"100%", background:"#fff", display:"flex", flexDirection:"column",
        boxShadow:"-8px 0 32px rgba(129,28,18,0.13)", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 14px", borderBottom:"1px solid #EEE4E4", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:"#110200" }}>Configure Role: {role}</div>
              <div style={{ fontSize:12.5, color:"#a28587", marginTop:2 }}>{meta.sub}</div>
              <div style={{ fontSize:11.5, color:"#bbb", marginTop:1 }}>{meta.note}</div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4, marginTop:2 }}>
              <SBIcon name="x" size={18} color="#888" />
            </button>
          </div>
          {/* Legend */}
          <div style={{ display:"flex", gap:20, marginTop:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#555" }}>
              <div style={{ width:16, height:16, borderRadius:3, background:"#811c12", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              Allowed
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#555" }}>
              <div style={{ width:16, height:16, borderRadius:3, background:"#444", border:"2px solid #444" }}/>
              Not allowed
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#555" }}>
              <LockIcon /> Locked — Admin only
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 0 8px" }}>
          {groups.map(({ group, modules }) => (
            <div key={group} style={{ marginBottom:0 }}>
              {/* Group header */}
              <div style={{ padding:"14px 24px 8px", fontSize:11, fontWeight:700, color:"#a28587", letterSpacing:.8, textTransform:"uppercase", background:"#fdf8f8", borderBottom:"1px solid #EEE4E4", borderTop:"1px solid #EEE4E4" }}>
                {group}
              </div>

              {/* Table */}
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid #F5EDED" }}>
                    <th style={{ padding:"8px 24px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, width:"55%" }}>Module</th>
                    {["View","Create","Edit","Delete"].map(h => (
                      <th key={h} style={{ padding:"8px 0", textAlign:"center", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, width:"11.25%" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m, i) => (
                    <tr key={m.name} style={{ borderBottom:"1px solid #F8F1F1", background: i%2===0?"#fff":"#fdfafa" }}>
                      <td style={{ padding:"12px 24px" }}>
                        <div style={{ fontWeight:700, color:"#110200", fontSize:13 }}>{m.name}</div>
                        {m.desc && <div style={{ fontSize:11.5, color:"#888", marginTop:1 }}>{m.desc}</div>}
                        {m.note && <div style={{ fontSize:11, color:"#bbb", marginTop:1, fontStyle:"italic" }}>{m.note}</div>}
                      </td>
                      {["view","create","edit","delete"].map(action => (
                        <td key={action} style={{ textAlign:"center", padding:"12px 0" }}>
                          <div style={{ display:"flex", justifyContent:"center" }}>
                            <Checkbox
                              checked={perms[`${m.name}.${action}`]}
                              locked={isLocked(m, action)}
                              onChange={() => !isLocked(m, action) && toggle(`${m.name}.${action}`)}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #EEE4E4", flexShrink:0, background:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11.5, color:"#bbb" }}>Locked permissions cannot be changed — they are fixed by system design.</span>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ padding:"9px 20px", borderRadius:9, border:"1.5px solid #ddd", background:"#fff", color:"#666", fontSize:13, fontWeight:600, cursor:"pointer" }}>
              Cancel
            </button>
            <button style={{ padding:"9px 22px", borderRadius:9, border:"none", background:"#811c12", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(129,28,18,0.2)" }}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Screen (with slide-over) ───────────────────────────────────────

function AdminSettings() {
  const [tab, setTab] = React.useState("general");
  const [govFilter, setGovFilter] = React.useState("All");
  const [configRole, setConfigRole] = React.useState(null);

  const govRows = [
    { type:"SSS",        empRate:"4.50%",  emplRate:"9.50%",  from:"₱1,000",  to:"₱29,750",  effective:"Jan 2025" },
    { type:"SSS",        empRate:"5.00%",  emplRate:"10.00%", from:"₱29,750", to:"₱35,000",  effective:"Jan 2025" },
    { type:"PhilHealth", empRate:"2.50%",  emplRate:"2.50%",  from:"₱10,000", to:"₱80,000",  effective:"Jan 2025" },
    { type:"Pag-IBIG",   empRate:"2.00%",  emplRate:"2.00%",  from:"₱1,500",  to:"₱5,000",   effective:"Jan 2025" },
    { type:"Pag-IBIG",   empRate:"2.00%",  emplRate:"2.00%",  from:"₱5,000",  to:"₱999,999", effective:"Jan 2025" },
    { type:"BIR",        empRate:"—",      emplRate:"—",      from:"₱20,833", to:"₱33,333",  effective:"Jan 2025" },
  ];

  const typeColors = { SSS:"#811c12", PhilHealth:"#a28587", "Pag-IBIG":"#C4843A", BIR:"#280906" };
  const filtered = govFilter === "All" ? govRows : govRows.filter(r => r.type === govFilter);

  return (
    <AdminShell activeItem="Settings">
      {/* Slide-over */}
      {configRole && <RoleSlideOver role={configRole} onClose={() => setConfigRole(null)} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Settings</h1>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:20, background:"#fff", borderRadius:10, padding:4, width:"fit-content", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
        {[["general","General"],["government","Government Tables"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:"8px 20px", borderRadius:8, fontSize:12.5, fontWeight: tab===id ? 700 : 500,
            border:"none", cursor:"pointer", transition:"all .15s",
            background: tab===id ? "#811c12" : "transparent",
            color: tab===id ? "#fff" : "#888",
          }}>{label}</button>
        ))}
      </div>

      {tab === "general" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, alignItems:"start" }}>

          {/* LEFT COLUMN */}
          <div>
            {/* Roles & Permissions */}
            <SettingCard icon="shield" iconBg="#fce9e9" title="Roles & Permissions" desc="Manage user roles and access permissions">
              {[
                { role:"Admin",          desc:"Full system access" },
                { role:"Branch Manager", desc:"Branch-level management" },
                { role:"Employee",       desc:"Self-service portal only" },
              ].map(r => (
                <div key={r.role} style={{ border:"1.5px solid #EEE4E4", borderRadius:10, padding:"11px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#110200" }}>{r.role}</div>
                    <div style={{ fontSize:11.5, color:"#a28587" }}>{r.desc}</div>
                  </div>
                  <button onClick={() => setConfigRole(r.role)} style={{ padding:"5px 14px", borderRadius:8, border:"1.5px solid #811c12", color:"#811c12", background:"transparent", fontSize:11.5, fontWeight:600, cursor:"pointer" }}>Configure</button>
                </div>
              ))}
            </SettingCard>

            {/* Company Settings */}
            <SettingCard icon="building" iconBg="#f3e9e9" title="Company Settings" desc="Configure company-wide settings">
              <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                <div>
                  <SLabel>Company Name</SLabel>
                  <SInput value="KAOS Café" />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <SLabel>Time Zone</SLabel>
                    <SSelect value="Asia/Manila (UTC+8)" options={["Asia/Manila (UTC+8)"]} />
                  </div>
                  <div>
                    <SLabel>Currency</SLabel>
                    <SSelect value="PHP" options={["PHP","USD"]} />
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <SLabel>Default Work Hours</SLabel>
                    <SInput value="8:00 AM – 5:00 PM" />
                  </div>
                  <div>
                    <SLabel>Payroll Frequency</SLabel>
                    <SSelect value="Bi-Monthly" options={["Weekly","Bi-Monthly","Monthly"]} />
                  </div>
                </div>
              </div>
            </SettingCard>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Attendance Settings */}
            <SettingCard icon="clock" iconBg="#f5eeee" title="Attendance Settings" desc="Configure attendance tracking behavior">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
                <div>
                  <SLabel>Late Threshold (mins)</SLabel>
                  <SInput value="15" type="number" />
                </div>
                <div>
                  <SLabel>Grace Period (mins)</SLabel>
                  <SInput value="5" type="number" />
                </div>
                <div>
                  <SLabel>Overtime Threshold (hrs)</SLabel>
                  <SInput value="8" type="number" />
                </div>
                <div>
                  <SLabel>Require Selfie</SLabel>
                  <SSelect value="Yes" options={["Yes","No"]} />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <SLabel>Absent if no clock-in after (hrs)</SLabel>
                  <SInput value="4" type="number" />
                </div>
              </div>
            </SettingCard>

            {/* Payroll Settings */}
            <SettingCard icon="payroll" iconBg="#f7eeea" title="Payroll Settings" desc="Configure payroll computation rules">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
                <div>
                  <SLabel>Regular OT Rate</SLabel>
                  <SInput value="1.25×" />
                </div>
                <div>
                  <SLabel>Rest Day OT Rate</SLabel>
                  <SInput value="1.30×" />
                </div>
                <div>
                  <SLabel>Night Diff Rate</SLabel>
                  <SInput value="1.10×" />
                </div>
                <div>
                  <SLabel>Holiday Pay Rate</SLabel>
                  <SInput value="2.00×" />
                </div>
                <div>
                  <SLabel>Payroll Cut-off Day</SLabel>
                  <SSelect value="15th & Last Day" options={["15th & Last Day","1st & 15th","Last Day"]} />
                </div>
                <div>
                  <SLabel>Tax Computation</SLabel>
                  <SSelect value="Annualized" options={["Annualized","Monthly"]} />
                </div>
              </div>
            </SettingCard>

            {/* Kiosk Settings */}
            <SettingCard icon="phone" iconBg="#ede9f3" title="Kiosk Settings" desc="Configure the self-service attendance kiosk">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
                <div>
                  <SLabel>Kiosk PIN</SLabel>
                  <SInput value="••••••" type="password" />
                </div>
                <div>
                  <SLabel>Auto-logout After (secs)</SLabel>
                  <SInput value="5" type="number" />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <SLabel>Camera Resolution</SLabel>
                  <SSelect value="720p (HD)" options={["480p","720p (HD)","1080p (Full HD)"]} />
                </div>
              </div>
            </SettingCard>
          </div>

          {/* Save button — full width */}
          <div style={{ gridColumn:"1/-1", display:"flex", justifyContent:"flex-end", paddingBottom:16 }}>
            <button style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 28px", borderRadius:10, background:"#811c12", color:"#fff", fontSize:13, fontWeight:700, border:"none", cursor:"pointer", boxShadow:"0 2px 8px rgba(129,28,18,0.2)" }}>
              <SBIcon name="save" size={14} color="#fff" /> Save Changes
            </button>
          </div>
        </div>
      )}

      {tab === "government" && (
        <div style={{ maxWidth:900 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:"20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#110200" }}>Deductions Management</div>
                <div style={{ fontSize:11.5, color:"#a28587" }}>SSS · PhilHealth · Pag-IBIG · BIR contribution rates</div>
              </div>
              <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, background:"#811c12", color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer" }}>
                <SBIcon name="plus" size={13} color="#fff" /> Add Entry
              </button>
            </div>

            {/* Filter pills */}
            <div style={{ display:"flex", gap:6, marginBottom:16 }}>
              {["All","SSS","PhilHealth","Pag-IBIG","BIR"].map(f => (
                <button key={f} onClick={() => setGovFilter(f)} style={{
                  padding:"5px 14px", borderRadius:20, fontSize:11.5, fontWeight:600, border:"none", cursor:"pointer",
                  background: govFilter===f ? "#811c12" : "#f7ebeb",
                  color: govFilter===f ? "#fff" : "#811c12",
                }}>{f}</button>
              ))}
            </div>

            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
                  {["Type","Employee Rate","Employer Rate","Range From","Range To","Effective","Actions"].map(h => (
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r,i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #F8F1F1" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#fdf8f8"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ fontWeight:700, color: typeColors[r.type]||"#333", fontSize:12 }}>{r.type}</span>
                    </td>
                    <td style={{ padding:"10px 12px", color:"#555", fontVariantNumeric:"tabular-nums" }}>{r.empRate}</td>
                    <td style={{ padding:"10px 12px", color:"#555", fontVariantNumeric:"tabular-nums" }}>{r.emplRate}</td>
                    <td style={{ padding:"10px 12px", color:"#666", fontVariantNumeric:"tabular-nums" }}>{r.from}</td>
                    <td style={{ padding:"10px 12px", color:"#666", fontVariantNumeric:"tabular-nums" }}>{r.to}</td>
                    <td style={{ padding:"10px 12px", color:"#aaa", fontSize:11.5 }}>{r.effective}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ display:"flex", gap:10 }}>
                        <button style={{ background:"none", border:"none", cursor:"pointer", color:"#a28587" }}><SBIcon name="pencil" size={14} color="#a28587" /></button>
                        <button style={{ background:"none", border:"none", cursor:"pointer", color:"#ccc" }}><SBIcon name="trash" size={14} color="#ccc" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

// ── Branches Screen ──────────────────────────────────────────────────────────

const BRANCHES = [
  { name:"Marfori Branch",   address:"123 Marfori St., Davao City",   manager:"Maria Grace Santos",  employees:18, active:true },
  { name:"Buhangin Branch",  address:"456 Buhangin Ave., Davao City",  manager:"Juan Dela Cruz",       employees:14, active:true },
  { name:"Matina Branch",    address:"789 Matina Blvd., Davao City",   manager:"Carlos Mendoza",       employees:12, active:true },
  { name:"Bajada Branch",    address:"321 Bajada Road, Davao City",    manager:"Ana Rodriguez",        employees:4,  active:false },
];

function AdminBranches({ onConfigure }) {
  return (
    <AdminShell activeItem="Branches">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Branches</h1>
          <p style={{ fontSize:12, color:"#a28587", margin:"2px 0 0" }}>{BRANCHES.length} branches · {BRANCHES.filter(b=>b.active).length} active</p>
        </div>
        <button style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:8, background:"#811c12", color:"#fff", fontSize:12.5, fontWeight:700, border:"none", cursor:"pointer" }}>
          <SBIcon name="plus" size={14} color="#fff" /> Add Branch
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display:"flex", gap:12, marginBottom:18 }}>
        {[
          { label:"Total Branches", value:BRANCHES.length, color:"#811c12" },
          { label:"Active",         value:BRANCHES.filter(b=>b.active).length, color:"#4e8a40" },
          { label:"Inactive",       value:BRANCHES.filter(b=>!b.active).length, color:"#a28587" },
          { label:"Total Staff",    value:BRANCHES.reduce((a,b)=>a+b.employees,0), color:"#280906" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"12px 18px", display:"flex", gap:10, alignItems:"center", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }}/>
            <span style={{ fontSize:12, color:"#666" }}>{s.label}</span>
            <span style={{ fontSize:17, fontWeight:800, color:s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
              {["Branch Name","Address","Branch Manager","Employees","Status","Actions"].map(h => (
                <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BRANCHES.map((b,i) => (
              <tr key={i} style={{ borderBottom:"1px solid #F8F1F1" }}
                onMouseEnter={e=>e.currentTarget.style.background="#fdf8f8"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"13px 14px" }}>
                  <div style={{ fontWeight:700, color:"#110200" }}>{b.name}</div>
                </td>
                <td style={{ padding:"13px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, color:"#a28587" }}>
                    <SBIcon name="mappin" size={13} color="#a28587" />
                    <span style={{ fontSize:12 }}>{b.address}</span>
                  </div>
                </td>
                <td style={{ padding:"13px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", background:"#f3e4e4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#811c12", flexShrink:0 }}>
                      {b.manager.split(" ").map(n=>n[0]).join("").slice(0,2)}
                    </div>
                    <span style={{ color:"#444", fontWeight:500 }}>{b.manager}</span>
                  </div>
                </td>
                <td style={{ padding:"13px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <SBIcon name="users" size={13} color="#a28587" />
                    <span style={{ fontWeight:600, color:"#110200" }}>{b.employees}</span>
                  </div>
                </td>
                <td style={{ padding:"13px 14px" }}>
                  <span style={{ fontSize:11, fontWeight:700, borderRadius:20, padding:"3px 12px",
                    background: b.active ? "#edf6ea" : "#f3f3f3",
                    color: b.active ? "#4e8a40" : "#888"
                  }}>{b.active ? "Active" : "Inactive"}</span>
                </td>
                <td style={{ padding:"13px 14px" }}>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => onConfigure && onConfigure(b)} style={{ fontSize:11.5, padding:"4px 12px", borderRadius:6, border:"1.5px solid #811c12", color:"#811c12", background:"transparent", fontWeight:600, cursor:"pointer" }}>
                      Configure
                    </button>
                    <button style={{ background:"none", border:"none", cursor:"pointer" }}>
                      <SBIcon name="pencil" size={14} color="#a28587" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

// ── Branch Configure Panel ───────────────────────────────────────────────────

const BRANCH_EMPLOYEES = [
  { name:"Alicia Santos",   role:"Barista",    status:"Active",  since:"Jan 2024" },
  { name:"Mark Reyes",      role:"Shift Lead",  status:"Active",  since:"Mar 2023" },
  { name:"Donna Cruz",      role:"Cashier",     status:"Active",  since:"Jun 2024" },
  { name:"James Uy",        role:"Barista",     status:"Active",  since:"Aug 2024" },
  { name:"Shaina Lim",      role:"Supervisor",  status:"On Leave",since:"Feb 2022" },
  { name:"Nico Valdez",     role:"Barista",     status:"Active",  since:"Nov 2023" },
];

function AdminBranchConfigure({ branch }) {
  const b = branch || BRANCHES[0];
  const [activeToggle, setActiveToggle] = React.useState(b.active);

  return (
    <AdminShell activeItem="Branches">
      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16, fontSize:12, color:"#a28587" }}>
        <span style={{ cursor:"pointer", color:"#811c12", fontWeight:600 }}>Branches</span>
        <SBIcon name="chevron" size={13} color="#ccc" />
        <span style={{ color:"#110200", fontWeight:600 }}>{b.name}</span>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>{b.name}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
            <SBIcon name="mappin" size={13} color="#a28587" />
            <span style={{ fontSize:12, color:"#a28587" }}>{b.address}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, border:"1.5px solid #811c12", color:"#811c12", background:"transparent", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <SBIcon name="pencil" size={13} color="#811c12" /> Edit Branch
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, background:"#811c12", color:"#fff", fontSize:12, fontWeight:700, border:"none", cursor:"pointer" }}>
            <SBIcon name="save" size={13} color="#fff" /> Save Changes
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:16 }}>
        {/* Left column */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { label:"Total Staff",    value:b.employees, color:"#811c12" },
              { label:"Active Today",   value:Math.floor(b.employees*0.8), color:"#4e8a40" },
              { label:"On Leave",       value:1,            color:"#C4843A" },
              { label:"Attend. Rate",   value:"94%",        color:"#280906" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"12px 14px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
                <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color, marginTop:2 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Branch details form */}
          <div style={{ background:"#fff", borderRadius:14, padding:"18px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Branch Details</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <SLabel>Branch Name</SLabel>
                <SInput value={b.name} />
              </div>
              <div>
                <SLabel>Address</SLabel>
                <SInput value={b.address} />
              </div>
              <div>
                <SLabel>Branch Manager</SLabel>
                <SInput value={b.manager} />
              </div>
              <div>
                <SLabel>Operating Hours</SLabel>
                <SInput value="6:00 AM – 12:00 AM" />
              </div>
              <div>
                <SLabel>Contact Number</SLabel>
                <SInput value="+63 82 123 4567" />
              </div>
              {/* Active toggle */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderTop:"1px solid #F5EDED" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#110200" }}>Branch Status</div>
                  <div style={{ fontSize:11.5, color:"#a28587" }}>Deactivating hides from kiosk</div>
                </div>
                <div onClick={() => setActiveToggle(a=>!a)} style={{ width:44, height:24, borderRadius:12, background: activeToggle?"#811c12":"#ddd", cursor:"pointer", position:"relative", transition:"background .2s" }}>
                  <div style={{ position:"absolute", top:3, left: activeToggle?22:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — employee list */}
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
          <div style={{ padding:"16px 18px", borderBottom:"1px solid #F5EDED", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#110200" }}>Branch Employees</div>
            <span style={{ fontSize:11.5, color:"#a28587" }}>{b.employees} total</span>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
            <thead>
              <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
                {["Employee","Role","Status","Since",""].map(h => (
                  <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRANCH_EMPLOYEES.map((e,i) => (
                <tr key={i} style={{ borderBottom:"1px solid #F8F1F1" }}
                  onMouseEnter={ev=>ev.currentTarget.style.background="#fdf8f8"}
                  onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:26, height:26, borderRadius:"50%", background:"#f3e4e4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#811c12", flexShrink:0 }}>
                        {e.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                      </div>
                      <span style={{ fontWeight:600, color:"#110200" }}>{e.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"10px 14px", color:"#666" }}>{e.role}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ fontSize:11, fontWeight:600, borderRadius:20, padding:"3px 10px",
                      background: e.status==="Active"?"#edf6ea":e.status==="On Leave"?"#fdf0e0":"#f3f3f3",
                      color: e.status==="Active"?"#4e8a40":e.status==="On Leave"?"#a06010":"#888"
                    }}>{e.status}</span>
                  </td>
                  <td style={{ padding:"10px 14px", color:"#aaa", fontSize:11.5 }}>{e.since}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <button style={{ background:"none", border:"none", cursor:"pointer" }}>
                      <SBIcon name="pencil" size={13} color="#ccc" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

Object.assign(window, { AdminSettings, AdminBranches, AdminBranchConfigure });
