import React from 'react'
import ReactDOM from 'react-dom'

const SIZER_STYLES = {
  position: 'absolute',
  width: 0,
  height: 0,
  visibility: 'hidden',
  overflow: 'scroll',
  whiteSpace: 'pre'
}

const STYLE_PROPS = [
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'paddingLeft',
  'paddingRight',
  'textTransform'
]

class Input extends React.Component {
  constructor (props) {
    super(props)
    this.state = { inputWidth: null }

    this.input = React.createRef()
    this.sizer = React.createRef()
  }

  componentDidMount () {
    if (this.props.autoresize) {
      this.copyInputStyles()
      this.updateInputWidth()
    }
  }

  componentDidUpdate ({ query, placeholder }) {
    if (query !== this.props.query || placeholder !== this.props.placeholder) {
      this.updateInputWidth()
    }
  }

  copyInputStyles () {
    const inputStyle = window.getComputedStyle(this.input.current)

    STYLE_PROPS.forEach((prop) => {
      this.sizer.current.style[prop] = inputStyle[prop]
    })
  }

  updateInputWidth () {
    let inputWidth

    if (this.props.autoresize) {
      // scrollWidth is designed to be fast not accurate.
      // +2 is completely arbitrary but does the job.
      inputWidth = Math.ceil(this.sizer.current.scrollWidth) + 2
    }

    if (inputWidth !== this.state.inputWidth) {
      this.setState({ inputWidth })
    }
  }

  render () {
    const {
      id,
      query,
      ariaLabelText,
      placeholderText,
      expanded,
      classNames,
      inputAttributes,
      inputEventHandlers,
      index,
      autoresizePortal
    } = this.props

    const sizer = <div ref={this.sizer} style={SIZER_STYLES}>{query || placeholderText}</div>

    return (
      <div className={classNames.searchWrapper}>
        <input
          {...inputAttributes}
          {...inputEventHandlers}
          ref={this.input}
          value={query}
          placeholder={placeholderText}
          className={classNames.searchInput}
          role='combobox'
          aria-autocomplete='list'
          aria-label={ariaLabelText || placeholderText}
          aria-owns={id}
          aria-activedescendant={index > -1 ? `${id}-${index}` : null}
          aria-expanded={expanded}
          style={{ width: this.state.inputWidth }}
        />
        {autoresizePortal ? ReactDOM.createPortal(sizer, autoresizePortal) : sizer}
      </div>
    )
  }
}

export default Input
