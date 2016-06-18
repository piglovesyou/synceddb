import {Dispatcher} from 'flux';

const instance = new Dispatcher();

export default instance;
export var dispatch = instance.dispatch.bind(instance);
