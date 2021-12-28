import App from './App.svelte';
import log from './utils/logger'
import initDb from './db/db'
import initializeRepositories from './db/repositories-init';
import setupDataFixes from './db/fix-data'
import createConfigStore from './stores/config'
import createPlayerService from './services/scoresaber/player'
import createBeatSaviorService from './services/beatsavior'
import createRankedsStore from './stores/scoresaber/rankeds'
import initDownloadManager from './network/download-manager'
import initCommandProcessor from './network/command-processor'
import {enablePatches, setAutoFreeze} from 'immer'
import {initCompareEnhancer} from './stores/http/enhancers/scores/compare'
import ErrorComponent from './components/Common/Error.svelte'
import initializeWorkers from './utils/worker-wrappers'

let app = null;

(async() => {
  try {
    // TODO: remove level setting
    // log.setLevel(log.TRACE);
    // log.logOnly(['AccSaberService']);

    log.info('Starting up...', 'Main')

    await initDb();
    await initializeRepositories();
    await setupDataFixes();

    // WORKAROUND for immer.js esm (see https://github.com/immerjs/immer/issues/557)
    window.process = {env: {NODE_ENV: "production"}};

    // setup immer.js
    enablePatches();
    setAutoFreeze(false);

    await initializeWorkers();

    // pre-warm cache && create singleton services
    await createConfigStore();
    createPlayerService();
    createBeatSaviorService();
    await createRankedsStore();

    await initCompareEnhancer();

    initCommandProcessor(await initDownloadManager());

    log.info('Site initialized', 'Main')

    app = new App({
      target: document.body,
      props: {},
    });
  } catch(error) {
    console.error(error);

    if (error instanceof DOMException && error.toString() === 'InvalidStateError: A mutation operation was attempted on a database that did not allow mutations.')
      error = new Error('Firefox in private mode does not support the database. Please run the site in normal mode.')

    app = new ErrorComponent({
      target: document.body,
      props: {error, withTrace: true},
    });
  }
})();


export default app;