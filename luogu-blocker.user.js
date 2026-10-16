// ==UserScript==
// @name         洛谷屏蔽讨论与题解（保留犇犇）
// @namespace    https://github.com/GX6zm/luogu-blocker
// @version      3.2
// @description  屏蔽洛谷主页"最近讨论"、题目页"相关讨论"与算法标签，阻止访问题解页面，并按钩子等级染用户名（保留犇犇）
// @author       GX6zm
// @match        https://www.luogu.com.cn/*
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @homepageURL  https://github.com/GX6zm/luogu-blocker
// @supportURL   https://github.com/GX6zm/luogu-blocker/issues
// @updateURL    https://raw.githubusercontent.com/GX6zm/luogu-blocker/main/luogu-blocker.user.js
// @downloadURL  https://raw.githubusercontent.com/GX6zm/luogu-blocker/main/luogu-blocker.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ========== 1. 屏蔽题解页面 ==========
    function blockSolutionPage() {
        const path = window.location.pathname;
        if (/^\/problem\/solution\//.test(path) || /^\/problem\/[^/]+\/solution/.test(path)) {
            document.documentElement.innerHTML = `
                <head><title>已屏蔽</title></head>
                <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;font-family:system-ui,sans-serif;">
                    <div style="text-align:center;color:#666;">
                        <h2>⛔ 题解页面已被屏蔽</h2>
                        <p>请独立思考后再查看题解。</p>
                    </div>
                </body>
            `;
            throw new Error('Solution page blocked');
        }
    }
    blockSolutionPage();

    // ========== 2. 通用 CSS ==========
    const style = document.createElement('style');
    style.textContent = `
        a[href="/discuss"],
        a[href^="/discuss/"],
        a[href="/discuss/latest"] { display: none !important; }

        .lg-article .tags,
        .lg-article .tag-list { display: none !important; }
    `;
    function injectStyle() {
        if (document.head) {
            document.head.appendChild(style);
        } else {
            new MutationObserver(function(_, obs) {
                if (document.head) {
                    document.head.appendChild(style);
                    obs.disconnect();
                }
            }).observe(document.documentElement, { childList: true });
        }
    }
    injectStyle();

    // ========== 3. 隐藏主页"最近讨论" ==========
    function hideRecentDiscussBlock() {
        if (window.location.pathname !== '/') return;

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const titles = [];
        let node;
        while ((node = walker.nextNode())) {
            if (node.textContent.trim() === '最近讨论') titles.push(node.parentElement);
        }

        for (const title of titles) {
            if (!title || title.dataset.lgBlocked) continue;
            let cur = title.parentElement;
            let target = null;

            while (cur && cur !== document.body) {
                if (cur.querySelector && cur.querySelector('a[href*="/benben"]')) break;
                const replyCount = ((cur.textContent || '').match(/\d+\s*回复/g) || []).length;
                if (replyCount >= 3) { target = cur; break; }
                cur = cur.parentElement;
            }

            if (target) {
                target.style.display = 'none';
                target.dataset.lgBlocked = '1';
            } else {
                title.style.display = 'none';
                let sib = title.nextElementSibling;
                while (sib) {
                    if (sib.querySelector && sib.querySelector('a[href*="/benben"]')) break;
                    sib.style.display = 'none';
                    sib = sib.nextElementSibling;
                }
            }
        }
    }

    // ========== 4. 隐藏题目页算法标签 ==========
    function hideProblemTags() {
        if (!/^\/problem\/[^/]+\/?$/.test(window.location.pathname)) return;

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (node.textContent.trim() !== '标签') continue;
            const title = node.parentElement;
            if (!title || title.dataset.lgTagsBlocked) continue;

            let cur = title.parentElement;
            let target = null;
            while (cur && cur !== document.body) {
                if (cur.querySelector && cur.querySelector('a[href*="/benben"], a[href*="/discuss"]')) break;
                const tagLinks = cur.querySelectorAll('a[href*="tag"], a[href*="/problem/list"]');
                if (tagLinks.length >= 2) { target = cur; break; }
                cur = cur.parentElement;
            }

            if (target) {
                target.style.display = 'none';
                target.dataset.lgTagsBlocked = '1';
            } else {
                title.style.display = 'none';
                let sib = title.nextElementSibling;
                while (sib) {
                    sib.style.display = 'none';
                    sib = sib.nextElementSibling;
                }
            }
        }
    }

    // ========== 5. 隐藏题目页"相关讨论" ==========
    function hideOneCard(startEl) {
        if (!startEl || startEl.dataset.lgRdHidden) return;

        let cur = startEl;
        while (cur && cur !== document.body) {
            const cls = (typeof cur.className === 'string' ? cur.className : '') || '';
            if (/lfe-card|(^|\s)card(\s|$)|panel|box/i.test(cls) &&
                !/card-(body|header|head|footer|foot|title|content)/i.test(cls)) {
                cur.style.display = 'none';
                cur.dataset.lgRdHidden = '1';
                return;
            }
            cur = cur.parentElement;
        }

        let target = startEl;
        for (let i = 0; i < 4; i++) {
            const parent = target.parentElement;
            if (!parent || parent === document.body) break;

            const otherContentChildren = Array.from(parent.children).filter(function(c) {
                if (c === target) return false;
                const tag = c.tagName.toLowerCase();
                if (tag === 'script' || tag === 'style' || tag === 'br' || tag === 'svg') return false;
                if (c.style.display === 'none') return false;
                if ((c.textContent || '').trim()) return true;
                if (c.children.length > 0) return true;
                return false;
            });

            if (otherContentChildren.length === 0) {
                target = parent;
            } else {
                break;
            }
        }

        target.style.display = 'none';
        target.dataset.lgRdHidden = '1';
    }

    function hideRelatedDiscuss() {
        if (!/^\/problem\/[^/]+\/?$/.test(window.location.pathname)) return;

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const starts = [];
        let n;
        while ((n = walker.nextNode())) {
            const t = n.textContent.trim();
            if (t === '相关讨论' || t === '查看讨论') {
                starts.push(n.parentElement);
            }
        }

        for (const el of starts) hideOneCard(el);
    }

    // ========== 6. 按钩子等级染色用户名 ==========
    function setupHookColors() {
        const ENABLE_KEY = 'lg_hook_color_enabled';
        let enabled = localStorage.getItem(ENABLE_KEY) !== '0';

        const hookStyle = document.createElement('style');
        hookStyle.id = 'lg-hook-color-style';
        hookStyle.textContent = `
            a[href^="/user/"].hook-green {
                background: linear-gradient(90deg, #2ecc71, #a8e6cf, #2ecc71);
                background-size: 200% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
                font-weight: 600;
                animation: lg-hook-green-flow 3s linear infinite;
            }
            a[href^="/user/"].hook-blue {
                background: linear-gradient(90deg, #3498db, #a9cce3, #3498db);
                background-size: 200% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
                font-weight: 700;
                animation: lg-hook-blue-pulse 2s ease-in-out infinite;
            }
            a[href^="/user/"].hook-gold {
                background: linear-gradient(90deg, #f1c40f, #fff8b0, #f39c12, #fff8b0, #f1c40f);
                background-size: 300% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
                font-weight: 800;
                animation: lg-hook-gold-shine 5s linear infinite;
                text-shadow: 0 0 8px rgba(241, 196, 15, 0.6);
            }
            @keyframes lg-hook-green-flow {
                0%   { background-position: 0% center; }
                100% { background-position: 200% center; }
            }
            @keyframes lg-hook-blue-pulse {
                0%, 100% { opacity: 1; }
                50%      { opacity: 0.75; }
            }
            @keyframes lg-hook-gold-shine {
                0%   { background-position: 0% center; }
                100% { background-position: 300% center; }
            }
        `;

        function injectHookStyle() {
            if (document.head && enabled && !document.getElementById('lg-hook-color-style')) {
                document.head.appendChild(hookStyle);
            }
        }
        function removeHookStyle() {
            const s = document.getElementById('lg-hook-color-style');
            if (s) s.remove();
            document.querySelectorAll('a.hook-green, a.hook-blue, a.hook-gold').forEach(function(el) {
                el.classList.remove('hook-green', 'hook-blue', 'hook-gold');
            });
        }

        function parseUidToCcfLevel() {
            const script = document.getElementById('lentille-context');
            if (!script) return null;
            try {
                const data = JSON.parse(script.textContent);
                const users = data && data.data && data.data.users && data.data.users.result;
                if (!Array.isArray(users)) return null;
                const map = {};
                users.forEach(function(u) {
                    if (u && typeof u.uid !== 'undefined') {
                        map[String(u.uid)] = u.ccfLevel || 0;
                    }
                });
                return map;
            } catch (e) {
                return null;
            }
        }

        function svgFillToLevel(fill) {
            if (!fill) return 0;
            const c = fill.toLowerCase().trim();
            if (c === '#5eb95e') return 3;
            if (c === '#3498db') return 6;
            if (c === '#f1c40f' || c === '#f39c12' ||
                c === '#ffd700' || c === '#fbc531' ||
                c === '#e67e22' || c === '#ffc107') return 9;
            return 0;
        }

        function getDomHookLevel(userLinkEl) {
            let sib = userLinkEl.nextElementSibling;
            let hops = 0;
            while (sib && hops < 4) {
                if (sib.tagName === 'A' && sib.classList.contains('sb_amazeui')) {
                    const svg = sib.querySelector('svg[fill]');
                    if (svg) return svgFillToLevel(svg.getAttribute('fill'));
                }
                sib = sib.nextElementSibling;
                hops++;
            }
            let scope = userLinkEl.parentElement;
            let depth = 0;
            while (scope && scope !== document.body && depth < 3) {
                const hookA = scope.querySelector('a.sb_amazeui svg[fill]');
                if (hookA) return svgFillToLevel(hookA.getAttribute('fill'));
                scope = scope.parentElement;
                depth++;
            }
            return 0;
        }

        function levelToClass(level) {
            if (level >= 8) return 'hook-gold';
            if (level >= 6) return 'hook-blue';
            if (level >= 1) return 'hook-green';
            return null;
        }

        function runHookColors() {
            if (!enabled) return;
            if (!document.body) return;

            injectHookStyle();

            const isFollowingPage = /\/user\/[^/]+\/(following|follow)/.test(window.location.pathname);
            const uidMap = isFollowingPage ? parseUidToCcfLevel() : null;

            document.querySelectorAll('a[href^="/user/"]').forEach(function(a) {
                const text = (a.textContent || '').trim();
                if (!text) return;

                let level = 0;
                let matched = false;

                if (uidMap) {
                    const m = (a.getAttribute('href') || '').match(/^\/user\/(\d+)/);
                    if (m && (m[1] in uidMap)) {
                        level = uidMap[m[1]];
                        matched = true;
                    }
                }
                if (!matched) {
                    level = getDomHookLevel(a);
                    if (level > 0) matched = true;
                }
                if (!matched) return;

                const cls = levelToClass(level);
                if (!cls) return;

                if (a.classList.contains(cls)) return;
                a.classList.remove('hook-green', 'hook-blue', 'hook-gold');
                a.classList.add(cls);
            });
        }

        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand('切换：钩子染色', function() {
                enabled = !enabled;
                localStorage.setItem(ENABLE_KEY, enabled ? '1' : '0');
                if (enabled) {
                    injectHookStyle();
                    runHookColors();
                } else {
                    removeHookStyle();
                }
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runHookColors);
        } else {
            runHookColors();
        }
        new MutationObserver(runHookColors).observe(document.body, { childList: true, subtree: true });
    }

    // ========== 7. 统一调度 ==========
    function runAll() {
        document.querySelectorAll('a[href*="/discuss"]').forEach(function(el) {
            if (el.href && el.href.includes('/benben')) return;
            el.style.display = 'none';
        });
        hideRecentDiscussBlock();
        hideProblemTags();
        hideRelatedDiscuss();
    }

    function startObserver() {
        runAll();
        new MutationObserver(runAll).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }

    setupHookColors();

    // ========== 8. 点击拦截 ==========
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;
        if (link.href.includes('/benben')) return;
        if (link.href.includes('/discuss')) {
            e.preventDefault(); e.stopPropagation(); return false;
        }
        if (/\/problem\/solution\//.test(link.href) ||
            /\/problem\/[^/]+\/solution/.test(link.href)) {
            e.preventDefault(); e.stopPropagation(); return false;
        }
    }, true);

})();
