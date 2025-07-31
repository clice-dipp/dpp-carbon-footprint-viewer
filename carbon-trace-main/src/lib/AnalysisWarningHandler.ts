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

type WarningReason = string | [string] | [string, string] | ((reason: any) => string | [string] | [string, string]);

export class AnalysisWarningHandler {
  /**
   * Whether an error handler was registered
   * @private
   */
  private static registered = false

  /**
   * Pending errors which occurred before a handler was registered
   * @private
   */
  private static pendingMessages: ([string, string | undefined] | [string])[] = [];

  /**
   * Set the error handler
   * @param newWarningFunction new error handler
   */
  static set warningFunction (newWarningFunction: (warning: string, message?: string) => void) {
    if (AnalysisWarningHandler.registered) {
      console.error("AnalysisWarningHandler already set. Ignoring new warningFunction.")
    }
    AnalysisWarningHandler.handler = newWarningFunction
    while (AnalysisWarningHandler.pendingMessages.length > 0) {
      const msg = AnalysisWarningHandler.pendingMessages.shift()!;
      newWarningFunction(msg[0], msg[1]);
    }
    this.registered = true
  }

  static handler (warningTitle: string, warningDetails?: string) {
    if (AnalysisWarningHandler.registered) {
      AnalysisWarningHandler.handler(warningTitle, warningDetails);
    } else {
      AnalysisWarningHandler.pendingMessages.push([warningTitle, warningDetails])
    }
  }

  /**
   * Add an error to handle
   * @param promise
   * @param message
   */
  static bind<T> (promise: Promise<T>, message?: WarningReason): Promise<T> {
    promise.catch((reason) => {
      console.error(reason);
      const warning = AnalysisWarningHandler.parseReason(message, reason);
      AnalysisWarningHandler.handler(warning[0], warning[1]);
    })
    return promise;
  }

  private static parseReason(message?: WarningReason, reason?: any): [string, string] | [string] {
    if (message === undefined) {
      return ["Problem while creating analysis", "Please be wary and check essential values manually"];
    }
    if (typeof message === "function") {
      message = message(reason);
    }
    if (typeof message === "string") {
      message = [message];
    }
    return message;
  }

  /**
   *
   */
  static try (method: () => any, message?: WarningReason) {
    try {
      method();
    } catch (e) {
      console.warn("Caught", e);
      const warning = AnalysisWarningHandler.parseReason(message, e);
      AnalysisWarningHandler.handler(warning[0], warning[1]);
    }
  }
}
