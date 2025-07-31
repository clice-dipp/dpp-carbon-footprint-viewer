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

import type { Selection as D3Selection } from 'd3-selection'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { render, type VNode, h, Fragment } from 'vue'
import { UNIT } from './CarbonSankeyData';
import type { Node, Link } from './CarbonSankeyData';
import { grams, numberToString, pluralize, quote } from '@/lib/util'
import { LifeCyclePhases } from '@/lib/lifeCycleUtil'
import _ from 'lodash'
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/vue/24/outline'

export default class CarbonSankeyTooltip {
  /**
   * tooltip element
   * @private
   */
  private readonly tooltip: D3Selection<HTMLDivElement, unknown, null, undefined>

  /**
   * Whether to hide PCF data when displaying a node
   */
  public hidePCF: boolean = false

  /**
   * Whether to hide TCF data when displaying a node
   */
  public hideTCF: boolean = false

  /**
   * Vertical offset in px above/below the cursor when moving the tooltip
   */
  private verticalOffset = 10

  /**
   * Tooltip inside a visualization
   * @param tooltip tooltip node which should be at the top-left of the bounding box which is referenced
   *   in the move-method. Its parent element should be relative or absolute and not have any padding
   *   (you are likely fine if you just put it in a div with `position: relative`)
   */
  constructor(tooltip: D3Selection<HTMLDivElement, unknown, null, undefined>) {
    this.tooltip = tooltip
    tooltip
      .style('position', 'absolute')
      .style('display', 'none')
      .style('z-index', 10)
      .style('pointer-events', 'none')
      // .style('padding', '5px')
      // .style('background', 'rgba(255, 255, 255, 0.6)')
      // .style('border', '1px solid #999')
      // .style('border-radius', '5px')
      // .style('backdrop-filter', 'blur(5px)')
      // .style('font', '10px sans-serif')
  }

  /**
   * Move the tooltip next to the current cursor position
   * @param e mouse event containing current cursor position
   * @param boundingBox bounding box of the tooltip, where it may not be outside of
   */
  move(e: MouseEvent, boundingBox: DOMRect) {
    const tip = this.tooltip.node()!.getBoundingClientRect()
    let top: string | number = e.clientY - boundingBox.top - tip.height
    let right: string | number = Math.max(0, boundingBox.right - e.clientX - tip.width / 2)
    let bottom: string | number = Math.max(0, boundingBox.bottom - e.clientY + this.verticalOffset)
    let left: string | number = Math.max(0, e.clientX - boundingBox.left - tip.width / 2)
    // check vertical overflow, move below cursor if necessary
    if (top <= this.verticalOffset) {
      top = `${tip.height + top + this.verticalOffset}px`
      bottom = 'auto'
    } else {
      bottom = `${bottom}px`
      top = 'auto'
    }
    // check horizontal flow, just dont move it over the border
    if (left === 0) {
      left = `${left}px`
      right = 'auto'
    } else {
      right = `${right}px`
      left = 'auto'
    }
    this.tooltip.style('inset', `${top} ${right} ${bottom} ${left}`)
  }

  /**
   * hide the tooltip
   */
  hide() {
    this.tooltip.style('display', 'none')
  }

  render(el: VNode) {
    const t = this.tooltip;
    t.html('');
    const container = document.createElement('div');
    render(el, container);
    t.node()!.appendChild(container);
  }

