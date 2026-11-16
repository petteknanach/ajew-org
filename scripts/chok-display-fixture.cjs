'use strict';
// Narrow test-local static dependency, not a renderer substitute or a loader for
// unrelated modules. Historical Main probes also receive this current dependency;
// they remain historical initializer probes, not a historical whole-page claim.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const {documentFor}=require('./qualified-earlier-parsha-test-dom.cjs');
function loadDisplay(template,read,box){
 const tags=documentFor(template).querySelectorAll('script[src]');
 const selected=tags.filter(n=>/^\/chok-display\.js(?:\?|$)/.test(n.getAttribute('src')));
 assert.equal(selected.length,1,'one authentic static ChokDisplay dependency');
 const tag=selected[0],url=tag.getAttribute('src');
 const match=/^\/chok-display\.js\?v=([a-f0-9]{64})$/.exec(url);
 assert(match,'exact same-origin ChokDisplay URL/hash');
 assert.notEqual(tag.getAttribute('defer'),null,'ChokDisplay is deferred');
 assert.equal(tag.getAttribute('crossorigin'),'anonymous','ChokDisplay CORS');
 const index=tags.indexOf(tag),source=tags.findIndex(n=>/^\/chok-source-reader\.js\?/.test(n.getAttribute('src'))),main=tags.findIndex(n=>/^\/chok\.js\?/.test(n.getAttribute('src')));
 assert(source>=0&&source<index&&index<main,'static source/display/Main order');
 const code=read('public/chok-display.js');assert.equal(typeof code,'string','real ChokDisplay bytes');
 assert.equal(crypto.createHash('sha256').update(code).digest('hex'),match[1],'ChokDisplay version binds complete bytes');
 assert.equal(tag.getAttribute('integrity'),'sha384-'+crypto.createHash('sha384').update(code).digest('base64'),'ChokDisplay static SRI');
 vm.runInContext(code,box,{filename:url});
 assert.equal(typeof box.window.ChokDisplay.apply,'function','real ChokDisplay export');
}
// Only the closed SA-optional historical caller-source oracle uses this inverse.
// Current initializer execution above never restores Main or fixture source.
const callerDeltas={"scripts/chok-lech-sunday.test.cjs":{"afterSHA256":"212248d03051aba02110639e186be07aab09d6edd9a558f0b18e4b91d70dcff7","beforeSHA256":"7b577450a77f601033e1125506ed20bc5b27a6a2a8d79d33d7f82efffe991e25","beforeBytes":30254,"inverse":[{"before":"","after":" require('./chok-display-fixture.cjs').loadDisplay(template,read,r.env.box);\n"}]},"scripts/chok-lech-monday-init.test.cjs":{"afterSHA256":"6b73398dca1c39d459bc58396ee3ab154589b1ac61c68e4dcfcc379c28e27960","beforeSHA256":"99430dfe2c329786af19f34ec571eadfa71c1a8a878a1f0e021746d78695dc61","beforeBytes":10493,"inverse":[{"before":" vm.runInContext(source,env.box);env.box.window.ChokSources.load=async()=>{};env.box.window.ChokVerseBreslov={has:()=>false,availability:()=>'',parsha:()=>null,weekly:()=>''};vm.runInContext(sunday,env.box);if(!missing)vm.runInContext(monday,env.box);vm.runInContext(main,env.box);\n","after":" vm.runInContext(source,env.box);env.box.window.ChokSources.load=async()=>{};env.box.window.ChokVerseBreslov={has:()=>false,availability:()=>'',parsha:()=>null,weekly:()=>''};vm.runInContext(sunday,env.box);if(!missing)vm.runInContext(monday,env.box);require('./chok-display-fixture.cjs').loadDisplay(template,read,env.box);vm.runInContext(main,env.box);\n"}]},"scripts/verify-chok-today-classical.cjs":{"afterSHA256":"492e32469186e064f3f12a5bb77c747d5da2742979d4e13ceb395accb43a8778","beforeSHA256":"f49ef8d61138c90de9484aef485d225d62bd2b933d14c9104ac24001a6cfc0f9","beforeBytes":19081,"inverse":[{"before":" for(const [rel,row] of Object.entries(bank.paths)){const b=fs.readFileSync(path.join(root,rel));assert.deepEqual(outer.restore(rel,b),Buffer.from(row.beforeUTF8));assert.equal(outer.restore('wrong-owner',b),b);for(const pos of [0,Math.floor(b.length/2),b.length-1]){const bad=Buffer.from(b);bad[pos]^=1;assert.equal(outer.restore(rel,bad),bad);}}\n","after":" // Closed historical caller-source oracle only; real initializers below stay current.\n for(const [rel,row] of Object.entries(bank.paths)){const b=require('./chok-display-fixture.cjs').restoreCaller(rel,fs.readFileSync(path.join(root,rel)));assert.deepEqual(outer.restore(rel,b),Buffer.from(row.beforeUTF8));assert.equal(outer.restore('wrong-owner',b),b);for(const pos of [0,Math.floor(b.length/2),b.length-1]){const bad=Buffer.from(b);bad[pos]^=1;assert.equal(outer.restore(rel,bad),bad);}}\n"}]}};
function restoreCaller(relative,bytes){
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),row=callerDeltas[relative];
 if(!row||sha(bytes)!==row.afterSHA256)return bytes;
 let text=bytes.toString('utf8');for(const op of row.inverse){assert.equal(text.split(op.after).length,2,'exact QA caller inverse');text=text.replace(op.after,op.before);}
 const before=Buffer.from(text);assert.equal(before.length,row.beforeBytes);assert.equal(sha(before),row.beforeSHA256,'whole historical caller source');return before;
}
module.exports={loadDisplay,restoreCaller};
