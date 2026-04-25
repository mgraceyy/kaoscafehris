
// KAOS Admin Dashboard — Redesigned
// Fixes: stat card icons (on-brand), chart colors (on-brand), export button (outline), sidebar active state

function SparkLine({ data, color, height = 40 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function StatCard({ label, value, sub, sparkData, color, icon }) {
  return (
    <div style={{
      background:"#fff", borderRadius:12, padding:"18px 20px",
      display:"flex", flexDirection:"column", gap:6, flex:1,
      boxShadow:"0 1px 4px rgba(140,21,21,0.06)", minWidth:0
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:11, color:"#999", fontWeight:500, letterSpacing:.5, textTransform:"uppercase" }}>{label}</div>
          <div style={{ fontSize:26, fontWeight:800, color:"#110200", marginTop:2 }}>{value}</div>
          <div style={{ fontSize:11.5, color: sub.startsWith("+") ? "#6a9e5e" : "#a28587", marginTop:2, fontWeight:500 }}>{sub}</div>
        </div>
        {/* FIX: icon box uses on-brand maroon tones instead of generic blue/green/yellow/red */}
        <div style={{ width:38, height:38, borderRadius:10, background:color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon name={icon} size={18} color={color} />
        </div>
      </div>
      <div style={{ marginTop:4 }}>
        <SparkLine data={sparkData} color={color} />
      </div>
    </div>
  );
}

function BarChart() {
  // FIX: chart colors now use brand palette — maroon + muted rose + warm amber
  const months = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
  const present = [28,31,29,33,30,34,36];
  const late    = [5,4,6,3,7,5,4];
  const absent  = [3,2,4,2,3,2,2];
  const maxV = 42;
  const h = 120;

  return (
    <div style={{ position:"relative", height: h + 32 }}>
      {/* Y gridlines */}
      {[0,.25,.5,.75,1].map(t => (
        <div key={t} style={{
          position:"absolute", left:0, right:0, bottom: 28 + t * h,
          borderTop: t===0 ? "1.5px solid #ddd" : "1px dashed #eee",
        }}/>
      ))}
      <div style={{ display:"flex", alignItems:"flex-end", gap:6, height: h + 28, paddingBottom:28 }}>
        {months.map((m, i) => (
          <div key={m} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
            <div style={{ display:"flex", gap:2, alignItems:"flex-end", height:h }}>
              <div style={{ width:10, background:"#811c12", borderRadius:"3px 3px 0 0", height: (present[i]/maxV)*h }} />
              <div style={{ width:10, background:"#a28587", borderRadius:"3px 3px 0 0", height: (late[i]/maxV)*h }} />
              <div style={{ width:10, background:"#C4843A", borderRadius:"3px 3px 0 0", height: (absent[i]/maxV)*h }} />
            </div>
            <div style={{ fontSize:10, color:"#aaa", marginTop:6 }}>{m}</div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display:"flex", gap:14, marginTop:4, justifyContent:"center" }}>
        {[["#811c12","Present"],["#a28587","Late"],["#C4843A","Absent"]].map(([c,l]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10.5, color:"#666" }}>
            <div style={{ width:10, height:10, borderRadius:3, background:c }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart() {
  // FIX: on-brand chart colors — maroon for net pay, muted rose for gross, amber for deductions
  const months = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr"];
  const gross  = [280,295,310,290,320,335,340];
  const net    = [230,245,258,240,268,278,285];
  const deduct = [50,50,52,50,52,57,55];
  const allVals = [...gross,...net,...deduct];
  const maxV = Math.max(...allVals)+10, minV = Math.min(...allVals)-10;
  const w = 340, h = 100;

  function toPoint(arr) {
    return arr.map((v,i) => {
      const x = 10 + (i/(arr.length-1))*(w-20);
      const y = h - ((v-minV)/(maxV-minV))*(h-10)-5;
      return `${x},${y}`;
    }).join(" ");
  }

  const datasets = [
    { pts: toPoint(gross),  color:"#811c12", label:"Gross Pay" },
    { pts: toPoint(net),    color:"#a28587", label:"Net Pay" },
    { pts: toPoint(deduct), color:"#C4843A", label:"Deductions" },
  ];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {/* Gridlines */}
        {[0,.25,.5,.75,1].map(t => (
          <line key={t} x1="0" x2={w} y1={5 + t*(h-15)} y2={5 + t*(h-15)}
            stroke="#eee" strokeWidth="1" strokeDasharray={t===1?"0":"4,4"}/>
        ))}
        {datasets.map(({ pts, color }) => (
          <polyline key={color} points={pts} stroke={color} strokeWidth="2.2"
            fill="none" strokeLinejoin="round" strokeLinecap="round"/>
        ))}
        {/* Dots */}
        {datasets.map(({ color, pts: _ }, di) => {
          const arr = [gross,net,deduct][di];
          return arr.map((v,i) => {
            const x = 10 + (i/(arr.length-1))*(w-20);
            const y = h - ((v-minV)/(maxV-minV))*(h-10)-5;
            return <circle key={i} cx={x} cy={y} r="3" fill={color}/>;
          });
        })}
        {/* X labels */}
        {months.map((m,i) => {
          const x = 10 + (i/(months.length-1))*(w-20);
          return <text key={m} x={x} y={h} textAnchor="middle" fill="#aaa" fontSize="9">{m}</text>;
        })}
      </svg>
      <div style={{ display:"flex", gap:14, marginTop:6, justifyContent:"center" }}>
        {datasets.map(({color,label}) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10.5, color:"#666" }}>
            <div style={{ width:24, height:3, borderRadius:2, background:color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  const rows = [
    { name:"Alicia Santos",   role:"Barista",     action:"Clocked In",    time:"7:02 AM",  badge:"on-time" },
    { name:"Mark Reyes",      role:"Shift Lead",  action:"Late Check-in", time:"8:47 AM",  badge:"late" },
    { name:"Donna Cruz",      role:"Cashier",     action:"Leave Approved",time:"Yesterday", badge:"approved" },
    { name:"James Uy",        role:"Barista",     action:"Clocked Out",   time:"3:01 PM",  badge:"complete" },
    { name:"Shaina Lim",      role:"Supervisor",  action:"Overtime Filed", time:"2:30 PM", badge:"pending" },
    { name:"Nico Valdez",     role:"Barista",     action:"Clocked In",    time:"6:58 AM",  badge:"on-time" },
  ];
  const badgeStyle = {
    "on-time":  { bg:"#edf6ea", color:"#4e8a40" },
    "late":     { bg:"#fdf0e0", color:"#b07020" },
    "approved": { bg:"#edf3fd", color:"#2a5db0" },
    "complete": { bg:"#f0f0f0", color:"#555" },
    "pending":  { bg:"#fce9e9", color:"#811c12" },
  };
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
      <thead>
        <tr style={{ borderBottom:"1.5px solid #EEE4E4" }}>
          {["Employee","Role","Action","Time","Status"].map(h => (
            <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:10.5, color:"#aaa", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r,i) => {
          const bs = badgeStyle[r.badge];
          return (
            <tr key={i} style={{ borderBottom:"1px solid #F5EDED" }}>
              <td style={{ padding:"10px 10px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"#F3E4E4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:BRAND, flexShrink:0 }}>
                    {r.name.split(" ").map(n=>n[0]).join("")}
                  </div>
                  <span style={{ fontWeight:600, color:"#110200" }}>{r.name}</span>
                </div>
              </td>
              <td style={{ padding:"10px 10px", color:"#888" }}>{r.role}</td>
              <td style={{ padding:"10px 10px", color:"#444" }}>{r.action}</td>
              <td style={{ padding:"10px 10px", color:"#888" }}>{r.time}</td>
              <td style={{ padding:"10px 10px" }}>
                <span style={{ background:bs.bg, color:bs.color, fontSize:10.5, fontWeight:600, borderRadius:20, padding:"3px 10px" }}>
                  {r.badge.charAt(0).toUpperCase()+r.badge.slice(1).replace("-"," ")}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AdminDashboard() {
  return (
    <AdminShell activeItem="Dashboard">
      {/* Page header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#110200", margin:0 }}>Dashboard</h1>
          <p style={{ fontSize:12, color:"#a28587", margin:"2px 0 0" }}>Wednesday, April 23, 2026</p>
        </div>
        {/* FIX: Export button is now outline/secondary — not dominant */}
        <button style={{
          padding:"8px 18px", borderRadius:8, fontSize:12.5, fontWeight:600, cursor:"pointer",
          border:`1.5px solid ${BRAND}`, color:BRAND, background:"transparent",
          display:"flex", alignItems:"center", gap:6
        }}>
          <Icon name="bar-chart-3" size={14} color={BRAND} />
          Export Report
        </button>
      </div>

      {/* Stat cards — FIX: all use brand maroon tones, no generic colors */}
      <div style={{ display:"flex", gap:14, marginBottom:20 }}>
        <StatCard label="Total Employees" value="48" sub="+2 this month" sparkData={[40,41,42,42,44,46,48]} color="#811c12" icon="users" />
        <StatCard label="Present Today"   value="36" sub="+3 vs yesterday" sparkData={[30,33,31,34,32,33,36]} color="#811C12" icon="clipboard-check" />
        <StatCard label="On Leave"         value="5"  sub="2 pending approval" sparkData={[3,4,5,4,6,5,5]} color="#a28587" icon="calendar-days" />
        <StatCard label="Late Today"       value="4"  sub="-1 vs yesterday" sparkData={[6,5,7,5,6,5,4]} color="#C4843A" icon="clock" />
      </div>

      {/* Charts row */}
      <div style={{ display:"flex", gap:16, marginBottom:20 }}>
        <div style={{ flex:1.3, background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Attendance Overview</div>
          <BarChart />
        </div>
        <div style={{ flex:1, background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:14 }}>Payroll Trend <span style={{fontSize:11,color:"#aaa",fontWeight:400}}>(₱ thousands)</span></div>
          <LineChart />
        </div>
      </div>

      {/* Recent activity table */}
      <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(140,21,21,0.06)" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#110200", marginBottom:12 }}>Recent Activity</div>
        <RecentActivity />
      </div>
    </AdminShell>
  );
}

Object.assign(window, { AdminDashboard });
