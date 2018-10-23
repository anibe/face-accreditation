import React from 'react'

export default class extends React.Component {
  static async getInitialProps({ req }) {
    const userAgent = req ? req.headers['user-agent'] : navigator.userAgent
    return { userAgent }
  }

  render() {
    return (
      <div>
        <h1>Voters ☑️</h1>
        Hello World {this.props.userAgent}
      </div>
    )
  }
}