import React from 'react';
import {render} from 'react-dom';
import Application from './components/Application.jsx';
import './persistence';
require('./main.sass');

const el = document.getElementById('application-container');

render(<Application {...JSON.parse(el.dataset.json)} />, el);
