#!/usr/bin/env node
'use strict';

// 웹훅 테스트 전송기
//   node scripts/send.js notify "제목" "메시지" [info|success|warn|urgent]
//   node scripts/send.js activity typing
//   node scripts/send.js state sleeping

const http = require('http');

const PORT = process.env.MASCOT_PORT || 7842;
const TOKEN = process.env.MASCOT_TOKEN || '';

const [, , kind, a, b, c] = process.argv;

let pathName = '/notify';
let payload = {};

if (kind === 'activity') {
  pathName = '/activity';
  payload = { state: a || 'working', ttl: 4000 };
} else if (kind === 'state') {
  pathName = '/state';
  payload = { state: a || 'happy', ttl: 3000 };
} else {
  pathName = '/notify';
  payload = {
    title: a || '테스트 알림',
    message: b || '마스코트 웹훅이 정상 동작합니다.',
    level: c || 'info',
  };
}

const body = JSON.stringify(payload);
const req = http.request(
  {
    host: '127.0.0.1',
    port: PORT,
    path: pathName,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(TOKEN ? { 'x-token': TOKEN } : {}),
    },
  },
  (res) => {
    let out = '';
    res.on('data', (d) => (out += d));
    res.on('end', () => console.log(`[${res.statusCode}] ${out}`));
  }
);
req.on('error', (e) => console.error('전송 실패:', e.message, '\n앱이 실행 중인지 확인하세요.'));
req.write(body);
req.end();
