import React from 'react'
import PropTypes from 'prop-types'
import Tag from './Tag'
import Input from './Input'
import Suggestions from './Suggestions'
import { matchExact, matchPartial } from './concerns/matchers'

const KEYS = {
  ENTER: 'Enter',
  TAB: 'Tab',
  BACKSPACE: 'Backspace',
  UP_ARROW: 'ArrowUp',
  UP_ARROW_COMPAT: 'Up',
  DOWN_ARROW: 'ArrowDown',
  DOWN_ARROW_COMPAT: 'Down'
}

const CLASS_NAMES = {
  root: 'react-tags',
  rootFocused: 'is-focused',
  selected: 'react-tags__selected',
  selectedTag: 'react-tags__selected-tag',
  selectedTagName: 'react-tags__selected-tag-name',
  search: 'react-tags__search',
  searchWrapper: 'react-tags__search-wrapper',
  searchInput: 'react-tags__search-input',
  suggestions: 'react-tags__suggestions',
  suggestion: 'react-tags__suggestion',
  suggestionActive: 'is-active',
  suggestionDisabled: 'is-disabled'
}

function pressDelimiter () {
  if (this.state.query.length >= this.props.minQueryLength) {
    let index = this.state.index

    if (index === -1 && !this.props.allowNew) {
      // Check if the user typed in an existing suggestion.
      index = this.state.options.findIndex((option) => {
        return matchExact(this.state.query).test(option.name)
      })
    }

    if (index > -1 && this.state.options[index]) {
      this.addTag(this.state.options[index])
    } else if (this.props.allowNew) {
      this.addTag({ name: this.state.query })
    }
  }
}

function pressUpKey (e) {
  e.preventDefault()

  // if first item, cycle to the bottom
  const size = this.state.options.length - 1
  this.setState({ index: this.state.index <= 0 ? size : this.state.index - 1 })
}

function pressDownKey (e) {
  e.preventDefault()

  // if last item, cycle to top
  const size = this.state.options.length - 1
  this.setState({ index: this.state.index >= size ? 0 : this.state.index + 1 })
}

function pressBackspaceKey () {
  // when backspace key is pressed and query is blank, delete the last tag
  if (!this.state.query.length) {
    this.deleteTag(this.props.tags.length - 1)
  }
}

function defaultSuggestionsFilter (item, query) {
  const regexp = matchPartial(query)
  return regexp.test(item.name)
}

function getOptions (props, state) {
  let options
  let highlightedQuery = state.query

  if (props.suggestionsTransform) {
    const result = props.suggestionsTransform(state.query, props.suggestions)

    if (Array.isArray(result)) {
      options = result
    } else {
      options = result.options || []
      highlightedQuery = result.highlightedQuery || state.query
    }
  } else {
    options = props.suggestions.filter((item) => props.suggestionsFilter(item, state.query))
  }

  if (options.length === 0 && props.noSuggestionsText) {
    options.push({ id: 0, name: props.noSuggestionsText, disabled: true, disableMarkIt: true })
  }

  options = options.slice(0, props.maxSuggestionsLength)

  return { options, highlightedQuery }
}

