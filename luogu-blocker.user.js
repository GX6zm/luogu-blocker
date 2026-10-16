// ==UserScript==
// @name         洛谷屏蔽讨论与题解（保留犇犇）
// @namespace    https://github.com/GX6zm/luogu-blocker
// @version      2.6
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
        // 设计：
        //   ① 颜色在"深色 ↔ 亮色"之间循环，两端都是高对比度色，任何时刻都看得清
        //   ② 峰值时叠加多层 text-shadow，光晕明显扩散
        //   ③ 周期 1.8~2.2s，节奏明快，一眼能看出在动
        //   ④ 选择器用 html body a[href^="/user/"]，特异性高，压过 lg-fg-xxx
        hookStyle.textContent = `
            /* ============ 绿钩：翡翠脉动 ============ */
            html body a[href^="/user/"].hook-green,
            html body a[href^="/user/"].hook-green > *,
            html body a[href^="/user/"].hook-green:hover {
                color: #0a7a35 !important;
                -webkit-text-fill-color: #0a7a35 !important;
                font-weight: 700 !important;
                animation: lg-hook-green-pulse 1.8s ease-in-out infinite !important;
            }

            /* ============ 蓝钩：深海脉冲 ============ */
            html body a[href^="/user/"].hook-blue,
            html body a[href^="/user/"].hook-blue > *,
            html body a[href^="/user/"].hook-blue:hover {
                color: #0a3d91 !important;
                -webkit-text-fill-color: #0a3d91 !important;
                font-weight: 700 !important;
                animation: lg-hook-blue-pulse 2.2s ease-in-out infinite !important;
            }

            /* ============ 金钩：鎏金脉冲 ============ */
            html body a[href^="/user/"].hook-gold,
            html body a[href^="/user/"].hook-gold > *,
            html body a[href^="/user/"].hook-gold:hover {
                color: #8a5a00 !important;
                -webkit-text-fill-color: #8a5a00 !important;
                font-weight: 800 !important;
                animation: lg-hook-gold-pulse 2s ease-in-out infinite !important;
            }

            /* ============ 关键帧：颜色 + 光晕同步呼吸 ============ */
            @keyframes lg-hook-green-pulse {
                0%, 100% {
                    color: #0a7a35;
                    -webkit-text-fill-color: #0a7a35;
                    text-shadow:
                        0 0 0 rgba(30, 220, 110, 0),
                        0 0 0 rgba(30, 220, 110, 0);
                }
                50% {
                    color: #1edc6e;
                    -webkit-text-fill-color: #1edc6e;
                    text-shadow:
                        0 0 6px rgba(30, 220, 110, 0.95),
                        0 0 14px rgba(30, 220, 110, 0.65),
                        0 0 22px rgba(30, 220, 110, 0.35);
                }
            }

            @keyframes lg-hook-blue-pulse {
                0%, 100% {
                    color: #0a3d91;
                    -webkit-text-fill-color: #0a3d91;
                    text-shadow:
                        0 0 0 rgba(64, 160, 255, 0),
                        0 0 0 rgba(64, 160, 255, 0);
                }
                50% {
                    color: #40a0ff;
                    -webkit-text-fill-color: #40a0ff;
                    text-shadow:
                        0 0 6px rgba(64, 160, 255, 0.95),
                        0 0 14px rgba(64, 160, 255, 0.65),
                        0 0 24px rgba(64, 160, 255, 0.4),
                        0 0 34px rgba(120, 200, 255, 0.2);
                }
            }

            @keyframes lg-hook-gold-pulse {
                0%, 100% {
                    color: #8a5a00;
                    -webkit-text-fill-color: #8a5a00;
                    text-shadow:
                        0 0 0 rgba(255, 200, 0, 0),
                        0 0 0 rgba(255, 200, 0, 0);
                }
                50% {
                    color: #ffc800;
                    -webkit-text-fill-color: #ffc800;
                    text-shadow:
                        0 0 6px rgba(255, 200, 0, 1),
                        0 0 14px rgba(255, 200, 0, 0.7),
                        0 0 24px rgba(255, 200, 0, 0.45),
                        0 0 36px rgba(255, 230, 120, 0.25);
                }
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
