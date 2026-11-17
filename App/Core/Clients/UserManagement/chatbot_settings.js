'use strict';
const {settings}=require('../../../Supervisor/ChatBot/Contracts');
function get(sessions,token){return settings(JSON.parse(sessions.getPreference(token,'chatbot','settings')||'{}'));}
function save(sessions,token,input){const value=settings(input);sessions.setPreference(token,'chatbot','settings',JSON.stringify(value));return value;}
module.exports={get,save};
