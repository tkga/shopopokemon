export default function EmptyState({ text }) {
  return (
    <div className="pgs-empty">
      <div style={{ fontSize: 30, marginBottom: 6 }}>🎾</div>
      {text}
    </div>
  );
}
