import axios from "axios"
import type { ApiFailure, FieldIssue } from "@/types/api"

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly code = "NETWORK_ERROR",
    readonly details: FieldIssue[] = [],
  ) {
    super(message)
    this.name = "ApiRequestError"
  }
}

export function toApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error
  if (axios.isAxiosError<ApiFailure>(error)) {
    const payload = error.response?.data
    if (payload?.success === false && typeof payload.error?.message === "string") {
      return new ApiRequestError(payload.error.message, error.response?.status,
        payload.error.code, Array.isArray(payload.error.details) ? payload.error.details : [])
    }
    if (error.response) return new ApiRequestError("The request could not be completed. Please try again.", error.response.status, "REQUEST_FAILED")
  }
  return new ApiRequestError("Unable to reach OpenShelf. Check your connection and try again.")
}
