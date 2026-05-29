"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    })
    setSent(true)
    setLoading(false)
  }

  return sent ? (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8 }}>Email envoyé</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        Si un compte est associé à cette adresse, vous recevrez un email de réinitialisation dans quelques minutes.
      </p>
      <Link href="/connexion" style={{ display: "block", textAlign: "center", fontSize: 14, color: "var(--color-accent-default)", textDecoration: "none" }}>
        ← Retour à la connexion
      </Link>
    </>
  ) : (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8 }}>Mot de passe oublié</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        Entrez votre email pour recevoir un lien de réinitialisation.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Adresse email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@exemple.fr"
            style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid var(--color-border-default)", borderRadius: "var(--radius-md)", fontSize: 14, background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }} />
        </div>
        <button type="submit" disabled={loading}
          style={{ height: 36, background: "var(--color-accent-default)", color: "var(--color-accent-text)", border: "none", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>
      <p style={{ marginTop: 24, fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center" }}>
        <Link href="/connexion" style={{ color: "var(--color-accent-default)", textDecoration: "none" }}>
          ← Retour à la connexion
        </Link>
      </p>
    </>
  )
}
