import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const START_PORT = 3000;
const MAX_TRIES = 30;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  // GitHub Pages 프로젝트 경로(/countdown/…)를 로컬에서도 그대로 제공
  if (url === '/countdown' || url.startsWith('/countdown/')) {
    url = url.slice('/countdown'.length) || '/';
  }
  // 클린 URL: 디렉터리 경로(/pomodoro/)는 그 안의 index.html을 제공
  if (url.endsWith('/')) url += 'index.html';
  else if (!extname(url)) url += '/index.html';
  try {
    const data = await readFile('.' + url);
    res.writeHead(200, { 'Content-Type': TYPES[extname(url)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    // 정적 호스트의 404 동작을 흉내: 404.html이 있으면 그것을 404로 제공
    try {
      const nf = await readFile('./404.html');
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(nf);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  }
});

let port = START_PORT;
function tryListen() {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < START_PORT + MAX_TRIES) {
      port++;
      tryListen();
    } else {
      console.error(err);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log(`Countdown dev server: http://localhost:${port}`);
  });
}
tryListen();
