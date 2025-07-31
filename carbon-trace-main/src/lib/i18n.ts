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

import type { components } from '@/lib/api/AssetAdministrationShellRegistry'

const userLanguages = (navigator.languages || [navigator.language] || [(navigator as any).userLanguage as string]);

// Preferred languages, mostly as ISO 639, and english as fallback
const preferredLanguages = [
  ...userLanguages.map(x => x.split("-", 1)[0].toLowerCase()).filter(x => x.length == 2),
  "en"
];

export default function lang(
  languageStrings?: components["schemas"]["AbstractLangString"][]
) {
  if (!languageStrings || !languageStrings.length) {
    return "";
  }
  for (const l of preferredLanguages) {
    for (const lString of languageStrings) {
      if (lString.language.toLowerCase() === l) {
        return lString.text;
      }
    }
  }
  return languageStrings[0].text;
}

export function langOrString(
  languageStrings?: components["schemas"]["AbstractLangString"][] | string
) {
  if (typeof  languageStrings === "string") {
    return languageStrings;
  }
  return lang(languageStrings);
}
