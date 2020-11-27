export function toHex (value: number) {
  return (value <= 255 ? value : 255).toString(16).padStart(2, '0')
}

export function getColorShade (colorStart: string, colorEnd: string, ratio: number) {
  const colors = [
    colorStart.slice(-6),
    colorEnd.slice(-6)
  ]

  if (!isFinite(ratio) || ratio < 0 || ratio > 1) {
    console.warn('getColorShade() Invalid ratio value:', ratio, 'Ratio must be between 0 and 1')
    return '#' + colors[0]
  }

  for (const i in colors) {
    if (colors[i].length === 3) {
      // Convert 3 chars format to 6 chars, i.e. f00 -> ff0000
      colors[i] = colors[i].split('').map(char => char + char).join('')
    } else if (colors[i].length !== 6) {
      throw new Error('Invalid color ' + colors[i])
    }
  }

  const r = Math.ceil(parseInt(colors[0].substring(0, 2), 16) * ratio + parseInt(colors[1].substring(0, 2), 16) * (1 - ratio))
  const g = Math.ceil(parseInt(colors[0].substring(2, 4), 16) * ratio + parseInt(colors[1].substring(2, 4), 16) * (1 - ratio))
  const b = Math.ceil(parseInt(colors[0].substring(4, 6), 16) * ratio + parseInt(colors[1].substring(4, 6), 16) * (1 - ratio))

  return '#' + toHex(r) + toHex(g) + toHex(b)
}
