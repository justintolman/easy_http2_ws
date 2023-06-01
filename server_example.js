import config from './config.js';
import {ServerManager} from 'easy_http2_ws';
import express from 'express';

let manager = new ServerManager(config);