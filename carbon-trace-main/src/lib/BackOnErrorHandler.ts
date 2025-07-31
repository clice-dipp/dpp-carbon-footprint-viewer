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

export class BackOnErrorHandler {
  /**
   * Whether an error handler was registered
   * @private
   */
  private static registered = false
  /**
   * Pending errors which occured before a handler was registered
   * @private
   */
  private static pendingMessage: [string, string] | [string] | null = null;

  /**
   * Set the error handler
   * @param newErrorFunction new error handler
   */
  static set errorFunction (newErrorFunction: (error: string, message?: string) => void) {
    if (BackOnErrorHandler.registered) {
      console.error("BackOnError already set. Ignoring new errorFunction.")
    }
    this.handler = newErrorFunction
    if (this.pendingMessage) {
      newErrorFunction(this.pendingMessage[0], this.pendingMessage[1]);
    }
    this.registered = true
  }

  static handler (error: string, backButton?: string) {
    this.pendingMessage = backButton ? [error, backButton] : [error];
  }

  /**
   * Add an error to handle
   * @param promise
   * @param message
   */
  static bind<T> (promise: Promise<T>, message?: string | [string] | [string, string] | ((reason: any) => string | [string] | [string, string] | false)): Promise<T> {
    promise.catch((reason) => {
      if (message === undefined) {
        BackOnErrorHandler.handler("An error occurred");
        return;
      }
      if (typeof message === "function") {
        const returnValue = message(reason);
        if (returnValue === false) {
          return;
        }
        message = returnValue
      }
      if (typeof message === "string") {
        message = [message];
      }
      console.error(message[0], message[1], reason);
      BackOnErrorHandler.handler(message[0], message[1]);
    })
    return promise;
  }
}
