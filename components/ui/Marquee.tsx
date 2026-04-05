const items = [
  "SAINTCE CONTROL",
  "SKEUOMORPHIC UI",
  "CLIENT REGISTRY",
  "LIVE CMS",
  "GPU-SAFE MOTION",
  "ENTERPRISE READINESS",
]

export default function Marquee() {
  return (
    <section className="relative mt-24 overflow-hidden border-y border-[var(--border-soft)] bg-[var(--panel-subtle)] md:mt-32">
      <div className="py-[1.1rem]">
        <div className="relative flex overflow-hidden">
          <div className="marquee-track">
            {[...items, ...items].map((item, index) => (
              <div key={`${item}-${index}`} className="marquee-item">
                <span>{item}</span>
                <span className="marquee-dot">◆</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
