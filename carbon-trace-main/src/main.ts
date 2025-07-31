/**
 *   Copyright 2025 Moritz Bock and Software GmbH (previously Software AG)
 *   
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *   
 *     http://www.apache.org/licenses/LICENSE-2.0
 *   
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import './assets/main.scss'


// eslint-disable-next-line @typescript-eslint/no-unused-vars
/** @jsx h */
import { createApp, h } from 'vue'
import { ErrorClient } from '@/lib/ErrorDataHandler'
import { update as updateApiConfig } from '@/lib/apiConfig';
import { updateClients } from '@/lib/api/clients'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)


fetch("/config.json").then((data) => {
  data.json().then((content) => {
    updateApiConfig(content);
    updateClients();
  }).catch((error) => {
    console.error("Could not parse config.json", error);
  }).finally(() => {
    app.mount('#app');
  })
}).catch((error) => {
  console.error("Could not load config.json", error);
  app.mount('#app');
})
window.onunhandledrejection = ErrorClient.unhandledRejection;
