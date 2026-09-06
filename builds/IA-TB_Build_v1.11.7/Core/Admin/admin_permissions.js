'use strict';
var ROLES={VISITOR:1,USER:1,ADMIN:1};
function normalizeRole(v,legacyAdmin){v=String(v||'').toUpperCase();if(ROLES[v])return v;return legacyAdmin?'ADMIN':'USER';}
function roleOfUser(user){return normalizeRole(user&&user.role,true);}
function isAdmin(x){return normalizeRole(x&&x.role,false)==='ADMIN';}
module.exports={ROLES:ROLES,normalizeRole:normalizeRole,roleOfUser:roleOfUser,isAdmin:isAdmin};
