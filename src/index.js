'use strict';

const functions = require('firebase-functions');
const {google} = require('googleapis');
const {WebhookClient} = require('dialogflow-fulfillment');

const calendarId = "{TU WPISZ ID KALENDARZA}";
const serviceAccount = {KLUCZ}; 

const serviceAccountAuth = new google.auth.JWT({
 email: serviceAccount.client_email,
 key: serviceAccount.private_key,
 scopes: 'https://www.googleapis.com/auth/calendar'
});

const calendar = google.calendar('v3');
process.env.DEBUG = 'dialogflow:*'; 

const timeZone = 'Europe/Warsaw';
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
 const agent = new WebhookClient({ request, response });

 function getStartDate(agent){
  const dateTimeStart = new Date(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0]);
  return dateTimeStart;
 }

 function getEndDate(dateTimeStart){
  return new Date(new Date(dateTimeStart).setHours(dateTimeStart.getHours() + 1));
 }

 function makeAppointment (agent) {

   const dateTimeStart = getStartDate(agent);
   const dateTimeEnd = getEndDate(dateTimeStart);

   const appointmentTimeString = dateTimeStart.toLocaleString('pl-PL');

   return createCalendarEvent(dateTimeStart, dateTimeEnd).then(() => {
     agent.add(`Ok, sprawdziłem czy termin jest dostępny. ${appointmentTimeString} jest wolny, Umówiłem Cię na spotkanie.`);
   }).catch(function(e) {
     agent.add(`Przykro mi, nie mamy wolnego terminu w tym czasie: ${appointmentTimeString}.`);
   });
 }


 let intentMap = new Map();
 intentMap.set('appointment-scheduling', makeAppointment);
 agent.handleRequest(intentMap);
});

function createCalendarEvent (dateTimeStart, dateTimeEnd) {
 return new Promise((resolve, reject) => {
   calendar.events.list({
     auth: serviceAccountAuth, 
     calendarId: calendarId,
     timeMin: dateTimeStart.toISOString(),
     timeMax: dateTimeEnd.toISOString()
   }, (err, calendarResponse) => {
     if (err || calendarResponse.data.items.length > 0) {
       reject(err || new Error('Requested time conflicts with another appointment'));
     } else {
       calendar.events.insert({ auth: serviceAccountAuth,
         calendarId: calendarId,
         resource: {summary: 'Spotkanie',
           start: {dateTime: dateTimeStart},
           end: {dateTime: dateTimeEnd}}
       }, (err, event) => {
         if(err){reject(err);
                }
         else{
          resolve(event); 
         }
       }
       );
     }
   });
 });
}