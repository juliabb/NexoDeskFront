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
  const isFormData = init.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
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

export async function downloadAuthenticated(path: string, token: string, fileName: string) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody
    throw new ApiError(body.mensagem ?? body.detail ?? body.title ?? 'Não foi possível baixar o arquivo.', response.status)
  }

  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
