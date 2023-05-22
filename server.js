import config from './config.js'; 
import express from 'express';
import {ServerManager} from './src/ServerManager.js';

let manager = new ServerManager(config);