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

/* eslint-disable no-underscore-dangle */
import { sankey as sankeyDiagram, sankeyCenter, sankeyLinkHorizontal, type SankeyLinkMinimal } from 'd3-sankey'
import * as d3 from 'd3'
import { type Selection as D3Selection } from 'd3-selection'
import { type LifeCyclePhase, LifeCyclePhases, lifeCyclePhaseSequence } from '@/lib/lifeCycleUtil'
import { grams, one, oneOrUndefined } from '@/lib/util'
import CarbonSankeyTooltip from '@/lib/visualization/CarbonSankeyTooltip'
import {
  type AssetNode,
  CircularDependencyError,
  hasLinkData, isLinkData,
  type Link,
  type LinkData,
  type Node,
  type NodeData,
  UNIT
} from './CarbonSankeyData'
import type CarbonTree from '@/lib/model/CarbonTree'

type Colors = {
  defaultNode: d3.Color,
  nodeLabelPrimary: d3.Color,
  nodeLabelSecondary: d3.Color,
  productLink: d3.Color,
  transportLink: d3.Color,
}

export default class CarbonSankey {
  /**
   * Root node to start the visualization from
   * @private
   */
  private readonly root: AssetNode

  /**
   * All assets being converted to nodes
   * @private
   */
  private readonly assetNodes: { [globalAssetId: string]: AssetNode }

  /**
   * All nodes representing assets
   * @private
   */
  private readonly nodes: { [globalAssetId: string]: NodeData }

  private nodesG?: D3Selection<SVGGElement, any, any, any>
  private linksG?: D3Selection<SVGGElement, any, any, any>
  private nodeContentsG?: D3Selection<SVGGElement, any, any, any>;
  private nodeTitlesG?: D3Selection<SVGGElement, any, any, any>
  private linkTitlesG?: D3Selection<SVGGElement, any, any, any>
  private clipPathsG?: D3Selection<SVGGElement, any, any, any>

  /**
   * Links between two nodes
   * @private
   */
  private links: LinkData<'product' | 'transport'>[]

  /**
   * SVG element this visualization is created inside
   * @private
   */
  private svg: D3Selection<SVGSVGElement, unknown, null, undefined>

  private yScale = 1;

  /**
   * Tooltip being mounted on this visualization
   * @private
   */
  private tooltip: CarbonSankeyTooltip

  /**
   * Whether to hide the product carbon footprints in the visualization
   * @private
   */
  private hidePCF_ = false

  /**
   * Whether to hide the transport carbon footprints in the visualization
   * @private
   */
  private hideTCF_ = false

  /**
   * Which path item the path must contain (only if none are hidden)
   * @private
   */
  private pathMustInclude_ = ''

  /**
   * Paths which should be hidden in the visualization (only possible if pathMustInclude is empty)
   * @private
   */
  private hiddenPaths_ = {} as { [path: string]: boolean | null }

  /**
   * Whether to show nodes have no life cycle phase(s) set
   * @private
   */
  private showUndefinedLifeCyclePhase_ = true

  /**
   * Life cycle phases which are enabled right now (true) or not (false)
   * @private
   */
  private visibleLifeCyclePhases_ = Object.fromEntries(lifeCyclePhaseSequence.map(e => [e, null])) as Record<LifeCyclePhase, boolean | null>

  /**
   * Arguments which were supplied to the last visualize call (saved for revisualize method)
   * @private
   */
  private lastVisualizeArgs: Parameters<typeof this.visualize> | undefined

  /**
   * Callback to execute when the visualization was created or updated
   */
    // eslint-disable-next-line class-methods-use-this
  public onVisualizeDone = () => {
  }

  public colors: Colors = {
    defaultNode: d3.rgb(200, 200, 200),
    nodeLabelPrimary: d3.rgb(50, 50, 50),
    nodeLabelSecondary: d3.rgb(100, 100, 100),
    productLink: d3.rgb(230, 230, 230),
    transportLink: d3.rgb(170, 170, 170)
  };

