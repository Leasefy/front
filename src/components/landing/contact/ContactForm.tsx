'use client'

import { useState, type FormEvent } from 'react'
import { buildContactMailto, isContactFormValid, CONTACT_EMAIL } from '@/lib/landing/contact-mailto'

const INTEREST_CHIPS = ['CRM', 'ERP', 'Agentes AI', 'Todo el sistema'] as const

/**
 * Contact route form (landing-react-port SLICE 7), ported from the
 * standalone's `#contactPage` overlay (`landing-standalone/index.html`
 * ~L2741-2771). Controlled client component — submit builds a `mailto:`
 * URL via `buildContactMailto` (design #261 §3, ADR-4: no backend contact
 * endpoint) and navigates through `window.location.href`. No network call,
 * no PII stored. Only name + email are required (light validation).
 */
export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [agency, setAgency] = useState('')
  const [interest, setInterest] = useState<string>('Todo el sistema')
  const [message, setMessage] = useState('')
  const [showError, setShowError] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isContactFormValid({ name, email })) {
      setShowError(true)
      return
    }

    setShowError(false)
    window.location.href = buildContactMailto({ name, email, agency, interest, message })
  }

  return (
    <div className="landing-cp" data-testid="contact-page">
      <div className="landing-cp__grid">
        <div className="landing-cp__left">
          <p className="landing-cp__kicker">Contacto · Respondemos el mismo día</p>
          <h1>
            Hablemos de tu operación<span className="landing-cp__dot">.</span>
          </h1>
          <p className="landing-cp__lead">
            Cuéntanos cómo opera tu inmobiliaria hoy y te mostramos, con tus propios casos, cómo se ve en piloto
            automático.
          </p>
          <div className="landing-cp__channels">
            <a className="landing-cp__channel" href={`mailto:${CONTACT_EMAIL}`} data-testid="contact-channel-email">
              <span className="landing-cp__channel-k">Email</span>
              <span className="landing-cp__channel-v">{CONTACT_EMAIL}</span>
            </a>
            <a
              className="landing-cp__channel"
              href="https://wa.me/573000000000"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="contact-channel-whatsapp"
            >
              <span className="landing-cp__channel-k">WhatsApp</span>
              <span className="landing-cp__channel-v">+57 300 000 0000</span>
            </a>
            <div className="landing-cp__channel" data-testid="contact-channel-base">
              <span className="landing-cp__channel-k">Base</span>
              <span className="landing-cp__channel-v">Medellín, Colombia</span>
            </div>
          </div>
        </div>

        <form className="landing-cp__card" data-testid="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="landing-cp__chead">
            <span>Nueva conversación</span>
            <span>L-01</span>
          </div>

          <label className="landing-cp__field">
            <span>Nombre</span>
            <input
              type="text"
              placeholder="Tu nombre"
              autoComplete="name"
              data-testid="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="landing-cp__field">
            <span>Email</span>
            <input
              type="email"
              placeholder="tu@inmobiliaria.com"
              autoComplete="email"
              data-testid="contact-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="landing-cp__field">
            <span>Inmobiliaria</span>
            <input
              type="text"
              placeholder="Nombre de tu inmobiliaria"
              autoComplete="organization"
              data-testid="contact-agency"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            />
          </label>

          <div className="landing-cp__field">
            <span>Me interesa</span>
            <div className="landing-cp__chips" data-testid="contact-chips">
              {INTEREST_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={interest === chip}
                  className={
                    interest === chip ? 'landing-cp__chip landing-cp__chip--on' : 'landing-cp__chip'
                  }
                  onClick={() => setInterest(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <label className="landing-cp__field">
            <span>¿Qué te frena hoy?</span>
            <textarea
              rows={4}
              placeholder="Cobranza manual, cierres eternos, propietarios sin informes…"
              data-testid="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          {showError && (
            <p className="landing-cp__error" data-testid="contact-error" role="alert">
              Completa tu nombre y email para poder responderte.
            </p>
          )}

          <button type="submit" className="btn primary lg landing-cp__send" data-testid="contact-submit">
            Enviar mensaje
          </button>
          <p className="landing-cp__note">Se abre tu correo con el mensaje listo. Sin spam, sin listas.</p>
        </form>
      </div>
    </div>
  )
}
