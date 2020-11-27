import { getColorShade } from '../src/utils'

describe('getColorShade()', () => {
  it('should return the right color', () => {
    expect(getColorShade('#ff0000', '#ffffff', 1.0))
      .toBe('#ff0000')

    expect(getColorShade('#ff0000', '#ffffff', 0.0))
      .toBe('#ffffff')

    expect(getColorShade('#ff0000', '#ffffff', 0.5))
      .toBe('#ff8080')
  })

  it('should work with all rgb formats', () => {
    expect(getColorShade('ff0000', 'ffffff', 1.0))
      .toBe('#ff0000')

    expect(getColorShade('f00', 'fff', 1.0))
      .toBe('#ff0000')
  })
})
