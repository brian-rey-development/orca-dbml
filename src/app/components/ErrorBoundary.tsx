import { Component, type ComponentChildren } from 'preact'

type ErrorBoundaryProps = {
  readonly area: string
  /** The input the area draws from; when it changes, the area tries again. */
  readonly retryOn: unknown
  readonly children: ComponentChildren
}

type ErrorBoundaryState = {
  readonly failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false }

  override componentDidCatch(error: unknown): void {
    console.error(`The DBML ${this.props.area} failed to render`, error)
    this.setState({ failed: true })
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.failed && previous.retryOn !== this.props.retryOn) {
      this.setState({ failed: false })
    }
  }

  override render() {
    if (!this.state.failed) return this.props.children
    return (
      <div class="fatal" role="alert">
        The {this.props.area} could not be shown. It tries again when the file changes, and the
        plugin log has the details.
      </div>
    )
  }
}
