const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')

type ApiErrorBody = { mensagem?: string; title?: string; detail?: string; errors?: Record<string, string[]> }

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api<T = void>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody
    const validationMessage = body.errors ? Object.values(body.errors).flat()[0] : undefined
    throw new ApiError(body.mensagem ?? validationMessage ?? body.detail ?? body.title ?? 'Não foi possível concluir a solicitação.', response.status)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  return response.json() as Promise<T>
}
