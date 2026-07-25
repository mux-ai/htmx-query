import htmx from 'htmx.org';
import { register } from '../src/index.js';

globalThis.htmx = htmx;
htmx.config.defaultSettleDelay = 0;
register(htmx);
