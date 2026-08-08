import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../LanguageContext.jsx'
import RentalModal from './RentalModal.jsx'
import Icon from './Icons.jsx'

const MAX_LAPTOPS = 30
const MAX_HOURS = 48

// Eases a number toward its new value so the price reads as a live meter.
function useAnimatedNumber(value, duration = 480) {
  const [display, setDisplay] = useState(value)
  const displayRef = useRef(value)

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = displayRef.current
    if (reduced || from === value) {
      setDisplay(value)
      return
    }
    let frame
    let startedAt
    const step = (now) => {
      if (startedAt === undefined) startedAt = now
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (value - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return display
}

export default function RentalPlanner({ fleet }) {
  const { t, lang } = useLang()
  const copy = t.rentalBand

  const [qty, setQty] = useState(12)
  const [hours, setHours] = useState(8)
  const [modelId, setModelId] = useState(null)
  const [booking, setBooking] = useState(false)

  // Cheapest first: the entry rate is the hook, and it becomes the default model.
  const models = useMemo(
    () => [...fleet].sort((a, b) => a.rental_price - b.rental_price).slice(0, 4),
    [fleet],
  )
  const model = models.find((m) => m.id === modelId) || models[0]

  const total = model ? qty * hours * model.rental_price : 0
  const buyPrice = model ? qty * model.price : 0
  const animatedTotal = useAnimatedNumber(total)

  if (!model) return null

  const money = (n, decimals = 0) =>
    `$${Number(n).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`

  const durationLabel =
    hours < 24
      ? `${hours} ${copy.hourShort}`
      : `${Math.floor(hours / 24)} ${copy.dayShort}${hours % 24 ? ` ${hours % 24} ${copy.hourShort}` : ''}`

  const applyScenario = (s) => {
    setQty(s.qty)
    setHours(s.hours)
  }

  const activeScenario = copy.scenarios.find((s) => s.qty === qty && s.hours === hours)

  return (
    <section className="section rental-band" id="rentals">
      <div className="container rental-band-inner">
        <div className="rental-pitch">
          <span className="rental-eyebrow">
            <Icon name="clock" size={14} /> {copy.eyebrow}
          </span>
          <h2>
            {copy.title1}
            <br />
            <span className="text-gradient">{copy.title2}</span>
          </h2>
          <p>{copy.lede}</p>
          <ul className="rental-points">
            {copy.points.map((point) => (
              <li key={point}>
                <Icon name="check" size={14} /> {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="rental-console">
          <div className="console-head">
            <span className="console-title">{copy.planner}</span>
            <span className="console-live">
              <i className="console-dot" /> {copy.liveTag}
            </span>
          </div>

          {/* Laptops */}
          <div className="console-control">
            <div className="console-label">
              <span>{copy.laptops}</span>
              <strong>{qty}</strong>
            </div>
            <div className="fleet-wall" aria-hidden="true">
              {Array.from({ length: MAX_LAPTOPS }, (_, i) => (
                <span key={i} className={`fleet-unit ${i < qty ? 'is-on' : ''}`}>
                  <Icon name="laptop" size={13} strokeWidth={2} />
                </span>
              ))}
            </div>
            <input
              className="console-slider"
              type="range"
              min="1"
              max={MAX_LAPTOPS}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              aria-label={copy.laptops}
            />
            {qty === MAX_LAPTOPS && (
              <Link to="/contact" className="console-hint-link">
                {copy.maxHint}
              </Link>
            )}
          </div>

          {/* Duration */}
          <div className="console-control">
            <div className="console-label">
              <span>{copy.duration}</span>
              <strong>{durationLabel}</strong>
            </div>
            <input
              className="console-slider"
              type="range"
              min="1"
              max={MAX_HOURS}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              aria-label={copy.duration}
            />
            <div className="console-ticks">
              {[4, 8, 24, 48].map((h) => (
                <button
                  key={h}
                  type="button"
                  className="console-tick"
                  style={{ left: `${((h - 1) / (MAX_HOURS - 1)) * 100}%` }}
                  onClick={() => setHours(h)}
                >
                  {h < 24 ? `${h} ${copy.hourShort}` : `${h / 24} ${copy.dayShort}`}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="console-control">
            <div className="console-label">
              <span>{copy.model}</span>
              <strong>{money(model.rental_price, 2)}{t.rental.perHour}</strong>
            </div>
            <div className="fleet-row">
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`fleet-pill ${m.id === model.id ? 'is-active' : ''}`}
                  onClick={() => setModelId(m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Scenarios */}
          <div className="console-control">
            <div className="console-label">
              <span>{copy.scenarioLabel}</span>
            </div>
            <div className="fleet-row">
              {copy.scenarios.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className={`fleet-pill ${activeScenario === s ? 'is-active' : ''}`}
                  onClick={() => applyScenario(s)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="console-total">
            <div>
              <span className="console-total-label">{copy.totalLabel}</span>
              <span className="console-total-value">{money(animatedTotal)}</span>
              <span className="console-breakdown">
                {qty} × {durationLabel} × {money(model.rental_price, 2)}{t.rental.perHour}
              </span>
            </div>
            <div className="console-compare">
              {copy.vsBuy.replace('{qty}', qty).replace('{buy}', money(buyPrice))}
            </div>
          </div>

          <div className="console-actions">
            <button className="btn btn-primary btn-block" onClick={() => setBooking(true)}>
              {copy.cta} <Icon name="clock" size={16} />
            </button>
            <Link to="/contact" className="btn btn-ghost btn-block console-quote">
              {copy.quote}
            </Link>
          </div>

          <p className="console-fine">{copy.fine}</p>
        </div>
      </div>

      {booking && (
        <RentalModal
          product={model}
          initialQty={Math.min(qty, model.stock || qty)}
          onClose={() => setBooking(false)}
        />
      )}
    </section>
  )
}
