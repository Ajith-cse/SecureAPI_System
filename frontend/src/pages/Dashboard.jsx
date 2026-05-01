import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, WS_URL } from "../api";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const toTime   = (ts) => new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const httpColor = (c)  => c >= 500 ? "text-rose-400" : c >= 400 ? "text-amber-400" : c >= 300 ? "text-sky-400" : "text-emerald-400";
const methodColor = (m) => ({ GET: "text-cyan-400", POST: "text-indigo-400", DELETE: "text-rose-400", PUT: "text-amber-400", PATCH: "text-purple-400" })[m] || "text-slate-400";
const severityStyle = (s) =>
  s === "critical" ? "text-rose-300   bg-rose-500/10   border-rose-500/30"
  : s === "warning"  ? "text-amber-300  bg-amber-500/10  border-amber-500/30"
  :                    "text-cyan-300   bg-cyan-500/10   border-cyan-500/30";

const TT_STYLE = {
  contentStyle: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, color: "#e2e8f0", fontSize: 12 },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

/* ── StatCard ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, accent }) {
  const ring = {
    cyan:    "border-cyan-500/25    bg-cyan-500/[0.07]    text-cyan-400",
    indigo:  "border-indigo-500/25  bg-indigo-500/[0.07]  text-indigo-400",
    emerald: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400",
    amber:   "border-amber-500/25   bg-amber-500/[0.07]   text-amber-400",
    rose:    "border-rose-500/25    bg-rose-500/[0.07]    text-rose-400",
  }[accent];
  return (
    <div className={`border rounded-2xl p-5 transition-all hover:scale-[1.015] ${ring}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-[2rem] font-bold leading-none ${ring.split(" ")[2]}`}>{value ?? "—"}</div>
      {sub && <div className="text-slate-600 text-xs mt-1.5">{sub}</div>}
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [chart,    setChart]    = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [blocked,  setBlocked]  = useState([]);
  const [wsState,  setWsState]  = useState("connecting");
  const [blockVal, setBlockVal] = useState("");
  const [tab,      setTab]      = useState("logs");
  const wsRef = useRef(null);
  const nav   = useNavigate();

  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");
  const logout = () => {
  if (wsRef.current) {
    wsRef.current._manualClose = true;
    wsRef.current.close();
  }
  localStorage.clear();
  nav("/");
};

  /* WebSocket */
  const connectWS = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen    = () => setWsState("live");
    ws.onclose = () => {
  setWsState("offline");
  if (!wsRef.current?._manualClose) {
    setTimeout(connectWS, 5000);
  }
};
    ws.onerror   = () => ws.close();
    ws.onmessage = ({ data }) => {
      try {
        const d = JSON.parse(data);
        if (d.type !== "stats") return;
        setStats(d);
        setChart(d.chart    || []);
        setLogs(d.recent_logs || []);
        setAlerts(d.alerts  || []);
        setBlocked(d.blocked_ips || []);
      } catch {}
    };
  }, []);

  useEffect(() => {
  connectWS();
  return () => {
    if (wsRef.current) {
      wsRef.current._manualClose = true;
      wsRef.current.close();
    }
  };
}, [connectWS]);

  /* Actions */
  const handleBlock = async () => {
    if (!blockVal.trim()) return;
    try {
      await api.post("/admin/block-user", { ip: blockVal.trim(), reason: "Manual — dashboard" });
      setBlockVal("");
    } catch {}
  };
  const handleUnblock   = async (ip) => { try { await api.delete(`/admin/unblock/${encodeURIComponent(ip)}`); } catch {} };
  const handleMarkRead  = async ()   => { try { await api.patch("/admin/alerts/read-all"); } catch {} };

  const unread = alerts.filter((a) => !a.read).length;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-gray-950/80 backdrop-blur-2xl">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">SecureAPI Monitor</p>
              <p className="text-slate-600 text-[11px] mt-0.5">Real-Time Security Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
              wsState === "live"
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                : wsState === "connecting"
                ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                : "text-rose-400 bg-rose-500/10 border-rose-500/30"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsState === "live" ? "bg-emerald-400 animate-pulse" : "bg-current"}`} />
              {wsState === "live" ? "Live" : wsState === "connecting" ? "Connecting…" : "Reconnecting…"}
            </div>

            <span className="hidden md:flex items-center gap-1.5 text-sm">
              <span className="text-white font-medium">{name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
  role === "admin"
    ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
    : "text-slate-400 bg-white/5 border-white/10"
}`}>{role}</span>
            </span>

            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/25 rounded-lg px-3 py-2 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-6 py-6 space-y-5 animate-fade-in">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Requests / sec"  value={stats?.requests_per_sec ?? 0}                    sub="live rate"     icon="⚡" accent="cyan"    />
          <StatCard label="Total Requests"  value={(stats?.total_requests  ?? 0).toLocaleString()}  sub="all time"      icon="📊" accent="indigo"  />
          <StatCard label="Active Users"    value={stats?.active_users     ?? 0}                    sub="last 5 min"    icon="👥" accent="emerald" />
          <StatCard label="Failed Logins"   value={stats?.failed_logins    ?? 0}                    sub="last 60 s"     icon="⚠️" accent="amber"   />
          <StatCard label="Blocked IPs"     value={stats?.blocked_count    ?? 0}                    sub="total blocked" icon="🚫" accent="rose"    />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Area chart */}
          <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-white font-semibold text-sm mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Request Rate — last 2 min
            </p>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={chart} margin={{ left: -18, right: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff07" />
                <XAxis dataKey="t" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis               tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TT_STYLE} />
                <Area type="monotone" dataKey="requests" stroke="#06b6d4" strokeWidth={2} fill="url(#gc)" dot={false} activeDot={{ r: 4, fill: "#06b6d4" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart */}
          <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-white font-semibold text-sm mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Traffic Bars — last 2 min
            </p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={chart} margin={{ left: -18, right: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff07" />
                <XAxis dataKey="t" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis               tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TT_STYLE} />
                <Bar dataKey="requests" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabbed panel */}
        <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center border-b border-white/[0.07] overflow-x-auto">
            {[
  { id: "logs",    label: "Request Logs",    icon: "📋", count: logs.length,    badge: false,              adminOnly: false },
  { id: "blocked", label: "Blocked IPs",     icon: "🚫", count: blocked.length, badge: blocked.length > 0, adminOnly: true  },
  { id: "alerts",  label: "Security Alerts", icon: "🔔", count: unread,         badge: unread > 0,         adminOnly: true  },
].filter((t) => !t.adminOnly || role === "admin").map((t) => (
  <button
    key={t.id}
    onClick={() => setTab(t.id)}
    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
      tab === t.id
        ? "border-cyan-500 text-white bg-white/[0.03]"
        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
    }`}
  >
    <span>{t.icon}</span>
    <span className="hidden sm:inline">{t.label}</span>
    
    {t.badge ? (
      <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{t.count}</span>
    ) : (
      <span className="text-slate-700 text-xs">({t.count})</span>
    )}
  </button>
))}

            {tab === "alerts" && (
              <button
                onClick={handleMarkRead}
                className="ml-auto px-4 text-xs text-slate-500 hover:text-slate-200 transition-colors whitespace-nowrap"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* ── Logs ── */}
          {tab === "logs" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Time", "IP", "Method", "Path", "Status", "Duration"].map((h) => (
                      <th key={h} className="text-left text-slate-600 font-semibold uppercase tracking-wider px-5 py-3 text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-700 py-14">
                        Waiting for traffic… Make an API call to see logs here.
                      </td>
                    </tr>
                  ) : logs.map((l, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.018] transition-colors">
                      <td className="px-5 py-3 text-slate-500 font-mono">{toTime(l.timestamp)}</td>
                      <td className="px-5 py-3 text-slate-300 font-mono">{l.ip}</td>
                      <td className={`px-5 py-3 font-bold font-mono ${methodColor(l.method)}`}>{l.method}</td>
                      <td className="px-5 py-3 text-slate-400 font-mono max-w-[200px] truncate" title={l.path}>{l.path}</td>
                      <td className={`px-5 py-3 font-bold font-mono ${httpColor(l.status)}`}>{l.status}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono">{l.duration_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Blocked IPs ── */}
          {tab === "blocked" && (
            <div className="p-5">
              <div className="flex gap-3 mb-5">
                <input
                  value={blockVal}
                  onChange={(e) => setBlockVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBlock()}
                  placeholder="Enter IP address to block…"
                  className="flex-1 bg-white/5 border border-white/10 focus:border-rose-500/50 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
                <button
                  onClick={handleBlock}
                  className="bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 font-semibold rounded-xl px-5 py-2.5 text-sm transition-all"
                >
                  Block IP
                </button>
              </div>

              {blocked.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-10">
                  No blocked IPs — system is clean ✅
                </p>
              ) : (
                <div className="space-y-2">
                  {blocked.map((b, i) => (
                    <div key={i} className="flex items-center justify-between bg-rose-500/[0.06] border border-rose-500/20 rounded-xl px-4 py-3 group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                        <span className="text-rose-300 font-mono text-sm">{b.ip}</span>
                        <span className="text-slate-600 text-xs hidden sm:block truncate">— {b.reason}</span>
                        {b.blocked_at && (
                          <span className="text-slate-700 text-xs hidden md:block">{toTime(b.blocked_at)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnblock(b.ip)}
                        className="text-xs text-slate-500 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/40 rounded-lg px-3 py-1.5 transition-all flex-shrink-0 ml-3"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Alerts ── */}
          {tab === "alerts" && (
            <div className="p-5 space-y-2.5">
              {alerts.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-10">
                  No alerts — all systems clear 🎉
                </p>
              ) : alerts.map((a, i) => (
                <div
                  key={i}
                  className={`border rounded-xl px-4 py-3.5 text-sm transition-opacity ${severityStyle(a.severity)} ${!a.read ? "opacity-100" : "opacity-35"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-semibold">{a.title}</span>
                      <span className="opacity-70 ml-2 text-xs break-all">{a.message}</span>
                    </div>
                    <span className="text-[10px] opacity-50 flex-shrink-0 mt-0.5 font-mono">{toTime(a.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-white/[0.05] py-4 text-center text-slate-700 text-xs">
        SecureAPI v2.0.0 · FastAPI · MongoDB Atlas · Redis · JWT · WebSocket Real-Time Monitoring
      </footer>
    </div>
  );
}