  /**
   * Show the tooltip with node data inside
   * @param n node data to show in the tooltip
   */
  showNode(n: Node) {
    const t = this.tooltip
    const lifeCyclePhases = (n.asset.footprint?.coveredLifeCyclePhases || new LifeCyclePhases());
    const lifeCycleColor = `rgb(${lifeCyclePhases.color.join(',')})`
    // tcf vs pcf chart
    const tco2eq = n.targetLinks!.filter(l => l.type === 'transport').map(l => l.value).reduce((a, b) => a + b, 0)
    const pco2eq = n.targetLinks!.filter(l => l.type === 'product').map(l => l.value).reduce((a, b) => a + b, 0)
    const sum = tco2eq + pco2eq
    const name = n.entity.displayName || n.entity.idShort;
    const descriptions = _.compact([n.entity.description, n.asset.description])
    const otherNames = _.compact([n.entity.displayName ? n.entity.idShort : undefined, n.asset.displayName, n.asset.idShort])
    this.render(
      <div
        class="bg-base-100/50 backdrop-blur-sm w-96 shadow-xl overflow-hidden m-1 rounded-lg border-4 outline outline-1 outline-gray-500"
        style={{ borderColor: lifeCycleColor }}
      >
        <div class="break-words">
          <div class="flex">
            <h2 class="text-lg mb-2 flex-grow p-2">{name}</h2>
            <div class="flex-shrink-0 max-w-24">
              <div
                class="pt-1.5 px-1.5 rounded-bl-lg pb-2 pl-2.5"
                style={{ background: lifeCycleColor }}
                innerHTML={lifeCyclePhases.toString(true, false) || 'none'} />
            </div>
          </div>
          <div class="p-2">
            {descriptions.map(d => <div class="flex"><ChatBubbleBottomCenterTextIcon class="w-6 h-6 mr-1 mb-1" /><div class="flex-grow">{d}</div></div>)}
            <span class="text-sm">Also: {otherNames.map(quote).join(", ")}</span>
          </div>
        </div>

        { sum > 0 ?
        <div class="relative text-sm">
          <div class="w-1/3 inline-block text-center">{grams(pco2eq, UNIT)} product</div>
          <div class="w-1/3 inline-block text-center">{grams(sum, UNIT)} total</div>
          <div class="w-1/3 inline-block text-center">{grams(tco2eq, UNIT)} transport</div>
          <div class="bg-gray-300 relative h-4">
            <div class="h-full bg-gray-500 inline-block absolute"
                 style={{ width: `${pco2eq / sum * 100}%` }}>&nbsp;</div>
          </div>
        </div> : ''
        }
      </div>)
    if (!this.hidePCF && !this.hideTCF && sum > 0) {
    }
    t.style('display', null)
  }

  /**
   * Show the tooltip with link data inside
   * @param l link data to show in the tooltip
   */
  showLink(l: Link) {
    const from = l.source.name
    const to = l.target.name
    const lifeCycleColor = `rgb(${(l.productLifeCyclePhases || new LifeCyclePhases()).color.join(',')})`;
    const sourcePercentage = (l.value / (l.source.value || 1)) * 100
    const targetPercentage = (l.value / (l.target.value || 1)) * 100
    const count = l.target.connection?.bulkCount || 1;
    this.render(
      <div
        class="bg-base-100/50 backdrop-blur-sm w-96 shadow-xl overflow-hidden m-1 rounded-lg border-4 outline outline-1 outline-gray-500"
        style={{ borderColor: lifeCycleColor }}
      >
        <div class="break-words">
          <div class="flex">
            <h2 class="text-lg mb-2 flex-grow p-2">
              {count !== 1
                ? <span>{from} &larr; {count} {to}</span>
                : <span>{from} &larr; {to}</span>
              }&nbsp;
              <span class="capitalize badge">{l.type}</span>
              <span class="capitalize"> </span>
            </h2>
            <div class="flex-shrink-0 max-w-24">
              <div
                class="pt-1.5 px-1.5 rounded-bl-lg pb-2 pl-2.5"
                style={{ background: lifeCycleColor }}
                innerHTML={(l.productLifeCyclePhases || new LifeCyclePhases).toString(true, false) || 'none'} />
            </div>
          </div>
          <div class="p-2">
            The {l.type} carbon footprint of {pluralize(count, to)} accounts
            with <strong>{grams(l.value, UNIT)}</strong> for:
          </div>
        </div>
        <div class="relative text-left">
          <div class="absolute top-0 left-0 bottom-0 bg-gray-400 z-10 overflow-hidden"
               style={{ width: `${sourcePercentage}%` }}><span
            class="text-white overflow-hidden px-2 text-nowrap">{sourcePercentage.toLocaleString()}% of {pluralize('all', from)}</span>
          </div>
          <span class="relative px-2">{sourcePercentage.toLocaleString()}% of {pluralize('all', from)}</span>
        </div>
        <div class="relative text-left">
          <div class="absolute top-0 left-0 bottom-0 bg-gray-500 z-10 overflow-hidden"
               style={{ width: `${targetPercentage}%` }}><span
            class="text-white overflow-hidden px-2 text-nowrap">{targetPercentage.toLocaleString()}% of {pluralize('all', to)}</span>
          </div>
          <span class="relative px-2">{targetPercentage.toLocaleString()}% of {pluralize('all', to)}</span>
        </div>
      </div>);
    this.tooltip.style('display', null)
  }
}
