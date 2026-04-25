
// KAOS Admin Employees — Redesigned
// Improvements: summary strip, denser table, employment status filter,
// avatar initials, position column, employee profile slide-over

function EmpIcon({ name, size=16, color="currentColor" }) {
  const d = {
    search:   <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    plus:     <><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></>,
    upload:   <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>,
    pencil:   <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></>,
    x:        <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    phone:    <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 13.47 19.79 19.79 0 0 1 1 4.84 2 2 0 0 1 2.96 2.67h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></>,
    mail:     <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
    calendar: <><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="3" x2="21" y1="10" y2="10"/></>,
    building: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></>,
    chevron:  <><path d="m9 18 6-6-6-6"/></>,
    id:       <><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 15v-4a2 2 0 0 1 4 0v4"/><path d="M7 13h4"/><path d="M15 9v6"/></>,
    save:     <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {d[name]}
    </svg>
  );
}

const EMPLOYEES_DATA = [
  { id:"EMP-001", name:"Alicia Santos",   pos:"Barista",    role:"Employee", branch:"Marfori",  status:"ACTIVE",    phone:"+63 912 345 6789", email:"alicia@kaoscafe.com",  hired:"Jan 15, 2023", dob:"Mar 22, 1998" },
  { id:"EMP-002", name:"Mark Reyes",      pos:"Shift Lead", role:"Manager",  branch:"Marfori",  status:"ACTIVE",    phone:"+63 917 234 5678", email:"mark@kaoscafe.com",    hired:"Mar 8, 2022",  dob:"Jul 14, 1995" },
  { id:"EMP-003", name:"Donna Cruz",      pos:"Cashier",    role:"Employee", branch:"Marfori",  status:"ACTIVE",    phone:"+63 918 123 4567", email:"donna@kaoscafe.com",   hired:"Jun 1, 2024",  dob:"Nov 5, 2000"  },
  { id:"EMP-004", name:"James Uy",        pos:"Barista",    role:"Employee", branch:"Marfori",  status:"ACTIVE",    phone:"+63 915 567 8901", email:"james@kaoscafe.com",   hired:"Aug 20, 2024", dob:"Feb 18, 2001" },
  { id:"EMP-005", name:"Shaina Lim",      pos:"Supervisor", role:"Manager",  branch:"Buhangin", status:"ON_LEAVE",  phone:"+63 916 678 9012", email:"shaina@kaoscafe.com",  hired:"Feb 10, 2022", dob:"Sep 30, 1994" },
  { id:"EMP-006", name:"Nico Valdez",     pos:"Barista",    role:"Employee", branch:"Marfori",  status:"ACTIVE",    phone:"+63 919 789 0123", email:"nico@kaoscafe.com",    hired:"Nov 3, 2023",  dob:"Dec 8, 1999"  },
  { id:"EMP-007", name:"Trisha Reyes",    pos:"Cashier",    role:"Employee", branch:"Buhangin", status:"ACTIVE",    phone:"+63 912 890 1234", email:"trisha@kaoscafe.com",  hired:"Sep 12, 2023", dob:"Apr 14, 2000" },
  { id:"EMP-008", name:"Carlo Mendoza",   pos:"Barista",    role:"Employee", branch:"Buhangin", status:"ACTIVE",    phone:"+63 917 901 2345", email:"carlo@kaoscafe.com",   hired:"Jul 7, 2024",  dob:"Aug 22, 2002" },
  { id:"EMP-009", name:"Bea Tan",         pos:"Shift Lead", role:"Manager",  branch:"Matina",   status:"ACTIVE",    phone:"+63 918 012 3456", email:"bea@kaoscafe.com",     hired:"Apr 5, 2021",  dob:"Jan 17, 1993" },
  { id:"EMP-010", name:"Luis Santos",     pos:"Barista",    role:"Employee", branch:"Matina",   status:"INACTIVE",  phone:"+63 915 123 4567", email:"luis@kaoscafe.com",    hired:"Oct 1, 2022",  dob:"May 25, 1997" },
];

const STATUS_MAP = {
  ACTIVE:     { bg:"#edf6ea", color:"#4e8a40", label:"Active" },
  ON_LEAVE:   { bg:"#fdf0e0", color:"#a06010", label:"On Leave" },
  INACTIVE:   { bg:"#f3f3f3", color:"#888",    label:"Inactive" },
  TERMINATED: { bg:"#fce9e9", color:"#811c12", label:"Terminated" },
};

