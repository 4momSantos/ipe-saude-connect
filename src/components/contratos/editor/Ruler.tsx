export function HorizontalRuler() {
  const marks = Array.from({ length: 21 }, (_, i) => i); // 0 a 20 cm

  return (
    <div className="ruler-horizontal">
      {marks.map((cm) => (
        <div key={cm} className="ruler-mark" data-cm={cm % 5 === 0 ? cm : ''} />
      ))}
    </div>
  );
}
