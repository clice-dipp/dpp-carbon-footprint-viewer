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

import * as d3 from 'd3'

type Item = {
  value: number,
  color: string,
  label?: string | ((item: VisualizationItem) => string)
}

type Options = {
  svgWidth?: number;
  svgHeight?: number;
  connectorHeight?: number;
  labelHeight?: number;
  fontSize?: number;
  arcRadius?: number;
  opacityGradientStops?: [number | string, number][];
  labelWidths?: number[];
}

type VisualizationItem = Item & {
  x: number;
  width: number;
}

export default class StackedBarDiagram {
  readonly id: string;

  container: d3.Selection<HTMLElement, unknown, null, unknown>;

  svg: d3.Selection<SVGSVGElement, unknown, null, unknown>;

  constructor(container: HTMLElement) {
    this.id = (Date.now() * Math.random()).toString(10);
    this.container = d3.select(container);
    this.svg = this.container.append('svg');
  }

  public visualize(
    data: Item[],
    {
      svgWidth,
      svgHeight,
      connectorHeight,
      labelHeight,
      fontSize,
      arcRadius,
      opacityGradientStops,
      labelWidths,
    }: Options = {}
  ) {
    this.svg.node()!.innerHTML = '';

    const total = d3.sum(data.map(d => d.value));
    let currentX = 0;
    svgWidth = svgWidth !== undefined ? svgWidth : 100;
    svgHeight = svgHeight !== undefined ? svgHeight : 100;
    connectorHeight = connectorHeight !== undefined ? connectorHeight : (labelHeight ? labelHeight / 2 : svgHeight * 0.2);
    labelHeight = labelHeight !== undefined ? labelHeight : (svgHeight - connectorHeight) / 2;
    if (labelWidths && labelWidths.length !== data.length) {
      console.warn("Ignoring option labelWidths: labelWidths.length is different from data.length.")
    }
    const labelEnds = (labelWidths && labelWidths.length === data.length ? labelWidths : Array(data.length).fill(svgWidth / data.length)) as number[];
    for (let i = 1; i < labelEnds.length; i += 1) {
      labelEnds[i] += labelEnds[i-1];
    }
    fontSize = fontSize !== undefined ? fontSize : labelHeight / 2;
    const items: VisualizationItem[] = data.map((d) => {
      const x = currentX;
      const width = d.value / total * svgWidth;
      currentX += width;
      return { ...d, x, width, };
    })
    this.svg
      .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

    this.#draw(
      items,
      svgWidth,
      svgHeight,
      connectorHeight,
      labelHeight,
      labelEnds,
      fontSize,
      arcRadius || 0,
      opacityGradientStops || [["0%", 1], ["100%", 1]],
    );
  }

  #draw(
    items: VisualizationItem[],
    width: NonNullable<Options["svgWidth"]>,
    height: NonNullable<Options["svgHeight"]>,
    connectorHeight: NonNullable<Options["connectorHeight"]>,
    labelHeight: NonNullable<Options["labelHeight"]>,
    labelEnds: number[],
    fontSize: NonNullable<Options["fontSize"]>,
    arcRadius: NonNullable<Options["arcRadius"]>,
    opacityGradientStops: NonNullable<Options["opacityGradientStops"]>
  ) {
    const labelWidth = width / items.length;
    const createPath = StackedBarDiagram.#drawItemPathMethod(
      height - labelHeight,
      connectorHeight,
      height,
      labelWidth,
      labelEnds,
      height - connectorHeight - labelHeight,
      arcRadius
    );
    this.svg.append("g")
      .selectAll("path")
      .data(items)
      .join('path')
      .attr('fill', (_, i) => `url(#gradient-${this.id}-${i})`)
      .attr('d', createPath)
    const gradient = this.svg.append("defs")
      .selectAll("linearGradient")
      .data(items)
      .join("linearGradient")
      .attr("id", (_, i) => `gradient-${this.id}-${i}`)
      .attr("x1", "50%")
      .attr("y1", "0%")
      .attr("x2", "50%")
      .attr("y2", "100%");
    for (const [offset, opacity] of opacityGradientStops) {
      gradient.append("stop")
        .attr("class", "start")
        .attr("offset", offset)
        .attr("stop-color", (d) => d.color)
        .attr("stop-opacity", opacity);
    }
    /*this.svg.append("rect")
      .attr("x", "0")
      .attr("y", "0")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#co2info-gradient)");*/
    this.svg.append("g")
      .selectAll("text")
      .data(items)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("x", (_, i) => (labelEnds[i] + (labelEnds[i-1] || 0)) / 2)
      .attr("y", height - ((labelHeight - fontSize) / 2))
      .text((d) => {
        if (d.label === undefined) {
          return d.value;
        }
        if (typeof d.label === "string") {
          return d.label;
        }
        return d.label(d);
      })
      .attr("font-size", 2);
  }

  static #drawItemPathMethod(
    connectorBottom: number,
    connectorHeight: number,
    labelBottom: number,
    labelWidth: number,
    labelEnds: number[],
    diagramBottom: number,
    arcRadius?: number,
  ) {
    return (d: VisualizationItem, i: number) => {
      const p = d3.path();
      const connectorRight = d.x + d.width;
      const connectorLeft = d.x;
      const labelLeft = labelEnds[i-1] || 0;
      const labelRight = labelEnds[i];
      const reverseArcRight = -1 * Number(connectorRight < labelRight);
      const reverseArcLeft = -1 * Number(connectorLeft < labelLeft);
      p.moveTo(connectorLeft, 0);
      p.lineTo(connectorRight, 0);
      if (arcRadius === undefined || Math.abs(connectorRight - labelRight) / 2 < arcRadius) {
        const bezierRightControlPointDistance = Math.min(connectorHeight, Math.abs(connectorRight - labelRight));
        p.lineTo(connectorRight, diagramBottom);
        p.bezierCurveTo(
          connectorRight, diagramBottom + bezierRightControlPointDistance,
          labelRight, connectorBottom - bezierRightControlPointDistance,
          labelRight, connectorBottom
        );
      } else {
        p.arc(
          connectorRight - arcRadius * (reverseArcRight || 1), diagramBottom + (connectorHeight / 2) - arcRadius,
          arcRadius,
          Math.PI * reverseArcRight,
          Math.PI * 0.5,
          reverseArcRight === -1
        );
        p.arc(
          labelRight + arcRadius * (reverseArcRight || 1), diagramBottom + (connectorHeight / 2) + arcRadius,
          arcRadius,
          Math.PI * 1.5,
          Math.PI * (1 - reverseArcRight),
          reverseArcRight !== -1
        );
      }
      p.lineTo(labelRight, labelBottom);

      p.lineTo(labelLeft, labelBottom);
      p.lineTo(labelLeft, connectorBottom)
      if (arcRadius === undefined || Math.abs(connectorLeft - labelLeft) / 2 < arcRadius) {
        const bezierLeftControlPointDistance = Math.min(connectorHeight, Math.abs(connectorLeft - labelLeft));
        p.bezierCurveTo(
          labelLeft, connectorBottom - bezierLeftControlPointDistance,
          connectorLeft, diagramBottom + bezierLeftControlPointDistance,
          connectorLeft, diagramBottom
        );
      } else {
        p.arc(
          labelLeft + arcRadius * (reverseArcLeft || 1), diagramBottom + (connectorHeight / 2) + arcRadius,
          arcRadius,
          Math.PI * (1 + reverseArcLeft),
          Math.PI * 1.5,
          reverseArcLeft === -1
        );
        p.arc(
          connectorLeft - arcRadius * (reverseArcLeft || 1), diagramBottom + (connectorHeight / 2) - arcRadius,
          arcRadius,
          Math.PI * .5,
          Math.PI * (2 + reverseArcLeft),
          reverseArcLeft !== -1
        );
      }
      p.closePath();
      return p.toString();
    }
  }
}
