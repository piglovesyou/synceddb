import React from 'react';
import Toolbar from './Toolbar.jsx';
import {Container} from 'flux/utils';
import Store from '../stores/application';

class Application extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  static getStores() {
    return [Store];
  }

  static calculateState(prevState) {
    return Store.getState();
  }

  render() {
    return (
      <div className="application">
        <Toolbar {...this.props}></Toolbar>
        <div className="main">
          <div className="side-pane">
            <div className="side-pane__label flexbox">
              <span className="flex-1">Channels</span>
              <i className="fa fa-plus"></i>
            </div>
            <ul className="side-pane__channel-list">
            </ul>
          </div>
          <div className="main-pane">
            <div className="channel-content">
              <div className="channel-title">kky</div>
              <div className="input-area">yeah</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default Container.create(Application);
