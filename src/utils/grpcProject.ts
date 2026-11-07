import {load,dump} from 'js-yaml';
function record(value:unknown):value is Record<string,any>{return typeof value==='object'&&value!==null&&!Array.isArray(value)}
// Authoring appends to the first existing scenario. Existing defaults, steps and
// unknown fields remain intact; new calls get explicit overrides when needed.
export function appendGRPCScenario(current:string,generated:string):string{
 const incoming=load(generated);if(!record(incoming))throw new Error('Invalid generated gRPC scenario');
 if(!current.trim())return generated;
 const existing=load(current);if(!record(existing))throw new Error('Open a valid scenario before adding gRPC operations');
 const incomingScenarios=Array.isArray(incoming.scenarios)?incoming.scenarios:[];
 const steps=incomingScenarios.flatMap(s=>Array.isArray(s.steps)?s.steps:[]);
 if(!Array.isArray(existing.scenarios)||!existing.scenarios.length){existing.scenarios=incomingScenarios;existing.grpc_defaults??=incoming.grpc_defaults}
 else {
  if(existing.grpc_defaults){
   const defaults=record(incoming.grpc_defaults)?incoming.grpc_defaults:{};
   for(const step of steps){if(record(step.grpc)){for(const key of ['target','protoset','plaintext','tls','metadata','timeout','reflection'])if(defaults[key]!==undefined&&step.grpc[key]===undefined)step.grpc[key]=defaults[key]}}
  }else existing.grpc_defaults=incoming.grpc_defaults;
  existing.scenarios[0].steps=[...(existing.scenarios[0].steps||[]),...steps];
 }
 existing.variables={...(incoming.variables||{}),...(existing.variables||{})};
 if(!Object.keys(existing.variables).length)delete existing.variables;
 return dump(existing,{lineWidth:110,noRefs:true});
}
