import { expect, test } from './saas-git-fixture';
const saasURL = process.env.RELAMPO_SAAS_URL;
test.skip(!saasURL, 'Set RELAMPO_SAAS_URL.');
test('local script history persists saved versions and isolates accounts, plans, and scripts', async ({page}) => {
  await page.goto(new URL(saasURL!).origin);
  const result = await page.evaluate(async () => {
    const history = await import(/* @vite-ignore */ '/src/utils/scriptHistory.ts');
    localStorage.setItem('relampo-current-user','history-local@example.invalid');
    const plan = {id:'history-plan', name:'History', owner:'You', scope:'', access:'mine', status:'draft'} as any;
    await history.recordLocalScriptVersion(plan.id,'script-1','test: {name: First}');
    await history.recordLocalScriptVersion(plan.id,'script-1','test: {name: Second}');
    await history.recordLocalScriptVersion(plan.id,'script-1','test: {name: Second}');
    await history.recordLocalScriptVersion(plan.id,'script-2','test: {name: Other}');
    const source = history.createScriptHistorySource(plan,'script-1','first.yaml');
    const listed = await source.list(1);
    const contents = await Promise.all(listed.versions.map(version=> source.read(version.id)));
    const other = history.createScriptHistorySource(plan,'script-2','other.yaml');
    let isolated = false;
    try {await other.read(listed.versions[0]!.id);} catch {isolated = true;}
    localStorage.setItem('relampo-current-user','history-other@example.invalid');
    let accountChanged = false;
    try {await source.read(listed.versions[0]!.id);} catch {accountChanged = true;}
    const empty = await history.createScriptHistorySource(plan,'script-1','first.yaml').list(1);
    return {contents, isolated, accountChanged, empty: empty.versions.length};
  });
  expect(result).toEqual({contents:['test: {name: Second}','test: {name: First}'], isolated:true, accountChanged:true, empty:0});
  await page.reload();
  const persisted = await page.evaluate(async () => {
    localStorage.setItem('relampo-current-user','history-local@example.invalid');
    const history = await import(/* @vite-ignore */ '/src/utils/scriptHistory.ts');
    return history.createScriptHistorySource({id:'history-plan'} as any,'script-1','first.yaml').list(1);
  });
  expect(persisted.versions).toHaveLength(2);
});
for(const provider of ['github','gitlab'] as const) test(`${provider} history reads paginated file versions using the listed revision, without writes`,async({page,context}) => {
  const paths:string[] = [];
  let writes = 0;
  const first='a'.repeat(40), old='b'.repeat(40);
  await context.route(/https:\/\/(api.github.com|gitlab.com)\//,route=>{
    const req=route.request(); const url=new URL(req.url()); paths.push(url.pathname+url.search);
    if(req.method()!=='GET'){writes++; return route.abort();}
    if(url.pathname.endsWith('/branches')) return route.fulfill({json:[{name:'main'}]});
    if(url.pathname.endsWith('/commits')){
      const page=Number(url.searchParams.get('page'));
      const revisions = page===1 ? Array.from({length:30},(_,index)=>index===0?first:index.toString(16).padStart(40,'0')) : [old];
      return route.fulfill({json:revisions.map(id=>provider==='github'?{sha:id,commit:{author:{name:'Ana',date:'2026-11-12T14:00:00Z'},message:'Saved script'}}:{id,author_name:'Ana',committed_date:'2026-11-12T14:00:00Z',title:'Saved script'})});
    }
    if(url.pathname.includes('/contents/')||url.pathname.includes('/repository/files/')) return route.fulfill({json:{encoding:'base64',content:Buffer.from('test: {name: Older version}').toString('base64')}});
    return route.fulfill({json:{default_branch:'main',permissions:{push:true}}});
  });
  await page.goto(new URL(saasURL!).origin);
  const result=await page.evaluate(async({provider,old})=>{
    localStorage.setItem('relampo-current-user','provider-history@example.invalid');
    const git=await import(/* @vite-ignore */ '/src/utils/gitProvider.ts');
    await git.connectGit(provider,'qa/history','fake-history-token');
    const target={kind:provider,repository:'qa/history',branch:'main',folder:'tests'};
    const first=await git.listScriptRevisions(target,'tests/Scripts/login.yaml','main',1);
    const second=await git.listScriptRevisions(target,'tests/Scripts/login.yaml','main',2);
    const file=await git.remoteFile(target,'tests/Scripts/login.yaml',old);
    return {first:first.versions.length, more:first.hasMore, second:second.versions, content:file.content};
  },{provider,old});
  expect(result.first).toBe(30); expect(result.more).toBe(true);
  expect(result.second[0]).toMatchObject({id:old,author:'Ana'});
  expect(result.content).toBe('test: {name: Older version}');
  expect(paths.some(path=>path.includes('page=2'))).toBe(true);
  expect(paths.some(path=>path.includes(`ref=${old}`))).toBe(true);
  expect(writes).toBe(0);
});
