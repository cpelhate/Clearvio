"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function InscriptionPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, org_name: orgName }
      }
    })
    if (error) {
      setError(error.message)
    } else {
      router.push("/tableau-de-bord")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8, letterSpacing: "-0.01em" }}>
        Créer un compte
      </h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        {step === 1 ? "Vos informations personnelles" : "Votre organisation"}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[1, 2].map((s) => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 9999, background: s <= step ? "var(--color-accent-default)" : "var(--color-border-default)", transition: "background 300ms" }} />
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {step === 1 ? (
          <>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Prénom</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Jean"
                  style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: 14, background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Nom</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Dupont"
                  style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: 14, background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Adresse email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@exemple.fr"
                style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: 14, background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="8 caractères minimum" minLength={8}
                style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: 14, background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }} />
            </div>
          </>
        ) : (
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Nom de votre organisation</label>
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="Acme SAS"
              style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: 14, background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }} />
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 6 }}>
              Vous serez automatiquement Administrateur de cette organisation.
            </p>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: "var(--color-danger-default)", padding: "8px 12px", background: "var(--color-danger-bg)", borderRadius: "var(--radius-md)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}
          style={{ height: 36, background: "var(--color-accent-default)", color: "var(--color-accent-text)", border: "none", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}>
          {step === 1 ? "Continuer" : loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center" }}>
        Déjà un compte ?{" "}
        <Link href="/connexion" style={{ color: "var(--color-accent-default)", textDecoration: "none", fontWeight: 500 }}>
          Se connecter
        </Link>
      </p>
    </>
  )
}
