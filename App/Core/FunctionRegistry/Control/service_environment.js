'use strict';
const path=require('node:path'),{SERVICES}=require('./identity');
function environment(base,id){const env={...base};if(!env.IATB_CP1_CONTROL_ROOT)return env;delete env.IATB_CP1_SERVICE_ID;delete env.IATB_CP1_SERVICE_KEY_FILE;if(!SERVICES.includes(id)){delete env.IATB_CP1_CONTROL_ROOT;delete env.IATB_CP1_PUBLIC_KEY_FILE;return env;}env.IATB_CP1_SERVICE_ID=id;env.IATB_CP1_SERVICE_KEY_FILE=path.join(env.IATB_CP1_CONTROL_ROOT,'services',id+'.key');return env;}
module.exports={environment};
