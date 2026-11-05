/* ============================================================================
   触覚Ultra (HapticUltra)  —  drop-in, no imports, offline-safe
   ここから下をコピーすればどのページでも使えます。
   ============================================================================ */
(function (global) {
  'use strict';
  var canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  /* --- 旧来の “プログラム発火" スイッチ（iOS<=26.4 と Android(vibrate) 向け） --------
     iOS 26.5+ ではこれ単体では鳴らない＝ベストエフォート扱い。 */
  var legacySwitch = null;
  function getLegacySwitch() {
    if (legacySwitch) return legacySwitch;
    var label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;opacity:0;pointer-events:none;overflow:hidden';
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');     // iOS の本物スイッチ
    label.appendChild(input);
    (document.body || document.documentElement).appendChild(label);
    legacySwitch = input;
    return input;
  }
  // 1発ぶんの “発火試行"
  //  iOS 17.4–26.4 / iOS 27+ : 本物スイッチのネイティブ .click() で触覚が鳴る
  //  iOS 26.5 だけ           : プログラム .click() は無音（その分は bind() の実タップが保証）
  //  Android                 : navigator.vibrate() で振動
  function fire() {
    try {
      // ★ ネイティブの .click() を直接叩く。これが「復活したiOS27」でも鳴る本筋。
      getLegacySwitch().click();
    } catch (e) {}
    try { if (canVibrate) navigator.vibrate(8); } catch (e) {}
  }
  // 任意パターン: 各 delay(ms) で fire()。暴走防止に最大200発でクランプ。
  function pattern(delays) {
    if (!Array.isArray(delays)) return;
    var n = Math.min(delays.length, 200);
    for (var i = 0; i < n; i++) setTimeout(fire, Math.max(0, delays[i] | 0));
  }
  function burstN(count, gap) {
    count = Math.min(count | 0, 200); gap = gap || 70;
    var ds = []; for (var i = 0; i < count; i++) ds.push(i * gap);
    pattern(ds);
  }

  // 旧 ios-haptics 互換API（プログラム発火・ベストエフォート）
  function haptic() { fire(); }
  haptic.confirm = function () { burstN(2, 90); };
  haptic.error   = function () { burstN(3, 90); };

  /* --- ★本命★ ユーザーの実タップで確実に鳴らす bind() ---------------------------
     対象要素の上に “本物の" 透明スイッチを重ねる。指のタップがそのスイッチを直接
     トグル＝iOS 26.5+ でも「ユーザー操作」として確実に触覚1発。 */
  function resolveBurst(opt) {
    var b = opt && opt.burst;
    var gap = (opt && opt.gap) || 70;
    if (b == null || b === 'single' || b === 1) return null;            // 単発のみ
    if (b === 'confirm') return function () { burstN(2, 90); };
    if (b === 'error')   return function () { burstN(3, 90); };
    if (typeof b === 'number') return function () { burstN(b, gap); };
    if (typeof b === 'function') return b;
    return null;
  }

  function bind(el, opt) {
    if (!el || el.__huBound) return el;
    el.__huBound = true;
    opt = opt || {};
    var burstFn = resolveBurst(opt);
    var forwardClick = !!opt.forwardClick;   // 既存onclickを活かしたい時 true

    // 重ね配置できるように position を確保
    var pos = (global.getComputedStyle ? getComputedStyle(el).position : el.style.position);
    if (!pos || pos === 'static') el.style.position = 'relative';

    // 本物のスイッチを生成して重ねる（透明・全面・ヒット可能）
    var sw = document.createElement('input');
    sw.type = 'checkbox';
    sw.setAttribute('switch', '');
    sw.setAttribute('aria-hidden', 'true');
    sw.tabIndex = -1;
    sw.className = 'hu-overlay';
    // CSSクラスが無い環境でも効くよう最低限の inline スタイルも付与
    sw.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:3;touch-action:manipulation';
    el.appendChild(sw);

    // ★ ユーザーが指でトグル → iOS が本物の触覚を1発鳴らす（これが肝）
    sw.addEventListener('change', function (ev) {
      try { if (canVibrate) navigator.vibrate(8); } catch (e) {}   // Android保険
      if (burstFn) { try { burstFn(); } catch (e) {} }             // 追加連打(対応端末のみ)
      if (typeof opt.onTap === 'function') { try { opt.onTap(ev); } catch (e) {} }
      if (forwardClick) {                                          // 既存onclickを発火
        try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (e) {}
      }
    });

    // 押下中の見た目（タップはスイッチに吸われるので :active が効かない為の代替）
    var press = function () { el.classList.add('is-pressed'); };
    var release = function () { el.classList.remove('is-pressed'); };
    sw.addEventListener('pointerdown', press);
    sw.addEventListener('pointerup', release);
    sw.addEventListener('pointercancel', release);
    sw.addEventListener('pointerleave', release);

    // キーボード操作の保険（Enter/Space → 処理は走る。触覚はプログラム発火扱い）
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sw.click(); }
    });
    return el;
  }

  // data-haptic 属性のついた要素を一括 bind（既存onclickも活かす）
  function auto(root) {
    (root || document).querySelectorAll('[data-haptic]').forEach(function (el) {
      bind(el, { burst: el.getAttribute('data-haptic') || 'single', forwardClick: true });
    });
  }

  var API = haptic; // 関数本体に静的メソッドをぶら下げる（ios-haptics と同形）
  API.bind = bind;
  API.auto = auto;
  API.fire = fire;
  API.pattern = pattern;
  API.burstN = burstN;
  API.canVibrate = canVibrate;

  global.HapticUltra = API;
  global.haptic = API;   // 旧コードの haptic() / haptic.confirm() / haptic.error() 互換
})(window);
