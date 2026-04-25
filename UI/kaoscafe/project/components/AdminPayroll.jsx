
// KAOS Admin Payroll — Redesigned
// 4 screens: (1) Payroll Runs list, (2) Run Detail / Payslips table,
//            (3) Payslip View, (4) Payslip Edit

function PayIcon({ name, size=16, color="currentColor" }) {
  const d = {
    plus:      <><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></>,
    chevleft:  <><path d="m15 18-6-6 6-6"/></>,
    chevright: <><path d="m9 18 6-6-6-6"/></>,
    download:  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>,
    play:      <><polygon points="5 3 19 12 5 21 5 3"/></>,
    check:     <><path d="M20 6 9 17l-5-5"/></>,
    pencil:    <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></>,
    trash:     <><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>,
    file:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    search:    <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    gear:      <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {d[name]}
    </svg>
  );
}

function fmt(n) { return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits:2, maximumFractionDigits:2 }); }

const STATUS_STYLE = {
  Draft:       { bg:"#f3f3f3", color:"#888" },
  Processing:  { bg:"#fdf0e0", color:"#a06010" },
  Finalized:   { bg:"#edf6ea", color:"#4e8a40" },
  Cancelled:   { bg:"#fce9e9", color:"#811c12" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Draft;
  return <span style={{ fontSize:11, fontWeight:700, borderRadius:20, padding:"3px 12px", background:s.bg, color:s.color }}>{status}</span>;
}

// ── 1. Payroll Runs List ─────────────────────────────────────────────────────

const RUNS = [
  { id:1, branch:"Marfori Branch",  period:"Apr 1–15, 2026",  payslips:18, net:"₱284,600", status:"Draft" },
  { id:2, branch:"Marfori Branch",  period:"Mar 16–31, 2026", payslips:18, net:"₱281,200", status:"Finalized" },
  { id:3, branch:"Buhangin Branch", period:"Apr 1–15, 2026",  payslips:14, net:"₱218,400", status:"Processing" },
  { id:4, branch:"Buhangin Branch", period:"Mar 16–31, 2026", payslips:14, net:"₱215,800", status:"Finalized" },
  { id:5, branch:"Matina Branch",   period:"Apr 1–15, 2026",  payslips:12, net:"₱189,600", status:"Draft" },
  { id:6, branch:"Matina Branch",   period:"Mar 16–31, 2026", payslips:12, net:"₱186,400", status:"Finalized" },
];

function AdminPayroll({ onView }) {
  return (
    <AdminShell activeItem="Payroll">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Payroll</h1>
          <p style={{ fontSize:12, color:"#a28587", margin:"2px 0 0" }}>Bi-monthly payroll runs · April 2026</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#555", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>
            <PayIcon name="gear" size={13} color="#888" /> Settings
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:8, background:"#811c12", color:"#fff", fontSize:12.5, fontWeight:700, border:"none", cursor:"pointer", boxShadow:"0 2px 8px rgba(129,28,18,0.18)" }}>
            <PayIcon name="plus" size={14} color="#fff" /> New Run
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display:"flex", gap:12, marginBottom:18 }}>
        {[
          { label:"Total Runs",     value:RUNS.length,                               color:"#811c12" },
          { label:"Finalized",      value:RUNS.filter(r=>r.status==="Finalized").length, color:"#4e8a40" },
          { label:"In Progress",    value:RUNS.filter(r=>r.status==="Processing").length, color:"#a06010" },
          { label:"Draft",          value:RUNS.filter(r=>r.status==="Draft").length,  color:"#888" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"12px 20px", flex:1, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:"#888" }}>{s.label}</span>
            <span style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:"#fff", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", gap:10, boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
        <div style={{ position:"relative", flex:1 }}>
          <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}>
            <PayIcon name="search" size={13} color="#ccc" />
          </div>
          <input placeholder="Search by branch…" style={{ width:"100%", padding:"8px 12px 8px 30px", borderRadius:8, border:"1.5px solid #EEE4E4", fontSize:12.5, outline:"none" }}/>
        </div>
        <select style={{ fontSize:12, padding:"8px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444" }}>
          <option>All Branches</option>
          <option>Marfori Branch</option>
          <option>Buhangin Branch</option>
          <option>Matina Branch</option>
        </select>
        <select style={{ fontSize:12, padding:"8px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444" }}>
          <option>All Status</option>
          <option>Draft</option>
          <option>Processing</option>
          <option>Finalized</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
              {["Branch","Period","Payslips","Net Pay","Status",""].map(h => (
                <th key={h} style={{ padding:"11px 16px", textAlign: h==="Net Pay"?"right":"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RUNS.map((r,i) => (
              <tr key={r.id} style={{ borderBottom:"1px solid #F8F1F1", cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background="#fdfafa"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                onClick={() => onView && onView(r)}>
                <td style={{ padding:"13px 16px", fontWeight:700, color:"#110200" }}>{r.branch}</td>
                <td style={{ padding:"13px 16px", color:"#666" }}>{r.period}</td>
                <td style={{ padding:"13px 16px", color:"#888" }}>{r.payslips} employees</td>
                <td style={{ padding:"13px 16px", textAlign:"right", fontWeight:700, color:"#110200", fontVariantNumeric:"tabular-nums" }}>{r.net}</td>
                <td style={{ padding:"13px 16px" }}><StatusBadge status={r.status} /></td>
                <td style={{ padding:"13px 16px", textAlign:"right" }}>
                  <PayIcon name="chevright" size={16} color="#ccc" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

// ── 2. Payroll Run Detail ────────────────────────────────────────────────────

const PAYSLIPS = [
  { id:"EMP-001", name:"Alicia Santos",  pos:"Barista",    basic:"₱9,100",  gross:"₱10,200", deduct:"₱1,800",  net:"₱8,400",  status:"Draft" },
  { id:"EMP-002", name:"Mark Reyes",     pos:"Shift Lead", basic:"₱12,250", gross:"₱13,800", deduct:"₱2,200",  net:"₱11,600", status:"Draft" },
  { id:"EMP-003", name:"Donna Cruz",     pos:"Cashier",    basic:"₱9,100",  gross:"₱9,500",  deduct:"₱1,650",  net:"₱7,850",  status:"Draft" },
  { id:"EMP-004", name:"James Uy",       pos:"Barista",    basic:"₱9,100",  gross:"₱10,100", deduct:"₱1,750",  net:"₱8,350",  status:"Draft" },
  { id:"EMP-005", name:"Shaina Lim",     pos:"Supervisor", basic:"₱14,000", gross:"₱14,600", deduct:"₱2,600",  net:"₱12,000", status:"Draft" },
  { id:"EMP-006", name:"Nico Valdez",    pos:"Barista",    basic:"₱9,100",  gross:"₱9,800",  deduct:"₱1,700",  net:"₱8,100",  status:"Draft" },
];

function AdminPayrollRunDetail({ onBack, onViewPayslip }) {
  return (
    <AdminShell activeItem="Payroll">
      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16, fontSize:12, color:"#a28587" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:"#811c12", fontWeight:600, fontSize:12 }}>
          <PayIcon name="chevleft" size={13} color="#811c12" /> Payroll
        </button>
        <PayIcon name="chevright" size={12} color="#ccc" />
        <span style={{ color:"#110200", fontWeight:600 }}>Marfori Branch — Apr 1–15, 2026</span>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Marfori Branch</h1>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
            <span style={{ fontSize:12, color:"#a28587" }}>Period: Apr 1–15, 2026</span>
            <StatusBadge status="Draft" />
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#555", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <PayIcon name="file" size={13} color="#888" /> Export PDF
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#555", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <PayIcon name="file" size={13} color="#888" /> Export Excel
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, border:"1.5px solid #a28587", background:"#fff", color:"#a28587", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <PayIcon name="trash" size={13} color="#a28587" /> Cancel Run
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:8, background:"#811c12", color:"#fff", fontSize:12.5, fontWeight:700, border:"none", cursor:"pointer" }}>
            <PayIcon name="play" size={13} color="#fff" /> Process Run
          </button>
        </div>
      </div>

      {/* Totals strip */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:18 }}>
        {[
          { label:"Total Amount to be Paid", value:"₱284,600", color:"#811c12" },
          { label:"Total Deductions",         value:"₱47,200",  color:"#C4843A" },
          { label:"Employees on Run",         value:"18",        color:"#110200" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:12, padding:"16px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
            <div style={{ fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color, marginTop:4, fontVariantNumeric:"tabular-nums" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Payslips table */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #F5EDED", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#110200" }}>Payslips</span>
          <span style={{ fontSize:11.5, color:"#a28587" }}>Showing {PAYSLIPS.length} of 18</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
              {["Employee","Position","Basic Pay","Gross Pay","Deductions","Net Pay","Status",""].map(h => (
                <th key={h} style={{ padding:"10px 16px", textAlign:["Basic Pay","Gross Pay","Deductions","Net Pay"].includes(h)?"right":"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAYSLIPS.map((p,i) => (
              <tr key={p.id} style={{ borderBottom:"1px solid #F8F1F1", cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background="#fdfafa"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                onClick={() => onViewPayslip && onViewPayslip(p)}>
                <td style={{ padding:"11px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:"#F3E4E4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9.5, fontWeight:700, color:"#811c12", flexShrink:0 }}>
                      {p.name.split(" ").map(n=>n[0]).join("")}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, color:"#110200" }}>{p.name}</div>
                      <div style={{ fontSize:10.5, color:"#a28587" }}>{p.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:"11px 16px", color:"#666" }}>{p.pos}</td>
                {[p.basic, p.gross, p.deduct, p.net].map((v,vi) => (
                  <td key={vi} style={{ padding:"11px 16px", textAlign:"right", fontVariantNumeric:"tabular-nums", color: vi===2?"#C4843A":vi===3?"#811c12":"#444", fontWeight: vi===3?700:400 }}>{v}</td>
                ))}
                <td style={{ padding:"11px 16px" }}><StatusBadge status={p.status} /></td>
                <td style={{ padding:"11px 16px", textAlign:"right" }}>
                  <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                    <button style={{ padding:"4px 10px", borderRadius:6, border:"1.5px solid #EEE4E4", background:"#fff", fontSize:11, color:"#555", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                      <PayIcon name="download" size={11} color="#888" />
                    </button>
                    <button style={{ padding:"4px 10px", borderRadius:6, border:"1.5px solid #811c12", background:"transparent", fontSize:11, color:"#811c12", fontWeight:600, cursor:"pointer" }}>
                      Edit
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

// ── 3. Payslip Detail (View) ─────────────────────────────────────────────────

function PayslipRow({ label, value, bold, negative, muted }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #F5EDED" }}>
      <span style={{ fontSize:13, color: muted?"#a28587":"#444" }}>{label}</span>
      <span style={{ fontSize:13, fontWeight: bold?700:400, color: negative?"#C4843A": bold?"#110200":"#555", fontVariantNumeric:"tabular-nums" }}>{value}</span>
    </div>
  );
}

function PayslipSection({ title, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:10.5, fontWeight:700, color:"#a28587", textTransform:"uppercase", letterSpacing:.7, marginBottom:8, paddingBottom:6, borderBottom:"1.5px solid #EEE4E4" }}>{title}</div>
      {children}
    </div>
  );
}

function AdminPayslipView({ onBack, onEdit }) {
  return (
    <AdminShell activeItem="Payroll">
      {/* Breadcrumb + actions */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:"#811c12", fontWeight:600, fontSize:12, marginBottom:6 }}>
            <PayIcon name="chevleft" size={13} color="#811c12" /> Back to Run
          </button>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Payslip Detail</h1>
          <span style={{ fontSize:12, color:"#a28587" }}>Barista · Marfori Branch</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <StatusBadge status="Draft" />
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#555", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <PayIcon name="download" size={13} color="#888" /> Download PDF
          </button>
          <button onClick={onEdit} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, border:"1.5px solid #811c12", background:"#fff", color:"#811c12", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <PayIcon name="pencil" size={13} color="#811c12" /> Edit Payslip
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, background:"#4e8a40", color:"#fff", fontSize:12.5, fontWeight:700, border:"none", cursor:"pointer" }}>
            <PayIcon name="check" size={13} color="#fff" /> Finalize Payroll
          </button>
        </div>
      </div>

      {/* Payslip card */}
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(140,21,21,0.08)", overflow:"hidden", maxWidth:760 }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, #280906 0%, #811c12 100%)`, padding:"22px 28px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <img src="assets/kaos-logo.png" alt="KAOS" style={{ height:32, width:"auto", filter:"brightness(0) invert(1)", marginBottom:8 }} />
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", letterSpacing:.5 }}>Payslip for Apr 1–15, 2026</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Generated</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>Apr 16, 2026</div>
            </div>
          </div>
        </div>

        <div style={{ padding:"24px 28px" }}>
          {/* Employee info */}
          <PayslipSection title="Employee Information">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 24px" }}>
              {[["Name","Alicia Santos"],["Employee ID","EMP-001"],["Position","Barista"],["Branch","Marfori Branch"]].map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:10.5, color:"#a28587", marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:"#110200" }}>{v}</div>
                </div>
              ))}
            </div>
          </PayslipSection>

          {/* Earnings */}
          <PayslipSection title="Earnings">
            <PayslipRow label="Base Salary (bi-monthly)" value="₱9,100.00" muted />
            <PayslipRow label="Overtime Pay" value="₱1,100.00" />
            <PayslipRow label="Bonuses" value="₱0.00" muted />
            <PayslipRow label="Gross Pay" value="₱10,200.00" bold />
          </PayslipSection>

          {/* Deductions */}
          <PayslipSection title="Deductions">
            <PayslipRow label="Late / Tardiness Deduction" value="₱350.00" negative />
            <PayslipRow label="Cash Advances" value="₱500.00" negative />
            <PayslipRow label="Salary Loans" value="₱0.00" muted />
          </PayslipSection>

          {/* Government contributions */}
          <PayslipSection title="Government Contributions">
            <PayslipRow label="SSS" value="₱450.00" negative />
            <PayslipRow label="PhilHealth" value="₱225.00" negative />
            <PayslipRow label="Pag-IBIG" value="₱100.00" negative />
            <PayslipRow label="Withholding Tax" value="₱175.00" negative />
          </PayslipSection>

          {/* Summary */}
          <PayslipSection title="Summary">
            <PayslipRow label="Gross Pay" value="₱10,200.00" />
            <PayslipRow label="Total Deductions" value="- ₱1,800.00" negative />
          </PayslipSection>

          {/* Net Pay */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0 4px", borderTop:"2px solid #EEE4E4" }}>
            <span style={{ fontSize:16, fontWeight:800, color:"#110200" }}>Net Pay</span>
            <span style={{ fontSize:24, fontWeight:900, color:"#811c12", fontVariantNumeric:"tabular-nums" }}>₱8,400.00</span>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ── 4. Payslip Edit ──────────────────────────────────────────────────────────

function EditInput({ value }) {
  return (
    <input readOnly type="number" defaultValue={value} style={{ width:90, padding:"5px 8px", borderRadius:6, border:"1.5px solid #811c12", fontSize:12.5, textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#110200", outline:"none", background:"#fff" }}/>
  );
}

function AdminPayslipEdit({ onBack }) {
  return (
    <AdminShell activeItem="Payroll">
      {/* Breadcrumb + actions */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:"#811c12", fontWeight:600, fontSize:12, marginBottom:6 }}>
            <PayIcon name="chevleft" size={13} color="#811c12" /> Back
          </button>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Edit Payslip</h1>
          <span style={{ fontSize:12, color:"#a28587" }}>Alicia Santos · Apr 1–15, 2026</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <StatusBadge status="Draft" />
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#555", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <PayIcon name="download" size={13} color="#888" /> Download PDF
          </button>
          <button onClick={onBack} style={{ padding:"8px 16px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#666", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>
            Cancel
          </button>
          <button style={{ padding:"8px 18px", borderRadius:8, background:"#811c12", color:"#fff", fontSize:12.5, fontWeight:700, border:"none", cursor:"pointer" }}>
            Save Changes
          </button>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(140,21,21,0.08)", overflow:"hidden", maxWidth:760 }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg, #280906 0%, #811c12 100%)`, padding:"22px 28px" }}>
          <img src="assets/kaos-logo.png" alt="KAOS" style={{ height:32, width:"auto", filter:"brightness(0) invert(1)", marginBottom:8 }} />
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", letterSpacing:.5 }}>Payslip for Apr 1–15, 2026</div>
        </div>

        <div style={{ padding:"24px 28px" }}>
          {/* Employee info */}
          <PayslipSection title="Employee Information">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 24px" }}>
              {[["Name","Alicia Santos"],["Employee ID","EMP-001"],["Position","Barista"],["Branch","Marfori Branch"]].map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:10.5, color:"#a28587", marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:"#110200" }}>{v}</div>
                </div>
              ))}
            </div>
          </PayslipSection>

          {/* Editable note */}
          <div style={{ background:"#fdf8f8", borderRadius:8, padding:"8px 14px", marginBottom:16, fontSize:12, color:"#a28587", border:"1px solid #EEE4E4" }}>
            ✏️ <strong style={{ color:"#811c12" }}>Editable fields</strong> — Base salary and government contributions are auto-computed. Adjust the values below as needed.
          </div>

          {/* Earnings — editable */}
          <PayslipSection title="Earnings">
            <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F5EDED" }}>
              <span style={{ fontSize:13, color:"#a28587" }}>Base Salary (bi-monthly)</span>
              <span style={{ fontSize:13, color:"#aaa", fontVariantNumeric:"tabular-nums" }}>₱9,100.00</span>
            </div>
            {[["Overtime Pay",1100],["Bonuses",0]].map(([l,v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #F5EDED" }}>
                <span style={{ fontSize:13, color:"#444" }}>{l}</span>
                <EditInput value={v} />
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#110200" }}>Gross Pay</span>
              <span style={{ fontSize:13, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>₱10,200.00</span>
            </div>
          </PayslipSection>

          {/* Deductions — editable */}
          <PayslipSection title="Deductions">
            {[["Late / Tardiness Deduction",350],["Cash Advances",500],["Salary Loans",0]].map(([l,v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #F5EDED" }}>
                <span style={{ fontSize:13, color:"#444" }}>{l}</span>
                <EditInput value={v} />
              </div>
            ))}
          </PayslipSection>

          {/* Government contributions — editable */}
          <PayslipSection title="Government Contributions">
            {[["SSS",450],["PhilHealth",225],["Pag-IBIG",100],["Withholding Tax",175]].map(([l,v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #F5EDED" }}>
                <span style={{ fontSize:13, color:"#444" }}>{l}</span>
                <EditInput value={v} />
              </div>
            ))}
          </PayslipSection>

          {/* Net Pay */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0 4px", borderTop:"2px solid #EEE4E4" }}>
            <span style={{ fontSize:16, fontWeight:800, color:"#110200" }}>Net Pay</span>
            <span style={{ fontSize:24, fontWeight:900, color:"#811c12", fontVariantNumeric:"tabular-nums" }}>₱8,400.00</span>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

Object.assign(window, { AdminPayroll, AdminPayrollRunDetail, AdminPayslipView, AdminPayslipEdit });
