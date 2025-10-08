// ==UserScript==
// @name Crowdmark Tweaks
// @description Useful tweaks for Crowdmark
// @version 0.1.0-build.2025-10-08T02:08:52.619Z
// @author embeddedt
// @homepage https://github.com/embeddedt/crowdmark-tweaks
// @supportURL https://github.com/embeddedt/crowdmark-tweaks/issues
// @match https://app.crowdmark.com/*
// @connect app.crowdmark.com
// @downloadURL https://github.com/embeddedt/crowdmark-tweaks/raw/refs/heads/main/crowdmark-tweaks.user.js
// @grant GM_addStyle
// @grant GM_addElement
// @icon https://www.google.com/s2/favicons?sz=64&domain=crowdmark.com
// @namespace https://github.com/embeddedt
// @updateURL https://github.com/embeddedt/crowdmark-tweaks/raw/refs/heads/main/crowdmark-tweaks.meta.js
// ==/UserScript==

(()=>{let e=0,t=0;document.addEventListener("mousemove",n=>{e=n.clientX,t=n.clientY}),document.addEventListener("keydown",n=>{if(!n.ctrlKey)return;if(n.repeat)return;let o=null;n.code.startsWith("Digit")?(o=parseInt(n.code.slice(5),10),n.preventDefault()):n.code.startsWith("Numpad")&&(o=parseInt(n.code.slice(6),10),n.preventDefault()),null!=o&&o>=1&&o<=9&&function(n){const o=document.elementFromPoint(e,t);if(null===o?.closest(".grading-canvas__image-capture-container"))return void console.warn("Mouse is not over exam paper");const i=document.querySelector("ul.grading-toolbar__submenu--library");if(!i)return;const r=i.querySelectorAll("li.tool__lib-comment");if(n-1>=r.length)return void console.warn("Requested comment index is out of range");const c=r[n-1];console.log("Auto-apply comment",c),function(e,t,n){const o=e.getBoundingClientRect(),i=o.left+o.width/2,r=o.top+o.height/2;function c(e,t,n,o=document.elementFromPoint(t,n)){if(!o)return void console.warn("can't find target to fire event to");const i=new MouseEvent(e,{bubbles:!0,cancelable:!0,clientX:t,clientY:n,buttons:1});o.dispatchEvent(i)}c("mousedown",i,r,e);for(let e=1;e<=20;e++)c("mousemove",i+e/20*(t-i),r+e/20*(n-r));c("mouseup",t,n,document.elementFromPoint(t,n))}(c,e,t)}(o)},{passive:!1})})();