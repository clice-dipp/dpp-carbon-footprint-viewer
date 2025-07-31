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

let useDark = false;

type Color = [lightModeRgb: [number, number, number], darkModeRgb?: [number, number, number]]

const colors = {
  "pcf": [[237, 237, 237], [237, 237, 237]],
  "tcf": [[209, 209, 209]],
  "cf": [[223, 223, 223]],
} as const satisfies Record<string, Color>;

export default function c(surfaceName: keyof typeof colors): [number, number, number] {
  return useDark ? colors[surfaceName][1] || colors[surfaceName][0] : colors[surfaceName][0];
}

export function colorString(surfaceName: keyof typeof colors): string {
  return `rgb(${c(surfaceName).join(",")})`;
}

export function set(mode: "light" | "dark") {
  useDark = mode === "dark";
}
