import { Circle } from '@svgdotjs/svg.js'
import { SVG, Svg, Element } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.panzoom.js'

import { getColorShade } from './utils'

interface RegionData {
  id: string
  name: string
  value: number
  color?: string
}

interface MapOption {
  backgroundColor: string
  container: string | HTMLElement
  data: { [regionId: string]: number }
  dataType: 'heatmap' | 'bubbles'
  dataColors: string[]
  dataLabels: boolean
  mapUrl?: string
  nameAttribute: string
  regionColor: string
  regionColorHover: string
  showLegend?: boolean
  title?: string
}

type EventHandler = (event: CustomEvent) => void

const CSS_PREFIX = 'wm-'
const MIN_BUBBLE_DIAMETER = 10

const DEFAULT_OPTION: MapOption = {
  backgroundColor: '#20b2aa',
  container: 'body',
  data: {},
  dataType: 'heatmap',
  dataColors: [ '#E06C9F', '#F5E960' ],
  dataLabels: false,
  nameAttribute: 'name',
  regionColor: '#fafafa',
  regionColorHover: '#dadada',
  showLegend: true
}

export default class SvgMap {
  draw!: Svg
  eventHandlers: { [event: string]: EventHandler } = {}
  legendElement!: HTMLElement
  options: MapOption
  rootElement!: HTMLElement
  title!: HTMLElement

  constructor (options: Partial<MapOption>  ) {
    this.options = { ...DEFAULT_OPTION, ...options }

    this.createRootElement()
    this.renderMetadata()

    if (options.mapUrl) {
      this.loadMapFromUrl(options.mapUrl)
    }
  }

  createRootElement () {
    this.rootElement = document.createElement('div')
    this.rootElement.className = `${CSS_PREFIX}root`

    if (typeof this.options.container === 'string') {
      document.querySelector(this.options.container)!.append(this.rootElement)
    } else {
      this.options.container.append(this.rootElement)
    }
  }

  renderMetadata () {
    this.title = document.createElement('div')
    this.title.className = `${CSS_PREFIX}title`
    if (this.options.title) {
      this.title.innerText = this.options.title
    }
    this.rootElement.append(this.title)
  }

  colorMap () {
    const allRegions = this.draw.find('path')

    const max = Math.max(...Object.values(this.options.data))
    const min = Math.min(...Object.values(this.options.data))

    // Be sure that the biggest bubble fits the smallest region, with a sensible minimum
    const regionsSizes = allRegions.map(el => Math.min(el.bbox().width, el.bbox().height))
    const smallestRegion = Math.max(5, Math.min(...regionsSizes))

    /** Offset to avoid 0 as relative value, useful for bubbles to avoid null radius bubbles */
    const relativeValueOffset = this.options.dataType === 'bubbles'
      ? (max - min) * MIN_BUBBLE_DIAMETER / smallestRegion
      : 0

    const legend = []

    for (const region of allRegions) {
      // Base styling
      region.addClass(`${CSS_PREFIX}region`)
      region.node.removeAttribute('style')
      region.fill(this.options.regionColor)

      const regionValue = this.options.data[region.id()]
      const hasValue = regionValue > 0

      const data: RegionData = {
        id: region.id(),
        name: region.attr(this.options.nameAttribute),
        value: hasValue ? regionValue : 0
      }

      if (hasValue) {
        /**
         * A float between 0.0 and 1.0 indicating the relative value of
         * a region among the entire dataset
         */
        const relativeValue = (regionValue - min + relativeValueOffset) / (max - min)

        if (this.options.dataType === 'bubbles') {
          this.renderBubble(region, relativeValue * smallestRegion)
            .on('mouseover', () => {
              this.emitEvent('region:over', { region, data })
            })
            .on('mouseout', () => {
              this.emitEvent('region:out', { region, data })
            })
        } else {
          data.color = getColorShade(this.options.dataColors[0], this.options.dataColors[1], relativeValue)
          region.animate().attr({ fill: data.color })
        }

        if (this.options.dataLabels) {
          this.draw.text(regionValue.toString())
            .center(region.cx(), region.cy())
        }

        legend.push(data)
      }

      region.on('click', () => {
        this.emitEvent('region:click', { region, data })
      })

      region.on('mouseover', () => {
        if (!hasValue || this.options.dataType === 'bubbles') {
          region.fill(this.options.regionColorHover)
        }

        this.emitEvent('region:over', { region, data })
      })

      region.on('mouseout', () => {
        if (!hasValue || this.options.dataType === 'bubbles') {
          region.fill(this.options.regionColor)
        }

        this.emitEvent('region:out', { region, data })
      })
    }

    this.renderLegend(legend)
  }

