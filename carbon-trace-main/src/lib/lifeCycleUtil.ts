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

/**
 * Utilities regarding the life cycle of an asset
 */

/**
 * Existing life cycle phases
 */
export const lifeCyclePhaseSequence = Object.freeze(['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'C1', 'C2', 'C3', 'C4', 'D'] as const)
export const lifeCycleStageSequence = Object.freeze(['A', 'B', 'C', 'D'] as const)

/**
 * Existing life cycle phases as type
 */
export type LifeCyclePhase = typeof lifeCyclePhaseSequence[number];
export type LifeCycleStage = typeof lifeCycleStageSequence[number];
export const lifeCyclePhaseToStage = (phase: LifeCyclePhase) => {
  const stage = phase[0].toUpperCase() as LifeCycleStage;
  if (lifeCycleStageSequence.includes(stage)) {
    return stage;
  }
  throw new Error("Unknown life cycle stage");
}
type LifeCyclePhaseDiff = {
  onlyThis: LifeCyclePhase[],
  both: LifeCyclePhase[],
  onlyOther: LifeCyclePhase[]
}

/**
 * Lookup object for mapping a lifeCyclePhase to its index
 */
const lifeCyclePhaseLookup = Object.freeze(Object.fromEntries(lifeCyclePhaseSequence.map((lc: LifeCyclePhase, i: number) => [lc, i])) as Record<LifeCyclePhase, number>)

/**
 * Mapping of a lifecycle phase to its description
 */
export const lifeCyclePhaseDescription: Record<LifeCyclePhase, string> = Object.freeze({
  A1: 'raw material supply (and upstream production)',
  A2: 'cradle-to-gate transport to factory',
  A3: 'production',
  A4: 'transport to final destination',
  B1: 'usage phase',
  B2: 'maintenance',
  B3: 'repair',
  B4: 'replacement',
  B5: 'update/upgrade, refurbishing',
  B6: 'usage energy consumption',
  B7: 'usage water consumption',
  C1: 'reassembly',
  C2: 'transport to recycler',
  C3: 'recycling, waste treatment',
  C4: 'landfill',
  D: 'reuse'
})
export const lifeCycleStageDescription: Record<LifeCycleStage, string> = Object.freeze({
  A: 'production',
  B: 'use',
  C: 'disposal',
  D: 'reuse'
})
export const lifeCyclePhaseByStage: Record<LifeCycleStage, LifeCyclePhase[]> = Object.freeze(Object.fromEntries(
  lifeCycleStageSequence.map(s => [s, lifeCyclePhaseSequence.filter(p => p.startsWith(s))])
));

/**
 * Mapping of a lifecycle phase to its color (rgb-array)
 */
export const lifeCyclePhaseColor: Record<LifeCyclePhase, [r: number, g: number, b: number]> = Object.freeze({
  A1: [96, 190, 182],
  A2: [96, 194, 167],
  A3: [96, 197, 151],
  A4: [96, 201, 132],
  B1: [97, 204, 113],
  B2: [96, 207, 91],
  B3: [97, 210, 69],
  B4: [97, 211, 56],
  B5: [97, 213, 43],
  B6: [106, 216, 36],
  B7: [120, 219, 37],
  C1: [135, 222, 36],
  C2: [153, 226, 35],
  C3: [173, 228, 34],
  C4: [195, 232, 33],
  D: [219, 236, 34]
})
export const lifeCycleStageColor: Record<LifeCycleStage, [r: number, g: number, b: number]> = Object.freeze({
  A: [96, 190, 182],
  B: [96, 210, 69],
  C: [153, 226, 35],
  D: [219, 236, 34]
});

/**
 * color to use if no lifecycle phase is specified
 */
export const unspecifiedColor: readonly [number, number, number] = Object.freeze([204, 204, 204])

/**
 * text to use if no lifecycle phase is specified
 */
export const unspecifiedText = 'unspecified life cycle phase'

/**
 * Comparison method to sort lifecycle phases by occurrence, if multiple and the start is the same, show the one with the last phase also last
 * @param lifeCycleA one lifecycle
 * @param lifeCycleB the other lifecycle to compare against
 * @returns a value compatible for sorting (negative, positive, 0, NaN)
 */
export const lifeCyclePhaseSort = (lifeCycleA?: LifeCyclePhase | LifeCyclePhases, lifeCycleB?: LifeCyclePhase | LifeCyclePhases): number => {
  const a = typeof lifeCycleA === 'object' ? lifeCycleA.phases[0] : lifeCycleA
  const b = typeof lifeCycleB === 'object' ? lifeCycleB.phases[0] : lifeCycleB
  const sortNum = (a ? lifeCyclePhaseLookup[a] : Infinity) - (b ? lifeCyclePhaseLookup[b] : Infinity)
  return (sortNum === 0 || Number.isNaN(sortNum)) && (typeof lifeCycleA === 'object' || typeof lifeCycleB === 'object')
    ? lifeCyclePhaseSort(
      typeof lifeCycleA === 'object' ? lifeCycleA.phases[lifeCycleA.phases.length - 1] : lifeCycleA,
      typeof lifeCycleB === 'object' ? lifeCycleB.phases[lifeCycleB.phases.length - 1] : lifeCycleB
    )
    : sortNum
}

/**
 * Parse a string which contains one lifecycle phase to a lifecycle phase
 * @param lifeCycle string which contains a lifecycle phase
 * @returns the contained lifecycle phase
 */
export function parseLifeCyclePhase (lifeCycle: string): LifeCyclePhase {
  lifeCycle = lifeCycle.trim().substring(0, 2).toUpperCase()
  // Check for 2-letter and 1-letter lifeCycle codes
  if (lifeCyclePhaseSequence.includes(lifeCycle as LifeCyclePhase) || lifeCyclePhaseSequence.includes(lifeCycle[0] as LifeCyclePhase)) {
    return lifeCycle as LifeCyclePhase
  }
  throw TypeError(`Invalid lifeCycle: ${lifeCycle}`)
}

/**
 * Regex which matches all lifeCycle identifiers in a string, any of those conditions:
 *  - uppercase letters A-C followed by one or two digits, and whitespaces/start/end/split-characters before/after
 *  - uppercase letter D without a char or letter before or after, and whitespaces/start/end/split-characters before/after
 *  - multiple above-mentioned identifiers joined by split-characters
 * split-characters are: -–—―‒,;|+&\
 */
const lifeCycleRegex = /((?:[A-C]\d\d?|D$|D(?=\W))(?:[ \-–—―‒,;|+&/\\]+(?:[A-C]\d\d?|D$|D(?=\W)))*)/gm

/**
 * An empty LifeCyclePhases-Object (since the values are readonly, this will always be returned when
 * creating a new empty LifeCyclePhases-Object
 */
// eslint-disable-next-line no-use-before-define,prefer-const
let emptyLifeCyclePhases: LifeCyclePhases | undefined

export class LifeCyclePhases {
  /**
   * lifecycle phases being represented by this class
   * @private
   */
  private readonly lifeCyclePhases: readonly LifeCyclePhase[]

  /**
   * Original string which was used to create these life cycle phases object but ONLY if the object is not empty
   * @private
   */
  private readonly originalString: string

  /**
   * Color which should be used to represent these lifecycle phases
   * @private
   */
  private lifeCycleColor: readonly [number, number, number] | undefined

  /**
   * String representation of these life cycle phases
   * @private
   */
  private asString: string | undefined

  /**
   * Find all life cycle phases inside a string and represent them in this object
   * @param lifeCyclePhases String containing the life cycle phases to find
   */
  constructor (lifeCyclePhases?: string | string[] | false | null) {
    if (Array.isArray(lifeCyclePhases)) {
      lifeCyclePhases = lifeCyclePhases.join(", ");
    }
    // Empty? Return the empty instance.
    if ((!lifeCyclePhases || !lifeCyclePhases.trim()) && emptyLifeCyclePhases) {
      this.lifeCyclePhases = []
      this.originalString = ''
      // eslint-disable-next-line no-constructor-return
      return emptyLifeCyclePhases
    }
    if (!lifeCyclePhases) {
      lifeCyclePhases = ''
    }
    this.originalString = lifeCyclePhases
    // find all life cycle phase strings (or ranges or lists) and normalize them
    // (so a list is always split by ',' and a range always by '-')
    const lifeCycles = (lifeCyclePhases.trim().match(lifeCycleRegex) || [])
      .map((match) => match.replace(/ /g, '').replace(/[;|+&/\\]/g, ',').replace(/[–—―‒]/g, '-')) // normalize
    const phases: LifeCyclePhase[] = []
    for (const lifeCycleString of lifeCycles) {
      for (const range of lifeCycleString.split(',')) {
        // everything matched will be handled by the range parser
        phases.push(...LifeCyclePhases.parseLifeCycleRange(range))
      }
    }
    if (phases.length === 0 && emptyLifeCyclePhases) {
      this.lifeCyclePhases = []
      this.originalString = ''
      // eslint-disable-next-line no-constructor-return
      return emptyLifeCyclePhases
    }
    // remove duplicates, sort by their sequence occurrence
    this.lifeCyclePhases = Object.freeze([...new Set(phases)].sort(lifeCyclePhaseSort))
  }

  /**
   * All life cycle phases this object represents
   */
  get phases (): readonly LifeCyclePhase[] {
    return this.lifeCyclePhases
  }

  /**
   * All life cycle stages this object represents
   */
  get stages (): readonly LifeCycleStage[] {
    const stages = this.lifeCyclePhases.map(lifeCyclePhaseToStage);
    return stages.filter((stage, i) => i === 0 || stages[i-1] !== stage);
  }

  /**
   * Original string used to create this object
   * ALWAYS '' if it does not contain any life cycle phases
   */
  get original () {
    return this.originalString
  }

  /**
   * Number of life cycle phases this object represents
   */
  get length () {
    return this.lifeCyclePhases.length
  }

  /**
   * RGB-color which should be used to represent these life cycle phases
   */
  get color (): readonly [red: number, green: number, blue: number] {
    if (this.lifeCycleColor) return this.lifeCycleColor
    if (this.lifeCyclePhases.length === 0) return unspecifiedColor
    let [r, g, b] = lifeCyclePhaseColor[this.lifeCyclePhases[0]]
    for (let i = 1; i < this.lifeCyclePhases.length; i++) {
      const [rr, gg, bb] = lifeCyclePhaseColor[this.lifeCyclePhases[i]]
      r += rr
      g += gg
      b += bb
    }
    this.lifeCycleColor = Object.freeze([r / this.lifeCyclePhases.length, g / this.lifeCyclePhases.length, b / this.lifeCyclePhases.length])
    return this.lifeCycleColor
  }

  /**
   * String representation of all life cycle phases contained in this object
   * @param asHtml Whether html-tags should be added to add emphasis
   * @param includeDescriptionIfNoneOrOne Whether to include the description of the phase if this object only
   *   represents one phase or is empty
   */
  toString (asHtml: boolean = false, includeDescriptionIfNoneOrOne: boolean = false): string {
    const dash = asHtml ? '&ndash;' : '–';
    if (this.lifeCyclePhases.length === 0) {
      this.asString = ''
    }
    if (this.asString !== undefined) {
      let returnString = !this.asString && includeDescriptionIfNoneOrOne ? unspecifiedText : this.asString
      if (includeDescriptionIfNoneOrOne && this.lifeCyclePhases.length === 1) {
        returnString += ` ${dash} ${lifeCyclePhaseDescription[this.lifeCyclePhases[0]]}`
      }
      if (asHtml) {
        if (this.lifeCyclePhases.length === 0 && returnString.length !== 0) {
          returnString = `<em>${returnString}</em>`
        }
      }
      return returnString
    }
    let firstCycle = -1
    let lastCycle = -1
    const lifeCycleStrings: string[] = []
    for (const lifeCycle of this.lifeCyclePhases) {
      const current = lifeCyclePhaseLookup[lifeCycle]
      if (current === 0) {
        if (firstCycle !== -1) {
          lifeCycleStrings.push(LifeCyclePhases.rangeToString(firstCycle, lastCycle))
        }
        firstCycle = 0
        lastCycle = 0
      } else if (lastCycle + 1 === current) {
        lastCycle = current
      } else {
        if (lastCycle !== -1) {
          lifeCycleStrings.push(LifeCyclePhases.rangeToString(firstCycle, lastCycle))
        }
        firstCycle = current
        lastCycle = current
      }
    }
    lifeCycleStrings.push(LifeCyclePhases.rangeToString(firstCycle, lastCycle))
    this.asString = lifeCycleStrings.join(', ')
    return this.toString(asHtml, includeDescriptionIfNoneOrOne)
  }

  public static merged(...phases: (LifeCyclePhases | undefined)[]) {
    phases = phases.filter(p => p !== undefined);
    if (phases.length === 0) {
      return new LifeCyclePhases();
    }
    if (phases.length === 1) {
      return phases[0];
    }
    return new LifeCyclePhases(phases.map(p => p.lifeCyclePhases).flat())
  }

  public merge (...phases: LifeCyclePhases[]) {
    return LifeCyclePhases.merged(this, ...phases);
  }

  /**
   * Compare to other life cycle phase(s) for sorting
   * @param phase Phase to compare it to
   * @returns sort-compatible value (negative, positive, 0, NaN)
   */
  public compareTo (phase: LifeCyclePhase | LifeCyclePhases) {
    return lifeCyclePhaseSort(this, phase)
  }

  public intersection(other: LifeCyclePhases) {
    const intersection = [];
    for (const p of this.phases) {
      if (other.phases.includes(p)) {
        intersection.push(p);
      }
    }
    return intersection;
  }

  public diff(other: LifeCyclePhases): LifeCyclePhaseDiff {
    const onlyThis: LifeCyclePhase[] = [];
    const onlyOther: LifeCyclePhase[] = [];
    const both: LifeCyclePhase[] = [];

    let i = 0;
    let j = 0;

    while (i < this.phases.length && j < other.phases.length) {
      const thisIndex = lifeCyclePhaseSequence.indexOf(this.phases[i])
      const otherIndex = lifeCyclePhaseSequence.indexOf(other.phases[j])
      if (thisIndex < otherIndex) {
        onlyThis.push(this.phases[i]);
        i += 1;
      } else if (thisIndex > otherIndex) {
        onlyOther.push(other.phases[j]);
        j += 1;
      } else {
        both.push(this.phases[i]);
        i += 1;
        j += 1;
      }
    }

    while (i < this.phases.length) {
      onlyThis.push(this.phases[i]);
      i += 1;
    }

    while (j < other.length) {
      onlyOther.push(other.phases[j]);
      j += 1;
    }

    return { onlyThis, onlyOther, both };
  }

  /**
   * Match a life cycle phase range (e.g. "A1-D", "A3 - C1", "A3-C1-D" [same as "A3-C1" and "C1-D"])
   * to an array of its contained life cycles
   * @param range range to parse to an array
   * @returns all LifeCyclePhases contained in the range
   */
  private static parseLifeCycleRange (range: string): LifeCyclePhase[] {
    const splitted = range.split('-').map(parseLifeCyclePhase)
    if (splitted.length < 2) {
      return splitted
    }
    const phases: LifeCyclePhase[] = []
    for (let i = 0; i < splitted.length - 1; i++) {
      const one = lifeCyclePhaseLookup[splitted[i]]
      const other = lifeCyclePhaseLookup[splitted[i + 1]]
      phases.push(
        ...lifeCyclePhaseSequence.slice(Math.min(one, other), Math.max(one, other) + 1)
      )
    }
    return phases
  }

  /**
   * Create a string representation of a life cycle phase range
   * @param lowerIndex Lower end of the range
   * @param upperIndex Upper end of the range
   * @private
   */
  private static rangeToString (lowerIndex: number, upperIndex: number) {
    if (upperIndex === -1) {
      upperIndex = lowerIndex
    }
    if (lowerIndex === upperIndex) {
      return lifeCyclePhaseSequence[lowerIndex] as string
    }
    if (lowerIndex + 1 === upperIndex) {
      return `${lifeCyclePhaseSequence[lowerIndex]}, ${lifeCyclePhaseSequence[upperIndex]}`
    }
    return `${lifeCyclePhaseSequence[lowerIndex]} - ${lifeCyclePhaseSequence[upperIndex]}`
  }

  equals(other: { readonly phases: readonly LifeCyclePhase[] }): boolean {
    return this.phases.every((p, i) => p === other.phases[i])
  }
}

emptyLifeCyclePhases = new LifeCyclePhases(undefined)
