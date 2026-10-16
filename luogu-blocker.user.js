// ==UserScript==
// @name         洛谷屏蔽讨论与题解（保留犇犇）
// @namespace    https://github.com/GX6zm/luogu-blocker
// @version      3.4
// @description  屏蔽洛谷主页"最近讨论"、题目页"相关讨论"与算法标签，阻止访问题解页面（保留犇犇）
// @author       GX6zm
// @match        https://www.luogu.com.cn/*
// @run-at       document-start
// @homepageURL  https://github.com/GX6zm/luogu-blocker
// @supportURL   https://github.com/GX6zm/luogu-blocker/issues
// @updateURL    https://raw.githubusercontent.com/GX6zm/luogu-blocker/main/luogu-blocker.user.js
// @downloadURL  https://raw.githubusercontent.com/GX6zm/luogu-blocker/main/luogu-blocker.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 讨论链接白名单：这些链接不隐藏、不拦截
    // /discuss/142324 与 /discuss/show/142324 是钩子等级说明帖
    function isWhitelistedDiscuss(href) {
        if (!href) return false;
        return /\/discuss\/(show\/)?142324(\b|$|\/|\?)/.test(href);
    }

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
        a[href="/discuss"]:not([href*="142324"]),
        a[href^="/discuss/"]:not([href*="142324"]),
        a[href="/discuss/latest"]:not([href*="142324"]) { display: none !important; }

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

    // ========== 6. 统一调度 ==========
    function runAll() {
        document.querySelectorAll('a[href*="/discuss"]').forEach(function(el) {
            // 犇犇不动
            if (el.href && el.href.includes('/benben')) return;
            // 白名单：钩子说明帖不隐藏
            if (isWhitelistedDiscuss(el.getAttribute('href'))) return;
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

    // ========== 7. 点击拦截 ==========
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;
        if (link.href.includes('/benben')) return;
        // 白名单：钩子说明帖放行
        if (isWhitelistedDiscuss(link.getAttribute('href'))) return;
        if (link.href.includes('/discuss')) {
            e.preventDefault(); e.stopPropagation(); return false;
        }
        if (/\/problem\/solution\//.test(link.href) ||
            /\/problem\/[^/]+\/solution/.test(link.href)) {
            e.preventDefault(); e.stopPropagation(); return false;
        }
    }, true);

})();
