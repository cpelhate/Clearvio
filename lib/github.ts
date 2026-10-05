const GITHUB_API = 'https://api.github.com'

interface GithubConnection {
  repoOwner: string
  repoName: string
  accessToken: string
}

interface CreateIssueParams {
  title: string
  body?: string | null
  labels?: string[]
}

interface UpdateIssueParams {
  title?: string
  body?: string | null
  state?: 'open' | 'closed'
}

async function githubFetch(
  connection: GithubConnection,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

export async function createGithubIssue(
  connection: GithubConnection,
  params: CreateIssueParams
): Promise<number | null> {
  try {
    const res = await githubFetch(
      connection,
      `/repos/${connection.repoOwner}/${connection.repoName}/issues`,
      { method: 'POST', body: JSON.stringify({ title: params.title, body: params.body ?? '', labels: params.labels ?? [] }) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.number ?? null
  } catch {
    return null
  }
}

export async function updateGithubIssue(
  connection: GithubConnection,
  issueNumber: number,
  params: UpdateIssueParams
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {}
    if (params.title !== undefined) body.title = params.title
    if (params.body !== undefined) body.body = params.body ?? ''
    if (params.state !== undefined) body.state = params.state
    const res = await githubFetch(
      connection,
      `/repos/${connection.repoOwner}/${connection.repoName}/issues/${issueNumber}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    )
    return res.ok
  } catch {
    return false
  }
}

export async function closeGithubIssue(
  connection: GithubConnection,
  issueNumber: number
): Promise<boolean> {
  return updateGithubIssue(connection, issueNumber, { state: 'closed' })
}
