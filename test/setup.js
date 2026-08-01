import htmx from 'htmx.org/dist/htmx.esm.js';
import { register } from '../src/index.js';

globalThis.htmx = htmx;
htmx.config.defaultSettleDelay = 0;
register(htmx);
