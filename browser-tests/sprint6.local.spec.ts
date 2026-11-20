import { expect, test } from '@playwright/test';

const yaml = `test: {name: Sprint6, scenario_mode: parallel}
scenarios:
- name: first
  load:
    type: segments
    segments:
    - {name: first, duration: 10s, transition: constant, target_vus: 1}
    - {name: second, duration: 10s, transition: linear, target_vus: 2}
  steps: [{request: {name: Upload target, method: POST, url: /upload}}]
- name: other
  load: {type: constant, users: 1, iterations: 1}
  steps: [{get: /health}]
`;

test.beforeEach(async ({page}) => {
 await page.route('**/api/studio/info', route=>route.fulfill({contentType:'application/json',body:JSON.stringify({studio:true,initialScript:{name:'sprint6.yaml',yaml},capabilities:{loadRun:true,debug:true,multiScenarioDebug:true,multiScenarioRun:true,componentConfiguration:{version:1,features:['http_defaults','error_policy','global_error_policy','scoped_data_source','think_time','http_assertions','sql_assertions','http_state_usage','extractor_enabled']}}})}));
});

test('SPRINT 6 scheduling, file and gRPC authoring use working controls', async ({page}) => {
 await page.goto('/');
 await page.getByRole('treeitem',{name:/Sprint6/}).first().click();
 await expect(page.getByText('Adopt version 1',{exact:true})).toHaveCount(0);
 const schedule=page.getByRole('combobox',{name:'Scenario scheduling'});
 await schedule.click();
 await page.getByRole('option',{name:'Sequential',exact:true}).click();
 await expect(schedule).toContainText('Sequential');
 const request=page.getByRole('treeitem',{name:/Upload target/}).first();
 await request.click({button:'right'});
 await page.getByText('File Upload',{exact:true}).click();
 await expect(page.getByRole('treeitem',{name:/File Upload/})).toBeVisible();
 await request.click({button:'right'});
 await page.getByText('gRPC',{exact:true}).click();
 await expect(page.getByRole('treeitem',{name:/gRPC Request/})).toBeVisible();
 await request.click({button:'right'});
 await page.getByText('gRPC Defaults',{exact:true}).click();
 await expect(page.getByRole('treeitem',{name:/gRPC Defaults/})).toBeVisible();
});

test('SPRINT 6 Spanish search and segment preview preserve the configured curve', async ({page}) => {
 await page.goto('/?lang=es');
 await expect(page.getByText('Petición',{exact:true})).toBeVisible();
 await expect(page.getByText('Respuesta',{exact:true})).toBeVisible();
 await page.getByRole('treeitem',{name:/Segments|Segmentos/}).first().click();
 await expect(page.locator('svg polyline[stroke-width="3"]')).toBeVisible();
 await expect(page.getByRole('list',{name:/Segmentos de carga|Load segments/})).toHaveCount(0);
 await expect(page.getByText('Configuración de componentes',{exact:true})).toHaveCount(0);
});
