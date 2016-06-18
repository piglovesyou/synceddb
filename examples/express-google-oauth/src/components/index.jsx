import React from 'react';
import Layout from './Layout';
import Application from './Application';

export default class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <Layout {...this.props}>
        <Application {...this.props}></Application>
      </Layout>
    );
  }
};
