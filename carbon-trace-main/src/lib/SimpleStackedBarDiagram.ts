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
  barWidth?: number;
  totalLabel?: string;
}

type VisualizationItem = Item & {
  y: number;
  height: number;
}

export default class SimpleStackedBarDiagram {
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
      fontSize,
      arcRadius,
      barWidth,
      totalLabel
    }: Options = {}
  ) {
    this.svg.node()!.innerHTML = '';
    svgWidth = svgWidth || 100;
    svgHeight = svgHeight || 100;
    const total = d3.sum(data.map(d => d.value));
    let currentY = 0;
    const items: VisualizationItem[] = data.map((d) => {
      const y = currentY;
      const height = d.value / total * svgHeight;
      currentY += height;
      return { ...d, y, height, };
    })
    this.svg
      .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

    this.#draw(
      items,
      svgWidth,
      svgHeight,
      barWidth || svgWidth / 10,
      fontSize || svgHeight / 100,
      arcRadius || 0,
      totalLabel || total.toString(10),
    );
  }

  #draw(
    items: VisualizationItem[],
    width: NonNullable<Options["svgWidth"]>,
    height: NonNullable<Options["svgHeight"]>,
    barWidth: NonNullable<Options["barWidth"]>,
    fontSize: NonNullable<Options["fontSize"]>,
    arcRadius: NonNullable<Options["arcRadius"]>,
    totalLabel: NonNullable<Options["totalLabel"]>
  ) {
    const braceMargin = 5;
    const braceX = (width + barWidth) / 2 + braceMargin;
    const braceWidth = 20;
    const strokeWidth = 1;
    const x = (width - barWidth) / 2;
    this.svg.append("defs")
      .append("clipPath")
      .attr("id", "rounded-rect")
      .append("rect")
      .attr("x", x)
      .attr("y", 0)
      .attr("width", barWidth)
      .attr("height", height)
      .attr("rx", arcRadius)
    this.svg.append("g")
      .selectAll("rect")
      .data(items)
      .join('rect')
      .attr("x", x)
      .attr("y", (d) => d.y)
      .attr("width", barWidth)
      .attr("height", (d) => d.height)
      .attr('fill', (d) => d.color)
      .attr("clip-path", "url(#rounded-rect)");
    this.svg.append("g")
      .selectAll("path")
      .data(items)
      .join('path')
      .attr('d', (d) => {
        if (height - d.y < braceWidth * 2) {
          return SimpleStackedBarDiagram.#roundedPointer(
            braceX,
            Math.min(d.y + d.height / 2, height - strokeWidth / 2),
            braceX + braceWidth,
            Math.min(d.y + d.height - fontSize / 2, d.y + d.height / 2)
          )
        }
        if (d.height < braceWidth * 2) {
          return SimpleStackedBarDiagram.#roundedPointer(
            braceX,
            Math.max(d.y, strokeWidth / 2),
            braceX + braceWidth,
            Math.max(fontSize / 2, d.y + d.height / 2)
          )
        }
        return SimpleStackedBarDiagram.#curlyBracePath(
          braceX,
          d.y,
          d.y + d.height,
          braceWidth
        )}
      )
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", strokeWidth.toString(10))
      .attr("stroke-linecap", "round")
    this.svg.append("g")
      .selectAll("text")
      .data(items)
      .join("text")
      .attr("x", braceX + braceWidth + braceMargin)
      .attr("y", (d) => {
        if (height - d.y < braceWidth * 2) {
          return Math.min(height - fontSize / 2, d.y + d.height / 2);
        }
        if (d.height < braceWidth * 2) {
          return Math.max(fontSize / 2, d.y + d.height / 2);
        }
        return d.y + d.height / 2;
      })
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "middle")
      .attr("font-size", fontSize.toString(10))
      .text((d) => {
        if (d.label === undefined) {
          return d.value.toString(10);
        }
        if (typeof d.label === "string") {
          return d.label;
        }
        return d.label(d);
      })

    this.svg.append("path").attr("d", SimpleStackedBarDiagram.#curlyBracePath(
      braceX,
      0,
      height,
      20
    ))
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", "1")
      .attr("stroke-linecap", "round")
      .attr("transform", "scale(-1,1)")
      .attr("transform-origin", "50% 50%");
    this.svg.append("text")
      .attr("x", x - braceWidth - 2 * braceMargin)
      .attr("y", height / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", fontSize.toString(10))
      .text(totalLabel)
  }

  static #roundedPointer(x1: number, y1: number, x2: number, y2: number) {
    const p = d3.path();
    p.moveTo(x1, y1);
    p.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
    return p;
  }

  static #curlyBracePath(
    x: number,
    y1: number,
    y2: number,
    width: number,
  ) {
    const padding = 3;
    const r = width / 2;
    const p = d3.path();
    const yh = (y1 + y2) / 2;
    p.moveTo(x, y1 + padding);
    p.arc(x, y1 + r + padding, r, Math.PI * 1.5, Math.PI * 2);
    p.arc(x + 2 * r, yh - r, r, Math.PI, Math.PI * 0.5, true);
    p.arc(x + 2 * r, yh + r, r, Math.PI * 1.5, Math.PI, true);
    p.arc(x, y2 - r - padding, r, Math.PI * 2, Math.PI * 2.5);
    return p.toString();
  }
}
