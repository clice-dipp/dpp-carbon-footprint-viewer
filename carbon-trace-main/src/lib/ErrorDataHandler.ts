/**
 *   Copyright 2025 Moritz Bock and Software GmbH (previously Software AG)
 *   
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *   
 *     http://www.apache.org/licenses/LICENSE-2.0
 *   
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { CircularDependencyError } from '@/lib/visualization/CarbonSankeyData'

/**
 * Error response data
 */
export type ErrorDataHandler = {
  /**
   * Timestamp of the error
   */
  timestamp?: Date

  /**
   * Error (i.e. HTTP) status code
   */
  status?: number

  /**
   * Information on the error
   */
  message: string

  /**
   * More details on the error
   */
  details?: string

  /**
   * stack trace of the error
   */
  trace?: string
}

/**
 * ErrorClient handling errors from the beginning and making it able to show the UI even though an error might
 * occur before the UI is loaded
 */
export class ErrorClient {
  /**
   * Whether an error handler was registered
   * @private
   */
  private static registered = false

  /**
   * Pending errors which occured before a handler was registered
   * @private
   */
  private static pendingErrors: ErrorDataHandler[] = []

  /**
   * Set the error handler
   * @param newErrorFunction new error handler
   */
  static set errorFunction (newErrorFunction: (e: ErrorDataHandler) => void) {
    if (ErrorClient.registered) {
      ErrorClient.add({
        timestamp: new Date(),
        message: 'ErrorClient already registered'
      })
    }
    this.#errorFunction = newErrorFunction;
    // Pass errors which occurred before setting the handler now to it
    while (ErrorClient.pendingErrors.length) {
      this.#errorFunction(ErrorClient.pendingErrors.shift()!)
    }
    this.registered = true
  }

  static #errorFunction = (e: ErrorDataHandler) => {
    this.pendingErrors.push(e);
  }

  /**
   * Add an unknown error object
   * @param error Error to add
   */
  static addUnknown (error: unknown) {
    let details: string | undefined;
    try {
      details = JSON.stringify(error);
    } catch (exc) {
      if (!(exc instanceof CircularDependencyError)) {
        throw exc;
      }
    }
    ErrorClient.add({
      timestamp: new Date(),
      message: `Error of unknown type: ${(error || JSON.stringify(error)).toString()}`,
      details
    })
  }

  /**
   * Add an error to handle
   * @param error Error to add
   */
  static add (error: ErrorDataHandler | undefined | string) {
    if (error === undefined) {
      return
    }
    if (typeof error === 'string') {
      error = {
        message: error,
      }
    }
    if (!error.timestamp) {
      error.timestamp = new Date();
    }
    this.#errorFunction(error);
  }

  /**
   * Add an error from an API call to handle
   * @param apiResponse api response containing an error
   */
  static addFromApi (apiResponse?: { [key: string]: unknown }) {
    if (!apiResponse) return
    ErrorClient.add({
      timestamp: new Date(apiResponse?.timestamp as string),
      message: (apiResponse?.error as string) || (apiResponse?.message as string),
      details: apiResponse.error ? (apiResponse?.message as string) : undefined,
      status: apiResponse?.status as number,
      trace: apiResponse?.trace as string
    })
  }

  static unhandledRejection(event: PromiseRejectionEvent) {
    ErrorClient.add({
      timestamp: new Date(performance.timeOrigin + event.timeStamp),
      message: `${event.type} - Unhandled Promise rejection`,
      trace: JSON.stringify(event.reason),
    })
  }
}
