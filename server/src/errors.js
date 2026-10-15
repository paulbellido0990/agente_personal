export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}
export function errorHandler(error, _req, res, _next) {
  const status = error instanceof HttpError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : error.status === 415 ? 415 : 500
  const message = error instanceof HttpError ? error.message : status === 413 ? 'La solicitud supera el límite de 1 MB.' : status === 400 ? 'El cuerpo debe contener JSON válido.' : status === 415 ? 'El formato del cuerpo no es compatible.' : 'No se pudo completar la operación. Inténtalo de nuevo.'
  if (status === 500) console.error('Error interno de ALIRA:', error.code || error.name)
  res.status(status).json({ error: { message, ...(error.details ? { details: error.details } : {}) } })
}
