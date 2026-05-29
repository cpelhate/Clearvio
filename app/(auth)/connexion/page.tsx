"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ConnexionPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Email ou mot de passe incorrect.")
    } else {
      router.push("/tableau-de-bord")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8, letterSpacing: "-0.01em" }}>
        Connexion
      </h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        Accédez à votre espace Clearvio
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="email" style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.fr"
            required
            style={{
              width: "100%",
              height: 36,
              padding: "0 12px",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              color: "var(--color-text-primary)",
              background: "var(--color-bg-primary)",
              outline: "none",
            }}
          />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <label htmlFor="password" style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)" }}>
              Mot de passe
            </label>
            <Link href="/mot-de-passe-oublie" style={{ fontSize: 13, color: "var(--color-accent-default)", textDecoration: "none" }}>
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{
              width: "100%",
              height: 36,
              padding: "0 12px",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              color: "var(--color-text-primary)",
              background: "var(--color-bg-primary)",
              outline: "none",
            }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "var(--color-danger-default)", padding: "8px 12px", background: "var(--color-danger-bg)", borderRadius: "var(--radius-md)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            height: 36,
            background: loading ? "var(--color-accent-subtle)" : "var(--color-accent-default)",
            color: "var(--color-accent-text)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 150ms",
          }}
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center" }}>
        Pas encore de compte ?{" "}
        <Link href="/inscription" style={{ color: "var(--color-accent-default)", textDecoration: "none", fontWeight: 500 }}>
          Créer un compte
        </Link>
      </p>
    </>
  )
}
