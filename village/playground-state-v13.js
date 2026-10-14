import {mergeNumber, composeRecipe, cooperativeGarden} from './learning-mechanics-v12.js';

// A page-local creative play model. No profiles, grading, rewards, IRT, timers or storage.
export const SEED_VALUES=Object.freeze([1,2,3,4,5,8]);
export const MATERIALS=Object.freeze({seed:'씨앗',water:'물',sun:'햇빛',flower:'꽃',leaf:'잎',wood:'나무'});
export const GARDEN_TOOLS=Object.freeze({meadow:'잔디',path:'돌길',flower:'꽃',tree:'나무',pond:'연못',bridge:'다리'});
export const RECIPES=Object.freeze([
  Object.freeze({id:'bouquet',name:'꽃다발',parts:Object.freeze(['flower','flower','leaf']),art:'bouquet'}),
  Object.freeze({id:'bridge',name:'작은 다리',parts:Object.freeze(['wood','wood','wood']),art:'tile-bridge'}),
  Object.freeze({id:'sprout',name:'햇빛 새싹',parts:Object.freeze(['seed','water','sun']),art:'tile-flower'})
]);
const MODES=['merge','recipe','garden','together'];
const INITIAL_CELLS=['meadow','tree','meadow','meadow','path','path','flower','meadow','meadow','bridge','pond','meadow','flower','meadow','meadow','meadow'];

export function createPlaygroundState(){
  return {mode:'merge',seeds:{left:2,right:2,active:'left',planted:false},
    recipe:{index:0,basket:[],assembled:false},
    garden:{cells:[...INITIAL_CELLS],tool:'flower',history:[]},
    together:{water:false,sun:false,swapped:false}};
}

export function reducePlayground(state,action){
  if(!state||!MODES.includes(state.mode)||!action||typeof action.type!=='string')throw new TypeError('Invalid playground action or state');
  const next=structuredClone(state);
  switch(action.type){
    case 'mode':
      if(!MODES.includes(action.value))throw new RangeError('Unknown activity');
      next.mode=action.value;break;
    case 'seed-side':
      if(!['left','right'].includes(action.value))throw new RangeError('Unknown seed');
      next.seeds.active=action.value;break;
    case 'seed-value':
      if(!SEED_VALUES.includes(action.value))throw new RangeError('Unknown seed value');
      next.seeds[next.seeds.active]=action.value;next.seeds.planted=false;break;
    case 'merge':
      next.seeds.planted=mergeNumber({...next.seeds,accepted:false}).eligible;break;
    case 'recipe':
      if(!Number.isInteger(action.value)||action.value<0||action.value>=RECIPES.length)throw new RangeError('Unknown recipe');
      next.recipe={index:action.value,basket:[],assembled:false};break;
    case 'material':
      if(!Object.hasOwn(MATERIALS,action.value))throw new RangeError('Unknown material');
      if(next.recipe.basket.length<6)next.recipe.basket.push(action.value);
      next.recipe.assembled=false;break;
    case 'remove-material':
      next.recipe.basket.pop();next.recipe.assembled=false;break;
    case 'assemble':
      next.recipe.assembled=composeRecipe({ingredients:next.recipe.basket,required:RECIPES[next.recipe.index].parts,accepted:false}).matched;break;
    case 'garden-tool':
      if(!Object.hasOwn(GARDEN_TOOLS,action.value))throw new RangeError('Unknown garden tool');
      next.garden.tool=action.value;break;
    case 'place':
      if(!Number.isInteger(action.value)||action.value<0||action.value>=16)throw new RangeError('Unknown garden cell');
      if(next.garden.cells[action.value]!==next.garden.tool){
        next.garden.history.push([...next.garden.cells]);
        next.garden.history=next.garden.history.slice(-20);
        next.garden.cells[action.value]=next.garden.tool;
      }
      break;
    case 'undo':
      if(next.garden.history.length)next.garden.cells=next.garden.history.pop();break;
    case 'role':
      if(!['water','sun'].includes(action.value))throw new RangeError('Unknown role');
      next.together[action.value]=!next.together[action.value];break;
    case 'swap':next.together.swapped=!next.together.swapped;break;
    case 'reset':{
      const fresh=createPlaygroundState();
      const key={merge:'seeds',recipe:'recipe',garden:'garden',together:'together'}[next.mode];
      next[key]=fresh[key];break;
    }
    default:throw new RangeError('Unknown playground action');
  }
  return next;
}

export function playgroundObservation(state){
  if(state.mode==='merge')return mergeNumber({...state.seeds,accepted:false});
  if(state.mode==='recipe')return composeRecipe({ingredients:state.recipe.basket,required:RECIPES[state.recipe.index].parts,accepted:false});
  if(state.mode==='together')return cooperativeGarden({
    contributions:[...(state.together.water?[{participant:state.together.swapped?'role-b':'role-a',role:'water'}]:[]),
                   ...(state.together.sun?[{participant:state.together.swapped?'role-a':'role-b',role:'sun'}]:[])],
    requiredRoles:['water','sun'],accepted:false});
  const counts=Object.fromEntries(Object.keys(GARDEN_TOOLS).map(k=>[k,state.garden.cells.filter(v=>v===k).length]));
  return {kind:'garden-placement',counts,total:16};
}
