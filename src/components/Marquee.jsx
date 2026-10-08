const WORDS = ['Rose', 'Pistachio', 'Mango', 'Basil Seed', 'Saffron', 'Malai Kulfi', 'Strawberry', 'Cocoa']

export default function Marquee() {
  const row = (
    <div className="mq-row" aria-hidden="true">
      {WORDS.map((w) => (
        <span key={w}>
          {w}
          <i />
        </span>
      ))}
    </div>
  )
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track">
        {row}
        {row}
      </div>
    </div>
  )
}