class ReactTags extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      query: '',
      focused: false,
      index: -1
    }

    this.inputEventHandlers = {
      // Provide a no-op function to the input component to avoid warnings
      // <https://github.com/i-like-robots/react-tags/issues/135>
      // <https://github.com/facebook/react/issues/13835>
      onChange: () => {},
      onBlur: this.onBlur.bind(this),
      onFocus: this.onFocus.bind(this),
      onInput: this.onInput.bind(this),
      onKeyDown: this.onKeyDown.bind(this)
    }

    this.container = React.createRef()
    this.input = React.createRef()
    this.suggestions = React.createRef()
  }

  focus (options) {
    if (document.activeElement !== this.input.current.input.current) {
      this.input.current.input.current.focus(options)
    }
  }

  blur () {
    if (document.activeElement === this.input.current.input.current) {
      this.input.current.input.current.blur()
    }
  }

  onInput (e) {
    const query = e.target.value

    if (this.props.onInput) {
      this.props.onInput(query)
    }

    // NOTE: This test is a last resort for soft keyboards and browsers which do not
    // support `KeyboardEvent.key`.
    // <https://bugs.chromium.org/p/chromium/issues/detail?id=763559>
    // <https://bugs.chromium.org/p/chromium/issues/detail?id=118639>
    if (
      query.length === this.state.query.length + 1 &&
      this.props.delimiters.indexOf(query.slice(-1)) > -1
    ) {
      pressDelimiter.call(this)
    } else if (query !== this.state.query) {
      this.setState({ query })
    }
  }

  onKeyDown (e) {
    if (this.props.onKeyDown) {
      this.props.onKeyDown(e)
    }

    // when one of the terminating keys is pressed, add current query to the tags
    if (this.props.delimiters.indexOf(e.key) > -1) {
      if (this.state.query || this.state.index > -1) {
        e.preventDefault()
      }

      pressDelimiter.call(this)
    }

    // when backspace key is pressed and query is blank, delete the last tag
    if (e.key === KEYS.BACKSPACE && this.props.allowBackspace) {
      pressBackspaceKey.call(this, e)
    }

    if (e.key === KEYS.UP_ARROW || e.key === KEYS.UP_ARROW_COMPAT) {
      pressUpKey.call(this, e)
    }

    if (e.key === KEYS.DOWN_ARROW || e.key === KEYS.DOWN_ARROW_COMPAT) {
      pressDownKey.call(this, e)
    }
  }

  onClick (e) {
    if (document.activeElement !== e.target) {
      this.input.current.input.current.focus()
    }
  }

  onBlur () {
    this.setState({ focused: false, index: -1 })

    if (this.props.onBlur) {
      this.props.onBlur()
    }

    if (this.props.addOnBlur) {
      pressDelimiter.call(this)
    }
  }

  onFocus () {
    this.setState({ focused: true })

    if (this.props.onFocus) {
      this.props.onFocus()
    }
  }

  onDeleteTag (index, event) {
    event.preventDefault()
    event.stopPropagation()
    this.deleteTag(index)
  }

  addTag (tag) {
    if (tag.disabled) {
      return
    }

    if (typeof this.props.onValidate === 'function' && !this.props.onValidate(tag)) {
      return
    }

    this.props.onAddition(tag, this.state.query)

    this.clearInput()
  }

  updateTag (i, tag) {
    this.props.onUpdate(i, tag)
  }

  deleteTag (i) {
    this.props.onDelete(i)
  }

  clearInput () {
    this.setState({
      query: '',
      index: -1
    })
  }

  render () {
    const TagComponent = this.props.tagComponent || Tag

    const expanded = this.state.focused && this.state.query.length >= this.props.minQueryLength
    const classNames = [this.props.classNames.root]

    this.state.focused && classNames.push(this.props.classNames.rootFocused)

    return (
      <div ref={this.container} className={classNames.join(' ')} onClick={this.onClick.bind(this)}>
        <div
          className={this.props.classNames.selected}
          aria-relevant='additions removals'
          aria-live='polite'
        >
          {this.props.tags.map((tag, i) => (
            <TagComponent
              key={i}
              tag={tag}
              removeButtonText={this.props.removeButtonText}
              classNames={this.props.classNames}
              onUpdate={this.updateTag.bind(this, i)}
              onDelete={this.onDeleteTag.bind(this, i)}
            />
          ))}
        </div>
        <div className={this.props.classNames.search}>
          <Input
            {...this.state}
            id={this.props.id}
            ref={this.input}
            classNames={this.props.classNames}
            inputAttributes={this.props.inputAttributes}
            inputEventHandlers={this.inputEventHandlers}
            autoresize={this.props.autoresize}
            autoresizePortal={this.props.autoresizePortal}
            expanded={expanded}
            placeholderText={this.props.placeholderText}
            ariaLabelText={this.props.ariaLabelText}
          />
          <Suggestions
            {...this.state}
            id={this.props.id}
            ref={this.suggestions}
            classNames={this.props.classNames}
            query={this.state.highlightedQuery || this.state.query}
            expanded={expanded}
            addTag={this.addTag.bind(this)}
            suggestionComponent={this.props.suggestionComponent}
            suggestionsComponent={this.props.suggestionsComponent}
          />
        </div>
      </div>
    )
  }

  static getDerivedStateFromProps (props, state) {
    if (state.prevQuery !== state.query || state.prevSuggestions !== props.suggestions) {
      const { options, highlightedQuery } = getOptions(props, state)

      return {
        prevQuery: state.query,
        prevSuggestions: props.suggestions,
        options,
        highlightedQuery
      }
    }

    return null
  }
}

ReactTags.defaultProps = {
  id: 'ReactTags',
  tags: [],
  placeholderText: 'Add new tag',
  removeButtonText: 'Click to remove tag',
  noSuggestionsText: null,
  suggestions: [],
  suggestionsFilter: defaultSuggestionsFilter,
  suggestionsTransform: null,
  autoresize: true,
  autoresizePortal: null,
  classNames: CLASS_NAMES,
  delimiters: [KEYS.TAB, KEYS.ENTER],
  minQueryLength: 2,
  maxSuggestionsLength: 6,
  allowNew: false,
  allowBackspace: true,
  addOnBlur: false,
  tagComponent: null,
  suggestionComponent: null,
  suggestionsComponent: null,
  inputAttributes: {}
}

ReactTags.propTypes = {
  id: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.object),
  placeholderText: PropTypes.string,
  ariaLabelText: PropTypes.string,
  removeButtonText: PropTypes.string,
  noSuggestionsText: PropTypes.string,
  suggestions: PropTypes.arrayOf(PropTypes.object),
  suggestionsFilter: PropTypes.func,
  suggestionsTransform: PropTypes.func,
  autoresize: PropTypes.bool,
  autoresizePortal: PropTypes.node,
  delimiters: PropTypes.arrayOf(PropTypes.string),
  onDelete: PropTypes.func.isRequired,
  onAddition: PropTypes.func.isRequired,
  onInput: PropTypes.func,
  onKeyDown: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  onValidate: PropTypes.func,
  minQueryLength: PropTypes.number,
  maxSuggestionsLength: PropTypes.number,
  classNames: PropTypes.object,
  allowNew: PropTypes.bool,
  allowBackspace: PropTypes.bool,
  addOnBlur: PropTypes.bool,
  tagComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element
  ]),
  suggestionComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element
  ]),
  suggestionsComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element
  ]),
  inputAttributes: PropTypes.object
}

export default ReactTags
