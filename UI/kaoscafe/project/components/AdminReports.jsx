
// KAOS Admin Reports — 4 tabs: Attendance, Payroll, Leave, Overtime

function ReportsScreen() {
  const [tab, setTab] = React.useState("attendance");

  const tabs = [
    { id:"attendance", label:"Attendance Trends" },
    { id:"payroll",    label:"Payroll Summary" },
    { id:"headcount",  label:"Headcount" },
  ];

  return (
    <AdminShell activeItem="Reports">
      {/* Page header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Reports</h1>
          <p style={{ fontSize:12, color:"#a28587", margin:"2px 0 0" }}>April 2026 · All Branches</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <select style={{ fontSize:12, padding:"7px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
            <option>All Branches</option>
            <option>Marfori Branch</option>
            <option>Buhangin Branch</option>
          </select>
          <select style={{ fontSize:12, padding:"7px 12px", borderRadius:8, border:"1.5px solid #EEE4E4", background:"#fff", color:"#444", cursor:"pointer" }}>
            <option>April 2026</option>
            <option>March 2026</option>
            <option>February 2026</option>
          </select>
          <button style={{ padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:600, border:"1.5px solid #811c12", color:"#811c12", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <ReportsIcon name="download" size={13} color="#811c12" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:20, background:"#fff", borderRadius:10, padding:4, width:"fit-content", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"8px 18px", borderRadius:8, fontSize:12.5, fontWeight: tab===t.id ? 700 : 500,
            border:"none", cursor:"pointer", transition:"all .15s",
            background: tab===t.id ? "#811c12" : "transparent",
            color: tab===t.id ? "#fff" : "#888",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "attendance" && <AttendanceReport />}
      {tab === "payroll"    && <PayrollReport />}
      {tab === "headcount"  && <HeadcountReport />}
    </AdminShell>
  );
}

// ── Shared chart helpers ────────────────────────────────────────────────────

function ReportsIcon({ name, size=16, color="currentColor" }) {
  const icons = {
    download:   <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>,
    users:      <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    trending:   <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    calendar:   <><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="3" x2="21" y1="10" y2="10"/></>,
    clock:      <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

function KpiStrip({ items }) {
  return (
    <div style={{ display:"flex", gap:12, marginBottom:18 }}>
      {items.map(({ label, value, sub, color }) => (
        <div key={label} style={{ flex:1, background:"#fff", borderRadius:12, padding:"14px 18px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:10.5, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, fontWeight:600 }}>{label}</div>
          <div style={{ fontSize:24, fontWeight:800, color: color||"#110200", marginTop:3 }}>{value}</div>
          {sub && <div style={{ fontSize:11, color:"#a28587", marginTop:2 }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

function SimpleBarChart({ data, labels, colors, maxVal, height=100 }) {
  return (
    <div style={{ position:"relative", height: height+28 }}>
      {[0,.5,1].map(t => (
        <div key={t} style={{ position:"absolute", left:0, right:0, bottom:28+t*height, borderTop: t===0?"1.5px solid #ddd":"1px dashed #eee" }}/>
      ))}
      <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:height+28, paddingBottom:28 }}>
        {data[0].map((_, i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{ display:"flex", gap:2, alignItems:"flex-end", height }}>
              {data.map((series, si) => (
                <div key={si} style={{ width:10, borderRadius:"3px 3px 0 0", background:colors[si], height:(series[i]/maxVal)*height }}/>
              ))}
            </div>
            <div style={{ fontSize:10, color:"#bbb", marginTop:5, textAlign:"center" }}>{labels[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleLineChart({ datasets, labels, height=110 }) {
  const allVals = datasets.flatMap(d => d.data);
  const maxV = Math.max(...allVals)+5, minV = Math.min(...allVals)-5;
  const w=340, h=height;

  function pts(arr) {
    return arr.map((v,i) => {
      const x = 10 + (i/(arr.length-1))*(w-20);
      const y = h - ((v-minV)/(maxV-minV))*(h-10)-5;
      return `${x},${y}`;
    }).join(" ");
  }

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h+14}`} preserveAspectRatio="xMidYMid meet">
        {[0,.33,.67,1].map(t => (
          <line key={t} x1="0" x2={w} y1={5+t*(h-15)} y2={5+t*(h-15)} stroke="#eee" strokeWidth="1" strokeDasharray={t===1?"0":"3,3"}/>
        ))}
        {datasets.map(({ data, color }) => (
          <polyline key={color} points={pts(data)} stroke={color} strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
        ))}
        {datasets.map(({ data, color }) =>
          data.map((v,i) => {
            const x = 10+(i/(data.length-1))*(w-20);
            const y = h-((v-minV)/(maxV-minV))*(h-10)-5;
            return <circle key={i} cx={x} cy={y} r="3" fill={color}/>;
          })
        )}
        {labels.map((l,i) => {
          const x = 10+(i/(labels.length-1))*(w-20);
          return <text key={l} x={x} y={h+12} textAnchor="middle" fill="#bbb" fontSize="9">{l}</text>;
        })}
      </svg>
      <div style={{ display:"flex", gap:14, justifyContent:"center", marginTop:6 }}>
        {datasets.map(({ label, color }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10.5, color:"#666" }}>
            <div style={{ width:22, height:3, borderRadius:2, background:color }}/>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ slices, size=120 }) {
  const total = slices.reduce((a,s) => a+s.value, 0);
  let angle = -90;
  const r=44, cx=60, cy=60;

  function arc(startAngle, endAngle) {
    const s = (startAngle*Math.PI)/180, e = (endAngle*Math.PI)/180;
    const x1=cx+r*Math.cos(s), y1=cy+r*Math.sin(s);
    const x2=cx+r*Math.cos(e), y2=cy+r*Math.sin(e);
    const large = (endAngle-startAngle)>180?1:0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  return (
    <div style={{ display:"flex", alignItems:"center", gap:24 }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        {slices.map(s => {
          const sweep = (s.value/total)*360;
          const path = arc(angle, angle+sweep);
          angle += sweep;
          return <path key={s.label} d={path} stroke={s.color} strokeWidth="18" fill="none" strokeLinecap="butt"/>;
        })}
        <circle cx={cx} cy={cy} r={28} fill="white"/>
        <text x={cx} y={cy-6} textAnchor="middle" fontSize="14" fontWeight="800" fill="#110200">{total}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fontSize="8" fill="#aaa">Total</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {slices.map(s => (
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:11.5, color:"#555" }}>{s.label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#110200", marginLeft:"auto", paddingLeft:12 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportTable({ cols, rows }) {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
      <thead>
        <tr style={{ borderBottom:"1.5px solid #EEE4E4", background:"#fdf8f8" }}>
          {cols.map(c => (
            <th key={c} style={{ padding:"9px 12px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom:"1px solid #F8F1F1" }}
            onMouseEnter={e=>e.currentTarget.style.background="#fdf8f8"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding:"9px 12px", color: j===0?"#110200":"#555", fontWeight: j===0?600:400 }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Tab 1: Attendance Summary ───────────────────────────────────────────────

function AttendanceReport() {
  const months = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
  const present = [38,40,37,42,39,43,44];
  const late    = [5,4,6,3,7,4,3];
  const absent  = [3,2,4,2,3,2,2];

  const rows = [
    ["Alicia Santos",  "Barista",    "22/22", "0",  "0",  "100%"],
    ["Mark Reyes",     "Shift Lead", "20/22", "2",  "0",  "91%"],
    ["Donna Cruz",     "Cashier",    "19/22", "1",  "2",  "86%"],
    ["James Uy",       "Barista",    "21/22", "1",  "0",  "95%"],
    ["Shaina Lim",     "Supervisor", "18/22", "0",  "4",  "82%"],
    ["Nico Valdez",    "Barista",    "22/22", "0",  "0",  "100%"],
  ];

  return (
    <>
      <KpiStrip items={[
        { label:"Avg Attendance Rate", value:"93.4%", sub:"+1.2% vs last month", color:"#811c12" },
        { label:"Total Present Days",  value:"1,848", sub:"April 2026" },
        { label:"Total Late",          value:"47",    sub:"across all employees", color:"#C4843A" },
        { label:"Total Absent",        value:"28",    sub:"across all employees", color:"#a28587" },
      ]}/>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Monthly Attendance Breakdown</div>
          <SimpleBarChart data={[present,late,absent]} labels={months} colors={["#811c12","#C4843A","#a28587"]} maxVal={50}/>
          <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop:8 }}>
            {[["#811c12","Present"],["#C4843A","Late"],["#a28587","Absent"]].map(([c,l]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10.5, color:"#666" }}>
                <div style={{ width:10, height:10, borderRadius:3, background:c }}/>{l}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Attendance Rate Trend</div>
          <SimpleLineChart
            datasets={[{ label:"Rate %", data:[89,92,88,94,91,95,93], color:"#811c12" }]}
            labels={months}/>
          <div style={{ marginTop:16, padding:"12px 14px", background:"#fdf8f8", borderRadius:10 }}>
            <div style={{ fontSize:11, color:"#aaa", marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>Branch Breakdown</div>
            {[["Marfori Branch","94.2%","#811c12"],["Buhangin Branch","92.6%","#a28587"]].map(([b,r,c]) => (
              <div key={b} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"#555" }}>{b}</span>
                <span style={{ fontSize:13, fontWeight:700, color:c }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #F5EDED", display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#110200" }}>Per-Employee Breakdown</span>
          <span style={{ fontSize:11.5, color:"#a28587" }}>April 2026 · Showing 6 of 48</span>
        </div>
        <ReportTable
          cols={["Employee","Role","Days Present","Late","Absent","Rate"]}
          rows={rows.map(r => [
            r[0], r[1], r[2], r[3], r[4],
            <span style={{ fontWeight:700, color: parseFloat(r[5])>=90?"#4e8a40":parseFloat(r[5])>=80?"#C4843A":"#811c12" }}>{r[5]}</span>
          ])}
        />
      </div>
    </>
  );
}

// ── Tab 2: Payroll Summary ──────────────────────────────────────────────────

function PayrollReport() {
  const months = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
  const rows = [
    ["Alicia Santos",  "Barista",    "₱1,638", "₱820",  "₱15,742"],
    ["Mark Reyes",     "Shift Lead", "₱2,205", "₱1,100","₱21,195"],
    ["Donna Cruz",     "Cashier",    "₱1,638", "₱720",  "₱15,842"],
    ["James Uy",       "Barista",    "₱1,638", "₱820",  "₱15,742"],
    ["Shaina Lim",     "Supervisor", "₱2,520", "₱1,260","₱24,220"],
    ["Nico Valdez",    "Barista",    "₱1,638", "₱820",  "₱15,742"],
  ];

  return (
    <>
      <KpiStrip items={[
        { label:"Total Amount to be Paid", value:"₱761,580", sub:"Net pay · all employees", color:"#811c12" },
        { label:"Total Deductions",        value:"₱130,820", sub:"SSS · PhilHealth · Pag-IBIG", color:"#C4843A" },
        { label:"Avg Net Pay",             value:"₱15,866",  sub:"per employee", color:"#a28587" },
        { label:"Employees on Payroll",    value:"48",        sub:"April 2026" },
      ]}/>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Payroll Trend <span style={{ fontSize:11, color:"#aaa", fontWeight:400 }}>(₱ thousands)</span></div>
          <SimpleLineChart
            datasets={[
              { label:"Net Pay (₱k)",    data:[716,729,740,720,749,752,761], color:"#811c12" },
              { label:"Deductions (₱k)", data:[124,126,130,128,131,133,130], color:"#C4843A" },
            ]}
            labels={months}/>
        </div>
        <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Deduction Breakdown</div>
          <DonutChart slices={[
            { label:"SSS",       value:58, color:"#811c12" },
            { label:"PhilHealth",value:32, color:"#a28587" },
            { label:"Pag-IBIG",  value:22, color:"#C4843A" },
            { label:"Tax",       value:18, color:"#280906" },
          ]}/>
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #F5EDED" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#110200" }}>Employee Payroll Detail</span>
        </div>
        <ReportTable cols={["Employee","Role","Deductions","Overtime","Net Pay"]} rows={rows}/>
      </div>
    </>
  );
}

// ── Tab 3: Headcount ────────────────────────────────────────────────────────

function HeadcountReport() {
  const months = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
  const total   = [42,43,44,44,46,47,48];
  const active  = [40,41,42,43,44,45,46];
  const onLeave = [2,2,2,1,2,2,2];

  const rows = [
    ["Barista",    "18", "17", "1", "0", "37.5%"],
    ["Cashier",    "10", "10", "0", "0", "20.8%"],
    ["Shift Lead",  "8",  "7", "1", "0", "16.7%"],
    ["Supervisor",  "6",  "6", "0", "0", "12.5%"],
    ["Manager",     "4",  "4", "0", "0",  "8.3%"],
    ["Admin",       "2",  "2", "0", "0",  "4.2%"],
  ];

  return (
    <>
      <KpiStrip items={[
        { label:"Total Headcount",  value:"48",  sub:"as of April 2026",        color:"#811c12" },
        { label:"Active",           value:"46",  sub:"currently working" },
        { label:"On Leave",         value:"2",   sub:"this period",              color:"#C4843A" },
        { label:"New Hires (Apr)",  value:"1",   sub:"+1 vs last month",         color:"#a28587" },
      ]}/>

      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Headcount Over Time</div>
          <SimpleLineChart
            datasets={[
              { label:"Total",    data:total,   color:"#811c12" },
              { label:"Active",   data:active,  color:"#a28587" },
              { label:"On Leave", data:onLeave, color:"#C4843A" },
            ]}
            labels={months}/>
        </div>

        <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Headcount by Role</div>
          <DonutChart slices={[
            { label:"Barista",    value:18, color:"#811c12" },
            { label:"Cashier",    value:10, color:"#a28587" },
            { label:"Shift Lead", value:8,  color:"#C4843A" },
            { label:"Supervisor", value:6,  color:"#280906" },
            { label:"Other",      value:6,  color:"#b10b0b" },
          ]}/>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(140,21,21,0.06)", overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #F5EDED" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#110200" }}>Headcount by Role</span>
        </div>
        <ReportTable
          cols={["Role","Total","Active","On Leave","Resigned","% of Workforce"]}
          rows={rows}/>
      </div>
    </>
  );
}

Object.assign(window, { ReportsScreen });
