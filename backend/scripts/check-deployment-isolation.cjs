const fs=require('fs');
const dotenv=require('dotenv');
function validateDeployment(privateEnv, demoEnv) {
 for(const env of [privateEnv,demoEnv])if(!env.DATABASE_URL)throw new Error('DEPLOYMENT_DATABASE_URL_MISSING');
 const privateUrl=new URL(privateEnv.DATABASE_URL),demoUrl=new URL(demoEnv.DATABASE_URL);
 if(privateUrl.protocol!=='mysql:'||demoUrl.protocol!=='mysql:')throw new Error('DEPLOYMENT_DATABASE_TYPE_INVALID');
 if(String(privateEnv.IS_DEMO||'false').toLowerCase()==='true'||String(demoEnv.IS_DEMO||'false').toLowerCase()!=='true')throw new Error('DEPLOYMENT_MODE_INVALID');
 if(privateUrl.pathname===demoUrl.pathname)throw new Error('PRIVATE_DEMO_SCHEMA_NAMES_MUST_DIFFER');
 return true;
}
module.exports={validateDeployment};
if(require.main===module){try{validateDeployment(dotenv.parse(fs.readFileSync(process.argv[2])),dotenv.parse(fs.readFileSync(process.argv[3])));console.log(JSON.stringify({event:'deployment_isolation_check',outcome:'success'}));}catch{console.error('Deployment isolation check failed; inspect mode and distinct database names locally');process.exitCode=1;}}
