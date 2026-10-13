export function SlotMeter({ accepted, capacity }: { accepted: number; capacity: number }) {
  const value = Math.max(0, Math.min(accepted, capacity))
  return (
    <div
      className="slot-meter"
      role="meter"
      aria-label="Zaakceptowane zgłoszenia"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuetext={`${accepted} z ${capacity} miejsc zajętych`}
    >
      <span style={{ transform: `scaleX(${capacity > 0 ? value / capacity : 0})` }} />
    </div>
  )
}
