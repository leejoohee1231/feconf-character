'use strict';

// ===========================================================================
// vite-plugin-mascot — Vite 빌드/dev 서버 상태를 달팽이 마스코트로 보내기
//
//   // vite.config.js
//   import mascot from './integrations/vite-plugin-mascot.js'
//   export default { plugins: [mascot()] }
//
//  • dev 서버 준비됨      → "🚀 준비 완료" + 로컬 주소
//  • 파일 저장(HMR)       → 달팽이 집중 → 잠시 후 "✅ 적용됨"
//  • vite build 시작      → 달팽이 집중(빌드 중)
//  • 빌드 성공            → "✅ 빌드 완료 · N.Ns"
//  • 빌드/컴파일 에러     → "🚨 빌드 실패" (흔들림)
//
// 앱이 꺼져 있으면 조용히 무시돼서 빌드에 전혀 영향 없어요.
// ===========================================================================

const m = require('./mascot-client');

function mascotPlugin(options = {}) {
  const opts = { hmr: true, ...options };
  let isBuild = false;
  let buildStartAt = 0;
  let hadError = false;
  let hmrTimer = null;

  return {
    name: 'vite-plugin-mascot',
    apply: () => true, // build + serve 모두

    config(_config, env) {
      isBuild = env.command === 'build';
    },

    buildStart() {
      if (isBuild) {
        hadError = false;
        buildStartAt = Date.now();
        m.building('vite');
      }
    },

    buildEnd(err) {
      if (isBuild && err) {
        hadError = true;
        m.fail('🚨 빌드 실패', String((err && err.message) || err).split('\n')[0].slice(0, 120));
      }
    },

    closeBundle() {
      if (isBuild && !hadError) {
        const dur = `${((Date.now() - buildStartAt) / 1000).toFixed(1)}s`;
        m.success('✅ 빌드 완료', dur);
      }
    },

    // ---- dev 서버 ----
    configureServer(server) {
      server.httpServer &&
        server.httpServer.once('listening', () => {
          // 로컬 주소 추출
          let url = '';
          try {
            const addr = server.httpServer.address();
            const port = addr && typeof addr === 'object' ? addr.port : '';
            const cfgPort =
              (server.config && server.config.server && server.config.server.port) || port;
            url = `localhost:${cfgPort}`;
          } catch (_) {}
          m.ready('🚀 dev 서버 준비됐어요', url ? `${url} 열림` : '');
        });
    },

    handleHotUpdate(ctx) {
      if (isBuild || opts.hmr === false) return;
      // 저장 → 집중, 잠시 뒤 성공 (낙관적). 연속 저장은 디바운스.
      m.state('working');
      if (hmrTimer) clearTimeout(hmrTimer);
      const file = ctx && ctx.file ? ctx.file.split('/').pop() : '';
      hmrTimer = setTimeout(() => {
        m.success('✅ 적용됨', file ? `${file} 변경 반영` : 'HMR 반영');
      }, 350);
    },
  };
}

module.exports = mascotPlugin;
module.exports.default = mascotPlugin;
