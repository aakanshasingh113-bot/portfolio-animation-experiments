/* Keyboard (scoped to the game region) and press-and-hold pointer controls. */
(function (global) {
  'use strict';
  const NS = global.DNS || (global.DNS = {});

  const LEFT_CODES = ['ArrowLeft', 'KeyA'];
  const RIGHT_CODES = ['ArrowRight', 'KeyD'];

  class InputController {
    constructor(opts) {
      this.region = opts.region;
      this.leftBtn = opts.leftBtn;
      this.rightBtn = opts.rightBtn;
      this.onChange = opts.onChange;
      this.onPauseKey = opts.onPauseKey || function () {};
      this.isActive = opts.isActive || function () { return true; };
      this.keys = { left: new Set(), right: new Set() };
      this.pointers = { left: new Set(), right: new Set() };
      this._last = { left: false, right: false };
      this._off = [];
      this._bind();
    }

    _on(el, type, fn, opt) { el.addEventListener(type, fn, opt); this._off.push(() => el.removeEventListener(type, fn, opt)); }

    _bind() {
      this._on(this.region, 'keydown', (e) => this._key(e, true));
      this._on(this.region, 'keyup', (e) => this._key(e, false));
      this._on(this.region, 'focusout', (e) => {
        if (!e.relatedTarget || !this.region.contains(e.relatedTarget)) this.clearKeys();
      });
      for (const [side, btn] of [['left', this.leftBtn], ['right', this.rightBtn]]) {
        const set = this.pointers[side];
        this._on(btn, 'pointerdown', (e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.preventDefault();
          try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          set.add(e.pointerId);
          btn.focus({ preventScroll: true });
          this._emit();
        });
        const release = (e) => { if (set.delete(e.pointerId)) this._emit(); };
        this._on(btn, 'pointerup', release);
        this._on(btn, 'pointercancel', release);
        this._on(btn, 'lostpointercapture', release);
        this._on(btn, 'contextmenu', (e) => e.preventDefault());
        // Space / Enter on a focused tilt button behaves as press-and-hold.
        this._on(btn, 'keydown', (e) => {
          if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
            e.preventDefault(); e.stopPropagation();
            if (this.isActive()) { this.keys[side].add('btn:' + e.code); this._emit(); }
          }
        });
        this._on(btn, 'keyup', (e) => {
          if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
            e.preventDefault(); e.stopPropagation();
            if (this.keys[side].delete('btn:' + e.code)) this._emit();
          }
        });
      }
      this._on(global, 'blur', () => this.clearAll());
    }

    _key(e, down) {
      if (e.defaultPrevented && down) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const side = LEFT_CODES.indexOf(e.code) >= 0 ? 'left' : RIGHT_CODES.indexOf(e.code) >= 0 ? 'right' : null;
      if (side) {
        if (!down) { if (this.keys[side].delete(e.code)) this._emit(); return; }
        if (!this.isActive()) return;
        e.preventDefault();
        this.keys[side].add(e.code);
        this._emit();
        return;
      }
      if (down && !e.repeat && (e.code === 'KeyP' || e.code === 'Escape')) {
        if (this.onPauseKey()) e.preventDefault();
      }
    }

    held() {
      return {
        left: this.keys.left.size > 0 || this.pointers.left.size > 0,
        right: this.keys.right.size > 0 || this.pointers.right.size > 0,
      };
    }

    _emit() {
      const h = this.held();
      this.leftBtn.classList.toggle('is-held', h.left);
      this.rightBtn.classList.toggle('is-held', h.right);
      if (h.left !== this._last.left || h.right !== this._last.right) {
        this._last = h;
        this.onChange(h.left, h.right);
      }
    }

    clearKeys() { this.keys.left.clear(); this.keys.right.clear(); this._emit(); }
    clearAll() {
      this.keys.left.clear(); this.keys.right.clear();
      for (const side of ['left', 'right']) {
        const btn = side === 'left' ? this.leftBtn : this.rightBtn;
        for (const id of this.pointers[side]) { try { btn.releasePointerCapture(id); } catch (e) { /* ignore */ } }
        this.pointers[side].clear();
      }
      this._emit();
    }

    destroy() { this._off.forEach((f) => f()); this._off = []; }
  }

  NS.InputController = InputController;
})(typeof globalThis !== 'undefined' ? globalThis : this);