  /**
   * Create a visualization of carbon footprints based on asset administration shells
   * @param container element to which to append the tooltip and svg. Should not have any padding and the position
   *   will be changed to relative. (Just an empty div should be fine.)
   * @param tree Carbon footprints to visualize in this visualization
   */
  public constructor(
    container: HTMLElement,
    tree: CarbonTree,
    colors?: Partial<Colors>,
  ) {
    Object.assign(this.colors, colors || {});
    const c = d3.select(container).style('position', 'relative')
    this.tooltip = new CarbonSankeyTooltip(c.append('div'))
    this.svg = c.append('svg').style('width', '100%')
    const controls = c.append('div')
      .style('position', 'absolute')
      .style('top', '0')
      .style('right', '0')
    CarbonSankey.#appendButton(controls, '+').on('click', () => {
      this.zoom(-100);
    })
    CarbonSankey.#appendButton(controls, '-').on('click', () => {
      this.zoom(100);
    })
    CarbonSankey.#appendButton(controls, '\u26f6').on('click', () => {
      this.yScale = 1;
      this.revisualize();
    })
    this.root = {
      id: tree.asset.id,
      children: []
    }
    this.nodes = {}
    this.links = []
    this.createNodes(tree)
    this.createLinks(tree)
  }

  /**
   * Whether the product carbon footprint is currently hidden
   */
  get hidePCF() {
    return this.hidePCF_
  }

  /**
   * Set whether the product carbon footprint should be hidden
   */
  set hidePCF(value: boolean) {
    this.hidePCF_ = value
    this.tooltip.hidePCF = value
    this.revisualize()
  }

  /**
   * Whether the transport carbon footprint is currently hidden
   */
  get hideTCF() {
    return this.hideTCF_
  }

  /**
   * Set whether the transport carbon footprint should be hidden
   */
  set hideTCF(value: boolean) {
    this.hideTCF_ = value
    this.tooltip.hideTCF = value
    this.revisualize()
  }

  /**
   * Which item the path must include for a link to be visualized
   */
  get pathMustInclude() {
    return this.pathMustInclude_
  }

  /**
   * Set which item a path must include to be visualized.
   * Resets other path filters
   * @param value item a path must include to be visualized
   */
  set pathMustInclude(value: string) {
    if (value !== '') {
      this.resetPathFilters(null)
    }
    this.pathMustInclude_ = value
    this.hiddenPaths_[value] = false
    this.revisualize()
  }

  /**
   * Show nodes not containing life cycle phases
   * Ignored if a sub-node should still be visualized
   */
  get showUndefinedLifeCyclePhase() {
    return this.showUndefinedLifeCyclePhase_
  }

  /**
   * Whether to show nodes not containing life cycle phases
   * Ignored if a sub-node should still be visualized
   */
  set showUndefinedLifeCyclePhase(value: boolean) {
    this.showUndefinedLifeCyclePhase_ = value
    this.revisualize()
  }

  /**
   * Which life cycle phases should (true; or not: false) be visualized
   * Ignored if a sub-node should still be visualized
   */
  get visibleLifeCyclePhases() {
    return new Proxy(this.visibleLifeCyclePhases_, {
      set: (obj, key: LifeCyclePhase, newValue: boolean) => {
        if (obj[key] === undefined) return false
        obj[key] = newValue
        this.revisualize()
        return true
      }
    })
  }

  /**
   * Get which paths should be hidden
   */
  get hiddenPaths() {
    return new Proxy(this.hiddenPaths_, {
      set: (obj, key: string, value: boolean) => {
        if (this.pathMustInclude_) {
          this.resetPathFilters(false, obj)
        }
        obj[key] = value
        this.revisualize()
        return true
      }
    })
  }

  /**
   * Reset the path filters
   * @param hiddenPathsValue Which value the hiddenPath filters should be
   * @param obj Object to reset
   * @private
   */
  private resetPathFilters(hiddenPathsValue: boolean | null = false, obj = this.hiddenPaths_) {
    this.pathMustInclude_ = ''
    for (const key of Object.keys(obj)) {
      obj[key] = hiddenPathsValue
    }
  }

  /**
   * Rerender the visualization
   * @private
   */
  private revisualize() {
    if (!this.lastVisualizeArgs) {
      throw new Error('No last visualize parameters set')
    }
    this.visualize(...this.lastVisualizeArgs)
  }

  /**
   * Create the visualization
   * @param svgWidth width of the visualizations svg
   * @param svgHeight height of the visualizations svg
   * @param padding padding of the nodes
   */
  public visualize(svgWidth: number, svgHeight: number, padding: number) {
    this.lastVisualizeArgs = [svgWidth, svgHeight, padding]
    this.svg.node()!.innerHTML = ''

    // sankey diagram setup
    const sankey = sankeyDiagram<Node, Link>()
      .nodeId(d => d.asset.id)
      .nodeAlign(sankeyCenter)
      .nodeWidth(30)
      .nodePadding(padding)
      .nodeSort(CarbonSankey.sortByLifeCycleAndName)
      .linkSort(CarbonSankey.sortByLifeCycleAndName)
      .extent([[0, 10], [svgWidth, svgHeight - 10]]) // +- 10 for letters otherwise being cut

    // transform nodes and links
    const { nodes, links } = sankey({
      nodes: Object.values(this.nodes),
      links: this.links
    })


    this.svg
      .attr('viewBox', [0, 0, svgWidth, svgHeight])
      .style('width', '100%')
      .style('height', `${svgHeight}px`)

    const centerX = (obj: { x0?: number, x1?: number }) => (obj.x0! + obj.x1!) / 2
    const centerY = (obj: { y0?: number, y1?: number }) => (obj.y0! + obj.y1!) / 2
    const x = (obj: { x0?: number }) => obj.x0! + 1
    const y = (obj: { y0?: number }) => obj.y0!
    const width = (obj: { x0?: number, x1?: number }) => obj.x1! - obj.x0! - 2
    const height = (obj: { y0?: number, y1?: number }) => obj.y1! - obj.y0!
    const rotate90 = (obj: {
      x0?: number,
      y0?: number,
      x1?: number,
      y1?: number
    }) => `rotate(90, ${centerX(obj)}, ${centerY(obj)})`

    // Nodes which should be visualzied
    const filteredNodes = nodes.filter((n) => {
      return (n.targetLinks || []).length > 0 || (n.sourceLinks || []).length > 0
    })

    // actual nodes
    this.nodesG = this.svg.append('g');
    this.nodesG.selectAll('rect')
      .data(filteredNodes)
      .join('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height)
      .attr('fill',
        (n) => {
          if (!n.asset.footprint) {
            return this.colors.defaultNode.toString();
          }
          const lcColor = LifeCyclePhases.merged(...n.asset.footprint.product.map(f => f.lifeCyclePhase)).color;
          return (lcColor ? d3.rgb(...lcColor) : this.colors.defaultNode).toString();
        })
      .on('mousemove', (e) => this.tooltip.move(e, this.svg.node()!.getBoundingClientRect()))
      .on('mouseenter', (_, n) => this.tooltip.showNode(n))
      .on('mouseleave', () => this.tooltip.hide())

    // clip paths for overflowing node titles
    this.clipPathsG = this.svg.append('g');
    this.clipPathsG.selectAll('rect')
      .data(filteredNodes)
      .join('clipPath')
      .attr('id', n => `nodeClip${n.index}`)
      .append('rect')
      // .attr('transform', rotate90)
      .attr('x', (n) => (-width(n)/2))
      .attr('y', (n) => (-height(n)/2))
      .attr('width', width)
      .attr('height', height)

    // node content texts (inside a node, rotated)
    this.nodeContentsG = this.svg.append('g')
    const nodeContent = this.nodeContentsG
      .style('font', '11px sans-serif')
      .selectAll('g')
      .data(filteredNodes)
      .join('g')
      .attr('pointer-events', 'none')
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      // .attr('x', centerX)
      // .attr('y', centerY)
      .attr('clip-path', n => `url(#nodeClip${n.index})`)
      .attr('transform', (obj) => `translate(${centerX(obj)} ${centerY(obj)})`)
      .append('text')
      .attr('transform', "rotate(90)")
      .text(n => (n.asset.footprint ? LifeCyclePhases.merged(...n.asset.footprint.product.map(p => p.lifeCyclePhase)) : '').toString())

    // left-align (instead of center) texts which are overflowing
    /*
    nodeContent
      .filter((n, i, textNodes) => {
        // is overflowing?
        return ((textNodes[i] as SVGTextElement).getComputedTextLength() > n.y1! - n.y0!)
      })
      .attr('x', (n, i, textNodes) => {
        // move center point to the right instead of actually left aligning
        const center = (n.y0! + n.y1!) / 2
        const boxWidth = n.y1! - n.y0!
        const offsetWidth = ((textNodes[i] as SVGTextElement).getComputedTextLength() - boxWidth) / 2
        return (n.x0! + n.x1!) / 2 + offsetWidth
      })
     */

    // links between nodes
    this.linksG = this.svg.append('g');
    const link = this.linksG.attr('fill', 'none')
      .selectAll('g')
      .data(links.sort((a, b) => b.width! - a.width!))
      .join('g')
      .attr('stroke', d => d.color.toString())
      .on('mousemove', (e) => this.tooltip.move(e, this.svg.node()!.getBoundingClientRect()))
      .on('mouseenter', (_, l) => this.tooltip.showLink(l))
      .on('mouseleave', () => this.tooltip.hide())
    link.append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke-width', d => Math.max(1, d.width!))

    // node titles (next to a node, not rotated)
    this.nodeTitlesG = this.svg.append('g');
    const nodeTitle = this.nodeTitlesG
      .style('font', 'sans-serif')
      .style('cursor', 'default')
      .selectAll('text')
      .data(filteredNodes)
      .join('text')
      .attr('fill', this.colors.nodeLabelPrimary.toString())
      .attr('x', l => l.x0! < svgWidth / 2 ? l.x1! + 6 : l.x0! - 6)
      .attr('y', centerY)
      .attr('dy', '0.35em')
      .style('pointer-events', 'none')
      .attr('text-anchor', l => l.x0! < svgWidth / 2 ? 'start' : 'end')
      .text(l => l.name)
    nodeTitle
      .append('tspan')
      .attr('fill', this.colors.nodeLabelSecondary.toString())
      .text(l => `\nTotal CO2eq: ${grams(l.value, "kg")}`)

    this.enableZoom();
    this.enablePanning();
    this.onVisualizeDone();
    return this.svg.node();
  }


  /**
   * Filter method for filtering links which should not be visualized
   * @param l links to filter
   * @private
   */
  private linkFilter(l: LinkData<'transport' | 'product'> & SankeyLinkMinimal<NodeData, LinkData<'transport' | 'product'>>) {
    // or a phase which should not be included
    if ((!l.productLifeCyclePhases.length && !this.showUndefinedLifeCyclePhase_) ||
      (l.productLifeCyclePhases.length && l.productLifeCyclePhases.phases.some(x => !this.visibleLifeCyclePhases_[x]))) {
      return false
    }
    // or the type is of the correct type
    return (!this.hidePCF_ || l.type !== 'product') && (!this.hideTCF_ || l.type !== 'transport')
  }

  /**
   * Sort nodes or links first by their phase(s) and then name.
   * @param a One node/link to compare
   * @param b Other node/link to compare
   * @private
   */
  private static sortByLifeCycleAndName(a: NodeData | LinkData<any>, b: NodeData | LinkData<any>) {
    if (!isLinkData(a) && !isLinkData(b) && a.parent && b.parent && a.parent !== b.parent) {
      return 1;
    }

    const assetA = (hasLinkData(a) ? a.target : a).asset
    const assetB = (hasLinkData(b) ? b.target : b).asset
    return LifeCyclePhases.merged(...assetA.footprint!.product.map((l) => l.lifeCyclePhase))
        .compareTo(LifeCyclePhases.merged(...assetB.footprint!.product.map((l) => l.lifeCyclePhase)))
      || (assetA.displayName || assetA.idShort).localeCompare(assetB.displayName || assetB.idShort)
  }

  /**
   * Get the svg contents as data string
   * @param svgEl element of the svg to get a string from
   * @private
   */
  private getSVGDataString(svgEl: SVGElement | undefined) {
    svgEl = svgEl || this.svg.node()!
    if (!svgEl) {
      throw new Error('No SVG element available')
    }
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    return `data:image/svg+xml;base64,${btoa(svgStr)}`
  }

  /**
   * Download the visualization as png
   * @param filename under which filename the file should be downloaded (without .png-extension)
   */
  downloadAsPNG(filename: string) {
    const svg = this.svg.node()!
    const svgString = this.getSVGDataString(svg)
    const svgW = svg.clientWidth
    const svgH = svg.clientHeight
    const img = new Image()
    const canvasEl = document.createElement('canvas')
    canvasEl.width = svgW * 2
    canvasEl.height = svgH * 2
    img.src = svgString
    img.onload = () => {
      canvasEl.getContext('2d')!.drawImage(img,
        0, 0, svgW * 2, svgH * 2
      )
      const content = canvasEl.toDataURL('image/png')
      const anchor = document.createElement('a')
      anchor.download = `${filename}.png`
      anchor.href = content
      anchor.click()
    }
  }

  /**
   * Download the visualization as svg
   * @param filename under which filename the file should be downloaded (without .svg-extension)
   */
  downloadAsSVG(filename: string) {
    const svgString = this.getSVGDataString(this.svg.node()!)
    const anchor = document.createElement('a')
    anchor.download = `${filename}.svg`
    anchor.href = svgString
    anchor.click()
  }

  /**
   * Create the visualization nodes from the footprints and descriptions
   * @param assetFootprints footprints to create the nodes from
   * @private
   */
  private createNodes(
    tree: CarbonTree,
  ) {
    this.nodes[tree.asset.id] = tree;
    Object.values(tree.connections).forEach(n => this.createNodes(n));
  }

  /**
   * Preprocess the visualization data
   * @param tree footprints to create the nodes from
   * @param currentNode current node being processed (start with root)
   * @param parentIds ids of the parent (for circular dependency detection)
   * @private
   */
  private createLinks(
    tree: CarbonTree,
  ) {
    const checkedIds = new Set<string>();
    const workingTree = [tree];

    while (workingTree.length) {
      const current = workingTree.shift()!;
      workingTree.push(...Object.values(current.connections));
      if (checkedIds.has(current.asset.id)) {
        throw new CircularDependencyError(`Circular dependency error for node ${current.asset.id}`);
      }

      const { footprint } = current.asset;
      if (current.parent && footprint) {
        this.links.push({
          source: this.nodes[current.parent.asset.id],
          target: this.nodes[current.asset.id],
          value: current.productCo2eq,
          footprint: undefined,
          type: 'product',
          color: this.colors.productLink,
          productLifeCyclePhases: current.coveredLifeCyclePhases
        })
        this.links.push({
          source: this.nodes[current.parent.asset.id],
          target: this.nodes[current.asset.id],
          value: current.transportCo2eq,
          footprint: undefined,
          type: 'transport',
          color: this.colors.transportLink,
          productLifeCyclePhases: current.coveredLifeCyclePhases
        })
      }
    }
  }

  zoom(e: WheelEvent | number) {
    if (e instanceof WheelEvent) {
      e.preventDefault();
    }
    const deltaY = e instanceof WheelEvent ? e.deltaY : e;
    const svgHeight = this.lastVisualizeArgs?.[1] || 100;
    const oldYScale = this.yScale;
    this.yScale = Math.max(1, oldYScale * (1-deltaY / svgHeight));
    const { yScale } = this;
    function adjustForScale (attr: string, defaultValue: number = 1, parser: (input: string) => number = parseFloat) {
      return function adjustAttributeForScale(this: unknown) {
        const el = this as Element;
        const elValue = el.attributes.getNamedItem(attr)?.value;
        const value = elValue ? parser(elValue) : defaultValue;
        return value * yScale / oldYScale;
      }
    }
    const newScale = `scale(1, ${yScale})`;
    this.nodesG?.attr("transform", newScale)
    this.linksG?.attr("transform", newScale)
    this.nodeTitlesG?.selectChildren().attr("y", adjustForScale("y"));
    this.clipPathsG
      ?.selectAll("rect")
      ?.attr("y", adjustForScale("y"))
      ?.attr("height", adjustForScale("height"))

    this.nodeContentsG?.selectChildren("g").attr("transform", function updateTranslate() {
      return ((this as Element).attributes.getNamedItem("transform")?.value || "")
        .replace(
          /translate\(([^ )]+) ?([^)]*)\)/gim,
          (_: string, p1: string, p2: string) => `translate(${p1} ${parseFloat(p2) * yScale / oldYScale})`
        );
    });

    // Pan to center of scrolling position

    const svg = this.svg.node();
    if (!svg) { return; }
    const viewBox = svg.viewBox.baseVal;
    const layerY = e instanceof WheelEvent ? e.layerY : 0;
    const topPercentage = layerY / svgHeight;
    viewBox.y += Math.max(0, Math.min(svg.viewBox.baseVal.height * (this.yScale - 1), (yScale - oldYScale) * (svgHeight) * topPercentage))
  }

  enableZoom() {
    this.svg.node()?.addEventListener("wheel", (e) => this.zoom(e));
  }

  enablePanning() {
    const svg = this.svg.node();
    if (!svg) { return; }
    const viewBox = svg.viewBox.baseVal;
    let isPanning = false;
    let startY: number;
    svg.style.cursor = 'grab';

    svg.addEventListener("mousedown", (event) => {
      isPanning = true;
      startY = event.clientY;  // Record the initial Y position
      svg.style.cursor = 'grabbing';
    });

    svg.addEventListener("mousemove", (event) => {
      if (!isPanning) return;

      const deltaY = event.clientY - startY;  // Calculate the difference
      startY = event.clientY;  // Update the starting Y position
      const maxY = svg.viewBox.baseVal.height * (this.yScale - 1);

      viewBox.y = Math.max(0, Math.min(viewBox.y-deltaY, maxY));
    });

    svg.addEventListener("mouseup", () => {
      isPanning = false;
      svg.style.cursor = 'grab';
    });

    svg.addEventListener("mouseleave", () => {
      isPanning = false;
      svg.style.cursor = 'grab';
    });
  }

  destroy() {

  }

  static #appendButton(parent: D3Selection<HTMLDivElement, unknown, null, undefined>, text: string) {
    return parent.append('button')
      .style('border', '1px solid #CCC')
      .style('margin-right', '-1px')
      .style('min-width', '2rem')
      .style('min-height', '2rem')
      .text(text);
  }
}
