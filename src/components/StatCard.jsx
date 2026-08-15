export default function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="pgs-statcard">
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Icon size={14} color={color || "var(--muted)"} />
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      </div>
      <div className="pgs-mono pgs-display" style={{ fontSize: 20, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