  renderBubble (element: Element, diameter: number, color?: string): Circle {
    const bbox = element.bbox()

    const circle = this.draw.circle(1)
      .center(bbox.cx, bbox.cy)
      .fill(color || this.options.dataColors[0])
      .stroke({ width: 0 })
      .opacity(.75)
      .addClass(`${CSS_PREFIX}data-bubble`)

    circle
      .animate()
      .attr({ r: diameter / 2 })

    return circle
  }

  renderLegend (legend: RegionData[]) {
    this.legendElement = document.createElement('div')
    this.legendElement.className = `${CSS_PREFIX}legend`

    this.showLegend(this.options.showLegend && !!legend.length)

    for (const entry of legend.sort((a, b) => b.value - a.value)) {
      const root = document.createElement('div')
      root.className = `${CSS_PREFIX}legend-entry`
      root.innerText = entry.name

      if (entry.color) {
        const color = document.createElement('div')
        color.className = `${CSS_PREFIX}legend-entry__color`
        color.style.backgroundColor = entry.color
        root.prepend(color)
      }

      root.addEventListener('click', () => {
        this.fitRegion(entry.id)
      })

      this.legendElement.append(root)
    }

    this.rootElement.append(this.legendElement)
  }

  fitRegion (id: string, _options: any = {}) {
    const options = { ..._options, ...{ marginX: 10, marginY: 5 } }
    const region = this.draw.findOne(`#${id}`) as Element

    if (!region) {
      console.warn(`Region with ID ${id} not found`)
      return
    }

    const newViewbox = region.bbox()
    newViewbox.width += options.marginX * 2
    newViewbox.height += options.marginY * 2
    newViewbox.x -= options.marginX
    newViewbox.y -= options.marginY

    this.draw
      .animate()
      // @ts-ignore
      .viewbox(newViewbox)
  }

  loadMapFromUrl (url: string) {
    fetch(url)
      .then(response => response.text())
      .then((image) => {
        let startOfSvg = image.indexOf('<svg')
        startOfSvg = startOfSvg >= 0 ? startOfSvg : 0

        this.draw = (SVG(image.slice(startOfSvg)) as Svg)
          .addTo(this.rootElement)
          .size('100%', '100%')
          .panZoom({
            zoomFactor: .35
          })

        // @ts-ignore
        this.draw.css({
          'background-color': this.options.backgroundColor
        })

        this.colorMap()
      })
  }

  setTitle (title: string) {
    this.options.title = title
    this.title.innerText = this.options.title
  }

  setBackgroundColor (color: string) {
    this.options.backgroundColor = color
    // @ts-ignore
    this.draw.css({
      'background-color': this.options.backgroundColor
    })
  }

  setRegionColor (color: string) {
    this.options.regionColor = color

    for (const region of this.draw.find('path')) {
      region.fill(this.options.regionColor)
    }
  }

  showLegend (show = true) {
    this.legendElement.style.display = show ? 'block' : 'none'
  }

  private emitEvent (event: string, detail: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event](new CustomEvent(event, { detail }))
    }
  }

  on (event: string, handler: EventHandler) {
    this.eventHandlers[event] = handler
  }
}