// ── Employee Profile Slide-over ──────────────────────────────────────────────
function EmployeeSlideOver({ emp, onClose }) {
  if (!emp) return null;
  const st = STATUS_MAP[emp.status];
  const initials = emp.name.split(" ").map(n=>n[0]).join("").slice(0,2);

  return (
    <div style={{ position:"absolute", inset:0, zIndex:50, display:"flex" }}>
      <div onClick={onClose} style={{ flex:1, background:"rgba(17,2,0,0.3)", backdropFilter:"blur(2px)" }}/>
      <div style={{ width:420, height:"100%", background:"#fff", display:"flex", flexDirection:"column", boxShadow:"-8px 0 32px rgba(129,28,18,0.13)", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, #280906 0%, #811c12 100%)`, padding:"24px 24px 20px", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:7, padding:"5px 7px", cursor:"pointer" }}>
              <EmpIcon name="x" size={16} color="#fff" />
            </button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff", border:"2px solid rgba(255,255,255,0.3)", flexShrink:0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{emp.name}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", marginTop:2 }}>{emp.pos} · {emp.branch} Branch</div>
              <span style={{ fontSize:11, fontWeight:700, background:"rgba(255,255,255,0.15)", color:"#fff", borderRadius:20, padding:"2px 10px", marginTop:6, display:"inline-block" }}>
                {st.label}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          {/* Quick info */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            {[
              { icon:"id",       label:"Employee ID",  value:emp.id },
              { icon:"building", label:"Branch",       value:`${emp.branch} Branch` },
              { icon:"calendar", label:"Hired",        value:emp.hired },
              { icon:"calendar", label:"Birthday",     value:emp.dob },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background:"#fdf8f8", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <EmpIcon name={icon} size={12} color="#a28587" />
                  <span style={{ fontSize:10, color:"#a28587", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{label}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:"#110200" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#110200", marginBottom:10 }}>Contact Information</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fdf8f8", borderRadius:10 }}>
                <EmpIcon name="phone" size={14} color="#a28587" />
                <span style={{ fontSize:13, color:"#333" }}>{emp.phone}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fdf8f8", borderRadius:10 }}>
                <EmpIcon name="mail" size={14} color="#a28587" />
                <span style={{ fontSize:13, color:"#333" }}>{emp.email}</span>
              </div>
            </div>
          </div>

          {/* Employment details */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#110200", marginBottom:10 }}>Employment Details</div>
            <div style={{ border:"1.5px solid #EEE4E4", borderRadius:10, overflow:"hidden" }}>
              {[
                ["Position",   emp.pos],
                ["Role",       emp.role],
                ["Status",     <span style={{ fontSize:11, fontWeight:700, background:st.bg, color:st.color, borderRadius:20, padding:"2px 10px" }}>{st.label}</span>],
                ["Branch",     `${emp.branch} Branch`],
                ["Start Date", emp.hired],
              ].map(([k,v],i) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom: i<4?"1px solid #F5EDED":"none", background:i%2===0?"#fff":"#fdfafa" }}>
                  <span style={{ fontSize:12, color:"#a28587", fontWeight:500 }}>{k}</span>
                  <span style={{ fontSize:13, color:"#110200", fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #EEE4E4", display:"flex", gap:10, justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid #ddd", background:"#fff", color:"#666", fontSize:13, fontWeight:600, cursor:"pointer" }}>Close</button>
          <button style={{ padding:"9px 20px", borderRadius:9, border:"none", background:"#811c12", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <EmpIcon name="pencil" size={13} color="#fff" /> Edit Employee
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Employees Screen ────────────────────────────────────────────────────
function AdminEmployees() {
  const [search, setSearch] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [selectedEmp, setSelectedEmp] = React.useState(null);

  const filtered = EMPLOYEES_DATA.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.id.includes(search)) return false;
    if (branchFilter !== "All" && e.branch !== branchFilter) return false;
    if (statusFilter !== "All" && e.status !== statusFilter) return false;
    return true;
  });

  const summary = [
    { label:"Total",    value:EMPLOYEES_DATA.length,                                    color:"#811c12" },
    { label:"Active",   value:EMPLOYEES_DATA.filter(e=>e.status==="ACTIVE").length,     color:"#4e8a40" },
    { label:"On Leave", value:EMPLOYEES_DATA.filter(e=>e.status==="ON_LEAVE").length,   color:"#a06010" },
    { label:"Inactive", value:EMPLOYEES_DATA.filter(e=>e.status==="INACTIVE").length,   color:"#888" },
  ];

  return (
    <AdminShell activeItem="Employees">
      {selectedEmp && <EmployeeSlideOver emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}

      {/* Page header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Employees</h1>
          <p style={{ fontSize:12, color:"#a28587", margin:"2px 0 0" }}>{EMPLOYEES_DATA.length} employees · 3 branches</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#555", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>
            <EmpIcon name="upload" size={13} color="#555" /> Import CSV
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:8, background:"#811c12", color:"#fff", fontSize:12.5, fontWeight:700, border:"none", cursor:"pointer", boxShadow:"0 2px 8px rgba(129,28,18,0.18)" }}>
            <EmpIcon name="plus" size={14} color="#fff" /> Add Employee
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display:"flex", gap:12, marginBottom:18 }}>
        {summary.map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"12px 20px", flex:1, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:"#888" }}>{s.label}</span>
            <span style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", gap:10, alignItems:"center", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
        {/* Search */}
        <div style={{ position:"relative", flex:1 }}>
          <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}>
            <EmpIcon name="search" size={14} color="#ccc" />
          </div>
          <input
            type="text" placeholder="Search by name or ID…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:"100%", padding:"8px 12px 8px 32px", borderRadius:8, border:"1.5px solid #EEE4E4", fontSize:12.5, outline:"none", color:"#333" }}
          />
        </div>
        <select value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} style={{ fontSize:12, padding:"8px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
          <option>All</option>
          <option>Marfori</option>
          <option>Buhangin</option>
          <option>Matina</option>
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ fontSize:12, padding:"8px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
          <option>All</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <select style={{ fontSize:12, padding:"8px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
          <option>All Roles</option>
          <option>Manager</option>
          <option>Employee</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
              {["Employee ID","Name","Position","Branch","Role","Status","Actions"].map(h => (
                <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e,i) => {
              const st = STATUS_MAP[e.status];
              const initials = e.name.split(" ").map(n=>n[0]).join("").slice(0,2);
              return (
                <tr key={e.id} style={{ borderBottom:"1px solid #F8F1F1", cursor:"pointer" }}
                  onMouseEnter={ev=>ev.currentTarget.style.background="#fdfafa"}
                  onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}
                  onClick={() => setSelectedEmp(e)}>
                  <td style={{ padding:"11px 14px", fontFamily:"monospace", fontSize:11.5, color:"#a28587" }}>{e.id}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                      <div style={{ width:30, height:30, borderRadius:"50%", background:"#F3E4E4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10.5, fontWeight:700, color:"#811c12", flexShrink:0 }}>
                        {initials}
                      </div>
                      <span style={{ fontWeight:700, color:"#110200" }}>{e.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"11px 14px", color:"#555" }}>{e.pos}</td>
                  <td style={{ padding:"11px 14px", color:"#666" }}>{e.branch}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:11, fontWeight:600, background: e.role==="Manager"?"#f3e4e4":"#f3f3f3", color: e.role==="Manager"?"#811c12":"#666", borderRadius:20, padding:"3px 10px" }}>{e.role}</span>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:11, fontWeight:700, borderRadius:20, padding:"3px 10px", background:st.bg, color:st.color }}>{st.label}</span>
                  </td>
                  <td style={{ padding:"11px 14px" }} onClick={ev => ev.stopPropagation()}>
                    <button onClick={() => setSelectedEmp(e)} style={{ fontSize:12, color:"#811c12", fontWeight:600, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                      <EmpIcon name="pencil" size={13} color="#811c12" /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Pagination */}
        <div style={{ padding:"12px 14px", borderTop:"1px solid #F5EDED", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11.5, color:"#aaa" }}>Showing {filtered.length} of {EMPLOYEES_DATA.length} employees</span>
          <div style={{ display:"flex", gap:4 }}>
            {[1,2,3].map(p => (
              <button key={p} style={{ width:28, height:28, borderRadius:6, border:p===1?"none":"1px solid #eee", background:p===1?"#811c12":"#fff", color:p===1?"#fff":"#666", fontSize:12, cursor:"pointer", fontWeight:p===1?700:400 }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ── Add / Edit Employee Slide-over ──────────────────────────────────────────

function FLabel({ children, required }) {
  return (
    <div style={{ fontSize:11, color:"#a28587", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, marginBottom:5 }}>
      {children}{required && <span style={{ color:"#811c12", marginLeft:3 }}>*</span>}
    </div>
  );
}

function FInput({ placeholder, type="text", value, mono }) {
  return (
    <input readOnly type={type} defaultValue={value} placeholder={placeholder} style={{
      width:"100%", padding:"9px 12px", borderRadius:8,
      border:"1.5px solid #EEE4E4", background:"#fff", fontSize:13,
      color: value ? "#110200" : "#bbb", outline:"none",
      fontFamily: mono ? "monospace" : "inherit",
    }}/>
  );
}

function FSelect({ value, options }) {
  return (
    <select defaultValue={value} style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", fontSize:13, color:"#333", outline:"none", cursor:"pointer" }}>
      {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function FSectionTitle({ children }) {
  return (
    <div style={{ fontSize:11.5, fontWeight:700, color:"#811c12", textTransform:"uppercase", letterSpacing:.6, paddingBottom:8, borderBottom:"1.5px solid #f3e4e4", marginBottom:12 }}>
      {children}
    </div>
  );
}

function AddEmployeeSlideOver({ onClose, isEdit=false }) {
  const emp = isEdit ? {
    email:"mark@kaoscafe.com", role:"MANAGER", empId:"EMP-002",
    branch:"Marfori Branch", firstName:"Mark", lastName:"Reyes",
    phone:"+63 917 234 5678", position:"Shift Lead", dept:"Operations",
    status:"ACTIVE", hired:"2022-03-08", salary:"24500",
  } : {};

  return (
    <div style={{ position:"absolute", inset:0, zIndex:50, display:"flex" }}>
      <div onClick={onClose} style={{ flex:1, background:"rgba(17,2,0,0.3)", backdropFilter:"blur(2px)" }}/>
      <div style={{ width:520, height:"100%", background:"#fff", display:"flex", flexDirection:"column", boxShadow:"-8px 0 32px rgba(129,28,18,0.13)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #EEE4E4", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:"#110200" }}>{isEdit ? "Edit Employee" : "Add New Employee"}</div>
              <div style={{ fontSize:12, color:"#a28587", marginTop:2 }}>
                {isEdit ? "Update profile and account details." : "Create the user login and employee profile."}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
              <EmpIcon name="x" size={18} color="#888" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* ── Account ── */}
          <FSectionTitle>Account</FSectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div>
              <FLabel required>Employee ID</FLabel>
              <FInput placeholder="EMP-011" value={emp.empId} mono />
            </div>
            <div>
              <FLabel required>System Role</FLabel>
              <FSelect value={emp.role||"EMPLOYEE"} options={[["EMPLOYEE","Employee"],["MANAGER","Branch Manager"],["ADMIN","Admin"]]} />
            </div>
            <div>
              <FLabel required={!isEdit}>{isEdit ? "New Password (optional)" : "Password"}</FLabel>
              <FInput type="password" placeholder={isEdit ? "Leave blank to keep" : "Min. 8 characters"} />
            </div>
            <div>
              <FLabel required>Employment Status</FLabel>
              <FSelect value={emp.status||"ACTIVE"} options={[["ACTIVE","Active"],["ON_LEAVE","On Leave"],["INACTIVE","Inactive"],["TERMINATED","Terminated"]]} />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <FLabel>Email Address</FLabel>
              <FInput placeholder="employee@kaoscafe.com" value={emp.email} />
            </div>
          </div>

          {/* ── Identity ── */}
          <FSectionTitle>Identity</FSectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div>
              <FLabel required>Branch</FLabel>
              <FSelect value={emp.branch||""} options={[["","Select branch…"],["Marfori Branch","Marfori Branch"],["Buhangin Branch","Buhangin Branch"],["Matina Branch","Matina Branch"]]} />
            </div>
            <div>
              <FLabel required>First Name</FLabel>
              <FInput placeholder="Juan" value={emp.firstName} />
            </div>
            <div>
              <FLabel>Middle Name</FLabel>
              <FInput placeholder="Santos" />
            </div>
            <div>
              <FLabel required>Last Name</FLabel>
              <FInput placeholder="Dela Cruz" value={emp.lastName} />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <FLabel>Phone Number</FLabel>
              <FInput placeholder="+63 9xx xxx xxxx" value={emp.phone} />
            </div>
          </div>

          {/* ── Employment ── */}
          <FSectionTitle>Employment</FSectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:8 }}>
            <div>
              <FLabel required>Position / Job Title</FLabel>
              <FInput placeholder="Barista" value={emp.position} />
            </div>
            <div>
              <FLabel>Department</FLabel>
              <FInput placeholder="Operations" value={emp.dept} />
            </div>
            <div>
              <FLabel required>Date Hired</FLabel>
              <FInput type="date" value={emp.hired} />
            </div>
            <div>
              <FLabel required>Basic Salary (PHP/month)</FLabel>
              <FInput type="number" placeholder="0.00" value={emp.salary} />
            </div>
          </div>

          {/* Tip */}
          <div style={{ marginTop:16, padding:"10px 14px", background:"#fdf8f8", borderRadius:10, fontSize:12, color:"#a28587", border:"1px solid #EEE4E4" }}>
            💡 Fields marked with <span style={{ color:"#811c12", fontWeight:700 }}>*</span> are required. The employee will receive a login link via email after creation.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #EEE4E4", flexShrink:0, background:"#fff", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 20px", borderRadius:9, border:"1.5px solid #ddd", background:"#fff", color:"#666", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Cancel
          </button>
          <button style={{ padding:"9px 24px", borderRadius:9, border:"none", background:"#811c12", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(129,28,18,0.2)", display:"flex", alignItems:"center", gap:6 }}>
            <EmpIcon name="save" size={13} color="#fff" />
            {isEdit ? "Save Changes" : "Create Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddEmployeeSlideOver });
