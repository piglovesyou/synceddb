import dispatcher from '../dispatcher';
import {ReduceStore} from 'flux/utils';

class Store extends ReduceStore {
  getInitialState() {
    return {
    };
  }
  reduce(state, action) {
    switch (action.type) {
    case 'changed':
    }
    return state;
  }
}

export default new Store(dispatcher);
