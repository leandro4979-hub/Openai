// ==UserScript==
// @name         👑 OMNI ENGINE - iPhone 14 Ultimate Casino Core
// @namespace    http://tampermonkey.net/
// @version      9.6.0
// @description  Max-Performance TreeWalker Target Capture with Integrated iPhone 14 UA Masquerade
// @match        https://*.crowncoinscasino.com/*
// @match        https://*.crowncoins.com/*
// @match        https://*.playfame.com/*
// @match        https://*.spinblitz.com/*
// @match        https://*.logicpup.com/*
// @match        https://*.land-*.shop/*
// @match        https://appstore.land-*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    try {
        const iphoneUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
        Object.defineProperty(navigator, 'userAgent', { get: () => iphoneUA });
        Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' });
    } catch (e) {
        console.log("UA Masquerade locked.");
    }

    const TARGETS = [
        '.daily-bonus-claim', '[class*="claim-button"]', '.free-coins-collect',
        '#collect-free-spin', '[aria-label*="Claim Free"]', '.free-claim:not([disabled])',
        '.reward-collect:not(.claimed)', '#claim-bonus', '.claim-free-coins', '#collect-daily-bonus'
    ];
    const KEYWORDS = ['Claim', 'Collect', 'Free', 'Reclamar', 'Bono', 'Get'];

    function fastScan(root = document.body) {
        if (!root) return [];
        const found = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
            acceptNode(node) {
                if (TARGETS.some(sel => node.matches(sel))) return NodeFilter.FILTER_ACCEPT;
                if (node.tagName === 'BUTTON' || node.tagName === 'A') {
                    const txt = node.innerText || "";
                    if (KEYWORDS.some(k => txt.includes(k))) return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        });
        let el;
        while ((el = walker.nextNode())) found.push(el);
        return found;
    }

    function runInteraction(el) {
        if (!el || el._clickedCore) return;

        const box = el.getBoundingClientRect();
        const visible = (box.width > 0 && box.height > 0 && !el.disabled && window.getComputedStyle(el).display !== 'none');
        if (!visible) return;

        const host = window.location.hostname;
        if (host.includes('land-') || host.includes('appstore')) {
            el.style.outline = "4px solid #39ff14";
            el.style.boxShadow = "0 0 20px #39ff14";
        } else {
            el._clickedCore = true;
            
            const tapX = box.left + (box.width / 2);
            const tapY = box.top + (box.height / 2);

            ['pointerdown', 'pointerup', 'click'].forEach(evt => {
                el.dispatchEvent(new PointerEvent(evt, {
                    bubbles: true,
                    cancelable: true,
                    pointerType: 'touch',
                    clientX: tapX,
                    clientY: tapY
                }));
            });
            console.log(`▶ [STABILIZED] Auto-clicked coordinates: (${tapX}, ${tapY})`);
        }
    }

    const coreObserver = new MutationObserver(muts => {
        for (let i = 0; i < muts.length; i++) {
            muts[i].addedNodes.forEach(n => {
                if (n.nodeType === 1) fastScan(n).forEach(runInteraction);
            });
        }
    });

    function start() {
        fastScan(document.body).forEach(runInteraction);
        coreObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
