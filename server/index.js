import { createApp } from './app.js';

const port = Number(process.env.PORT || 3001);
const app = createApp();

app.listen(port, '0.0.0.0', () => {
  console.log(`docmesh-kbms-web BFF listening on http://localhost:${port}`);
  console.log(`KBMS API upstream: ${process.env.KBMS_API_URL || 'http://kbms:8000'}`);
});
