// ==UserScript==
// @name         洛谷屏蔽讨论与题解（保留犇犇）
// @namespace    https://github.com/GX6zm/luogu-blocker
// @version      1.9
// @description  屏蔽洛谷主页"最近讨论"、题目页"相关讨论"与算法标签，阻止访问题解页面（保留犇犇）
// @author       GX6zm
// @match        https://www.luogu.com.cn/*
// @grant        none
// @run-at       document-start
// @homepageURL  https://github.com/GX6zm/luogu-blocker
// @supportURL   https://github.com/GX6zm/luogu-blocker/issues
// @updateURL    https://github.com/GX6zm/luogu-blocker/main/luogu-blocker.user.js
// @downloadURL  https://github.com/GX6zm/luogu-blocker/main/luogu-blocker.user.js
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
        /* 隐藏所有指向讨论区的链接，不动 /benben */
        a[href="/discuss"],
        a[href^="/discuss/"],
        a[href="/discuss/latest"] { display: none !important; }

        /* 题目页算法标签的 CSS 兜底 */
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

    // ========== 3. 隐藏主页"最近讨论"整个板块（保留犇犇） ==========
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

    // ========== 4. 隐藏题目页的算法标签 ==========
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

    // ========== 5. 隐藏题目页"相关讨论"卡片（含空外框） ==========
    function hideOneCard(startEl) {
        if (!startEl || startEl.dataset.lgRdHidden) return;

        // 5.1 优先按类名匹配
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

        // 5.2 启发式：父级里只有它一个"有内容"的子节点就继续往上
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

    // ========== 6. 关注列表按钩子等级染色 ==========
    function setupFollowingHookColors() {
        const RAINBOW_KEY = 'lg_hook_color_enabled';
        let enabled = localStorage.getItem(RAINBOW_KEY) !== '0';

        const hookStyle = document.createElement('style');
        hookStyle.id = 'lg-hook-color-style';
        hookStyle.textContent = `
            /* 绿钩：1~5 级 —— 清新流光 */
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
            /* 蓝钩：6~7 级 —— 深邃脉冲 */
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
            /* 金钩：8~10 级 —— 闪耀金辉 */
            a[href^="/user/"].hook-gold {
                background: linear-gradient(90deg, #f1c40f, #fff8b0, #f39c12, #fff8b0, #f1c40f);
                background-size: 300% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
                font-weight: 800;
                animation: lg-hook-gold-shine 2.5s linear infinite;
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
            // 清除所有已加的 class
            document.querySelectorAll('a.hook-green, a.hook-blue, a.hook-gold').forEach(function(el) {
                el.classList.remove('hook-green', 'hook-blue', 'hook-gold');
                delete el.dataset.lgHookDone;
            });
        }

        // 读取单个用户的钩子等级
        function getHookLevel(userLinkEl) {
            let card = userLinkEl.closest('[class*="user"], [class*="card"], li, tr');
            if (!card) card = userLinkEl.parentElement;

            // A. data 属性
            const dataEl = card.querySelector('[data-level]');
            if (dataEl && dataEl.dataset && dataEl.dataset.level) {
                const v = parseInt(dataEl.dataset.level, 10);
                if (!isNaN(v)) return v;
            }
            // B. class 名含 hook / level
            const hookEl = card.querySelector('[class*="hook"], [class*="level"]');
            if (hookEl) {
                const cls = hookEl.className || '';
                if (/green|绿/i.test(cls)) return 3;
                if (/blue|蓝/i.test(cls))  return 6;
                if (/gold|金/i.test(cls))  return 9;
            }
            // C. img alt 文本
            const img = card.querySelector('img[alt*="钩"]');
            if (img) {
                const alt = img.alt || '';
                if (/绿/.test(alt)) return 3;
                if (/蓝/.test(alt)) return 6;
                if (/金/.test(alt)) return 9;
            }
            return 0;
        }

        function applyHookClass(userLinkEl) {
            if (userLinkEl.dataset.lgHookDone) return;
            userLinkEl.dataset.lgHookDone = '1';
            const level = getHookLevel(userLinkEl);
            if (level >= 8)      userLinkEl.classList.add('hook-gold');
            else if (level >= 6) userLinkEl.classList.add('hook-blue');
            else if (level >= 1) userLinkEl.classList.add('hook-green');
        }

        function runHookColors() {
            // 只在关注列表页执行
            if (!/\/user\/[^/]+\/(following|follow)/.test(window.location.pathname)) return;
            if (!enabled) return;
            injectHookStyle();
            document.querySelectorAll('a[href^="/user/"]').forEach(applyHookClass);
        }

        // 注册菜单开关
        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand('切换：关注列表钩子染色', function() {
                enabled = !enabled;
                localStorage.setItem(RAINBOW_KEY, enabled ? '1' : '0');
                if (enabled) {
                    injectHookStyle();
                    document.querySelectorAll('a[href^="/user/"]').forEach(function(el) {
                        delete el.dataset.lgHookDone;
                    });
                    runHookColors();
                } else {
                    removeHookStyle();
                }
            });
        }

        // 首次执行 + 监听
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runHookColors);
        } else {
            runHookColors();
        }
        new MutationObserver(runHookColors).observe(document.body, { childList: true, subtree: true });
    }

    // ========== 7. 统一调度 ==========
    function runAll() {
        // 隐藏讨论链接（跳过犇犇）
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

    // 启动钩子染色模块
    setupFollowingHookColors();

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
