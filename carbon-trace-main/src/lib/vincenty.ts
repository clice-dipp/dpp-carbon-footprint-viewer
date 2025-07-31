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

// Source: https://www.npmjs.com/package/vincenty
const wgs84 = {
  earth: { a: 6378137.0, f: 1 / 298.257223563, b: 6356752.314245 }, //🜃
};

// https://en.wikipedia.org/wiki/Vincenty%27s_formulae#Inverse_problem
export default function distVincenty(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  params = wgs84.earth
) {
  const { a, b, f} = params;

  // U1, U2: Reduced latitudes (i.e. latitudes on the auxiliary sphere)
  const U1 = Math.atan((1 - f) * Math.tan((lat1 * Math.PI) / 180));
  const U2 = Math.atan((1 - f) * Math.tan((lat2 * Math.PI) / 180));

  // (precompute their sine and cosines)
  const sinU1 = Math.sin(U1);
  const sinU2 = Math.sin(U2);
  const cosU1 = Math.cos(U1);
  const cosU2 = Math.cos(U2);

  // L: Difference (in radians) in longitude of two points
  const L = ((lon2 - lon1) * Math.PI) / 180;

  // λ: Difference (in radians) in longitude of the points on the auxiliary sphere
  let la = L;
  let sinLa, cosLa; // Precomputation of sin(λ) and cos(λ)

  // α: Forward azimuth of the geodesic at the equator, if it were extended that far
  let aa;
  let sinAa, cos2Aa; // Precomputation of sin(α) and cos²(α)

  // α_1, α_2: forward azimuths at the points
  let aa1, aa2;

  // s: Ellipsoidal distance between the two points
  let s = Infinity;

  // σ: Angular separation between points
  let sa = Infinity;
  let sinSa, cosSa; // Precomputation of sin(σ) and cos(σ)
  let dSa; // Δσ

  // σ_1: angular separation between the point and the equator
  let s1 = Infinity;

  // σ_m: angular separation between the midpoint of the line and the equator
  let sam = Infinity;
  let cos2sam, cos22sam; // Precomputation of cos(2 * σ_m) and cos²(2 * σ_m)

  let laPrev = -Infinity;
  let A, B, C, u2;
  while (la - laPrev > 1e-12) {
    // Precompute sin and cos of λ
    cosLa = Math.cos(la);
    sinLa = Math.sin(la);

    // σ is not evaluated directly from sin σ or cos σ
    // to preserve numerical accuracy near the poles and equator
    sinSa = Math.sqrt(
      (cosU2 * sinLa) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLa) ** 2
    );
    cosSa = sinU1 * sinU2 + cosU1 * cosU2 * cosLa;
    sa = Math.atan2(sinSa, cosSa);

    // If sin(σ) == 0 the value of sin α is indeterminate:
    // it represents an end point coincident with, or
    // diametrically opposed to, the start point.
    sinAa = (cosU1 * cosU2 * sinLa) / sinSa;

    // Precompute this intermediate value
    cos2Aa = 1 - sinAa ** 2;

    cos2sam = cosSa - (2 * sinU1 * sinU2) / cos2Aa;
    cos22sam = cos2sam ** 2;

    C = (f / 16) * cos2Aa * (4 + f * (4 - 3 * cos2Aa));

    laPrev = la;
    la =
      L +
      (1 - C) *
      f *
      sinAa *
      (sa + C * sinSa * (cos2sam + C * cosSa * (-1 + 2 * cos22sam)));
  }

  u2 = cos2Aa * ((a ** 2 - b ** 2) / b ** 2);

  A = 1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));

  B = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));

  dSa =
    B *
    sinSa *
    (cos2sam +
      (B / 4) *
      (cosSa * (-1 + 2 * cos22sam) -
        (B / 6) * cos2sam * (-3 + 4 * sinSa ** 2) * (-3 + 4 * cos22sam)));

  s = b * A * (sa - dSa);

  // aa1 = Math.atan2(cosU2 * sin_la, cosU1 * sinU2 - sinU1 * cosU2 * cosLa);
  // aa2 = Math.atan2(cosU1 * sin_la, -sinU1 * cosU2);

  return s;
}

